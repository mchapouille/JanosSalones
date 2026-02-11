"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Building2,
    Users,
    DollarSign,
    TrendingUp,
    MapPin,
    X,
    Activity,
    BrainCircuit,
    LayoutGrid,
    Info,
} from "lucide-react";
import { formatARS, formatNumber, formatPercentage } from "@/lib/formatters";
import { getSemaphoreColor, TIER_DEFINITIONS, calcGlobalStatus } from "@/lib/calculations";
import { getSalonesData, type SalonIntegral } from "@/lib/sample-data";
import GoogleMapView from "@/components/GoogleMapView";
import { useDashboard } from "@/components/DashboardContext";

export default function DashboardPage() {
    const { selectedYear, setSelectedYear, availableYears } = useDashboard();
    const [localYear, setLocalYear] = useState<number | null>(selectedYear);
    const salones = useMemo(() => getSalonesData(selectedYear), [selectedYear]);
    const [selectedTier, setSelectedTier] = useState<number | null>(null);
    const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
    const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
    const [selectedSalon, setSelectedSalon] = useState<SalonIntegral | null>(null);

    const municipios = useMemo(
        () => [...new Set(salones.map((s) => s.municipio_salon).filter(Boolean))] as string[],
        [salones]
    );

    const filtered = useMemo(() => {
        let list = salones.filter((s) => {
            if (selectedTier && s.tier !== selectedTier) return false;
            if (selectedEstado && s.estado_salon !== selectedEstado) return false;
            if (selectedMunicipio && s.municipio_salon !== selectedMunicipio) return false;
            return true;
        });

        if (selectedYear === null) {
            const uniqueSalons: Record<number, SalonIntegral> = {};
            list.forEach(s => {
                if (!uniqueSalons[s.id_salon] || s.year > uniqueSalons[s.id_salon].year) {
                    uniqueSalons[s.id_salon] = s;
                }
            });
            return Object.values(uniqueSalons).sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon));
        }
        return list;
    }, [salones, selectedTier, selectedEstado, selectedMunicipio, selectedYear]);

    // Sync selected salon with filter/year changes
    useEffect(() => {
        if (filtered.length > 0) {
            const currentId = selectedSalon?.id_salon;
            const updated = filtered.find(s => s.id_salon === currentId) || filtered[0];
            if (updated !== selectedSalon) {
                setSelectedSalon(updated);
            }
        } else if (selectedSalon !== null) {
            setSelectedSalon(null);
        }
    }, [filtered, selectedSalon]);

    const activeSalones = filtered.filter((s) => s.estado_salon === "ACTIVO");
    const totalRevenue = activeSalones.reduce((s, x) => s + (x.ventas_totales_salon || 0), 0);
    const totalEvents = activeSalones.reduce((s, x) => s + (x.cantidad_eventos_salon || 0), 0);
    const avgIncidence = activeSalones.length > 0
        ? activeSalones.reduce((s, x) => s + (x.performance?.rentIncidence || 0), 0) / activeSalones.length
        : 0;

    const strategicStatus = useMemo(() => {
        if (!selectedSalon) return null;
        return calcGlobalStatus(
            selectedSalon.performance ?? undefined,
            selectedSalon.benchmark,
            selectedSalon.efficiency,
            selectedSalon.contractAudit ?? undefined
        );
    }, [selectedSalon]);

    return (
        <div className="space-y-6">
            {/* Dashboard Title & General Overview Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 via-transparent to-blue-950/10 rounded-2xl border border-white/5 shadow-2xl" />
                <div className="glass-card p-6 md:p-8 relative">
                    {/* Header with Title and Global Filters */}
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <LayoutGrid size={18} className="text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-wider">Vista General de Salones</h2>
                            </div>
                        </div>

                        {/* General Filters Section (NOW ABOVE KPIs) */}
                        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                            {/* Year Filter */}
                            <select
                                value={selectedYear ?? ""}
                                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                                className="bg-slate-900 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60 min-w-[140px] font-bold"
                            >
                                <option value="">Año (Todos)</option>
                                {availableYears.map((y) => (
                                    <option key={y} value={y}>Año {y}</option>
                                ))}
                            </select>

                            <select
                                value={selectedEstado ?? ""}
                                onChange={(e) => setSelectedEstado(e.target.value || null)}
                                className="bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[180px]"
                            >
                                <option value="">Estado (Todos)</option>
                                <option value="ACTIVO">ACTIVO</option>
                                <option value="OBRA">EN OBRA</option>
                                <option value="DEVUELTOS">DEVUELTOS</option>
                            </select>

                            <select
                                value={selectedTier ?? ""}
                                onChange={(e) => setSelectedTier(e.target.value ? parseInt(e.target.value) : null)}
                                className="bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[180px]"
                            >
                                <option value="">Tipo Salon (Todos)</option>
                                {[1, 2, 3, 4, 5].map((t) => (
                                    <option key={t} value={t}>Tier {t}: {TIER_DEFINITIONS[t]?.name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedMunicipio ?? ""}
                                onChange={(e) => setSelectedMunicipio(e.target.value || null)}
                                className="bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[200px]"
                            >
                                <option value="">Municipio (Todos)</option>
                                {municipios.sort().map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>

                            {(selectedTier || selectedEstado || selectedMunicipio) && (
                                <button
                                    onClick={() => { setSelectedTier(null); setSelectedEstado(null); setSelectedMunicipio(null); }}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 ml-2 font-medium bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10 transition-colors"
                                >
                                    <X size={12} /> Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>

                    {/* KPI Cards (Now below filters within the same container) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: "Salones Activos", value: activeSalones.length.toString(), icon: Building2, color: "#2563eb", sub: `de ${filtered.length} en red` },
                            { label: "Facturación Total", value: formatARS(totalRevenue), icon: DollarSign, color: "#22c55e", sub: "período analizado" },
                            { label: "Eventos Totales", value: formatNumber(totalEvents), icon: Users, color: "#8b5cf6", sub: "acumulado" },
                            { label: "Incidencia Promedio", value: formatPercentage(avgIncidence), icon: TrendingUp, color: avgIncidence > 25 ? "#ef4444" : avgIncidence > 15 ? "#eab308" : "#22c55e", sub: avgIncidence > 25 ? "⚠ Alerta" : "normal" },
                        ].map((kpi, idx) => {
                            const Icon = kpi.icon;
                            return (
                                <div
                                    key={kpi.label}
                                    className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all group/kpi"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover/kpi:scale-110 duration-300"
                                            style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}
                                        >
                                            <Icon size={20} style={{ color: kpi.color }} />
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{kpi.sub}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{kpi.value}</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold mt-1 tracking-tight">{kpi.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {/* Map + Portfolio Overview (NOW SECOND) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 min-h-[400px]">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-blue-400" />
                        Mapa de Red de Salones
                    </h2>
                    <div className="w-full h-[400px]">
                        <GoogleMapView
                            salones={filtered}
                            selectedSalon={selectedSalon}
                            onSelectSalon={setSelectedSalon}
                        />
                    </div>
                </div>

                {/* Simplified List */}
                <div className="glass-card p-6 max-h-[460px] overflow-y-auto">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-cyan-400" />
                        Listado General ({filtered.length})
                    </h2>
                    <div className="space-y-1">
                        {filtered.map((salon) => (
                            <button
                                key={`${salon.id_salon}-${salon.year}`}
                                onClick={() => setSelectedSalon(salon)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all border ${selectedSalon?.id_salon === salon.id_salon && selectedSalon?.year === salon.year
                                    ? "border-blue-500/40 bg-blue-500/10"
                                    : "border-transparent hover:bg-white/5"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs ${selectedSalon?.id_salon === salon.id_salon ? "text-white font-medium" : "text-slate-400"}`}>{salon.nombre_salon}</span>
                                    <div className="flex gap-1">
                                        {[salon.performance?.color, salon.efficiency?.color].map((c, i) => (
                                            c && <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSemaphoreColor(c) }} />
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Strategic Decision Highlight (NOW THIRD) */}
            {selectedSalon && strategicStatus && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden group pt-2"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/5" />
                    <div className="glass-card p-6 md:p-8 relative">
                        <div className="flex flex-col gap-6 mb-8 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <BrainCircuit size={18} className="text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Análisis de Decisión por Salón</h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                                {/* Local Year Selector */}
                                <select
                                    value={localYear ?? ""}
                                    onChange={(e) => setLocalYear(e.target.value ? parseInt(e.target.value) : null)}
                                    className="bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[140px] font-medium"
                                >
                                    <option value="">Año (Todos)</option>
                                    {availableYears.map((y) => (
                                        <option key={y} value={y}>Año {y}</option>
                                    ))}
                                </select>

                                <select
                                    value={selectedSalon ? `${selectedSalon.id_salon}-${selectedSalon.year}` : ""}
                                    onChange={(e) => {
                                        const [id, year] = e.target.value.split("-").map(Number);
                                        const s = getSalonesData(null).find(x => x.id_salon === id && x.year === year);
                                        if (s) setSelectedSalon(s);
                                    }}
                                    className="bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[240px] font-medium"
                                >
                                    {(() => {
                                        const displayedSalones = localYear
                                            ? getSalonesData(localYear)
                                            : Array.from(new Set(getSalonesData(null).map(s => s.id_salon)))
                                                .map(id => {
                                                    const allOfId = getSalonesData(null).filter(s => s.id_salon === id);
                                                    return allOfId.sort((a, b) => b.year - a.year)[0];
                                                });

                                        return displayedSalones.map(s => (
                                            <option key={`${s.id_salon}-${s.year}`} value={`${s.id_salon}-${s.year}`} className="bg-slate-900">
                                                {s.nombre_salon}
                                            </option>
                                        ));
                                    })()}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Left: Global Indicator */}
                            <div className="lg:w-1/3 flex flex-col justify-center items-center text-center p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-inner">
                                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4 font-bold">Estatus Estratégico Global</span>
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6 relative"
                                    style={{ background: `${getSemaphoreColor(strategicStatus.color)}15`, border: `2px solid ${getSemaphoreColor(strategicStatus.color)}40` }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-full animate-pulse"
                                        style={{ background: getSemaphoreColor(strategicStatus.color), opacity: 0.2 }}
                                    />
                                    <div
                                        className="absolute w-4 h-4 rounded-full"
                                        style={{ background: getSemaphoreColor(strategicStatus.color), boxShadow: `0 0 20px ${getSemaphoreColor(strategicStatus.color)}` }}
                                    />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">{strategicStatus.label}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-[240px]">
                                    {strategicStatus.description}
                                </p>
                            </div>

                            {/* Right: The 4 Semaphores & Key Info */}
                            <div className="lg:w-2/3 space-y-8">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { label: "Performance", val: selectedSalon.performance ? formatPercentage(selectedSalon.performance.rentIncidence) : "—", color: selectedSalon.performance?.color || "gray" },
                                        { label: "Market m²", val: selectedSalon.benchmark ? `${formatPercentage(selectedSalon.benchmark.deviation)} dev.` : "—", color: selectedSalon.benchmark?.color || "gray" },
                                        { label: "Eficiencia", val: selectedSalon.efficiency ? selectedSalon.efficiency.globalIndex.toFixed(2) : "—", color: selectedSalon.efficiency?.color || "gray" },
                                        { label: "Auditoría", val: selectedSalon.contractAudit ? `${Math.abs(selectedSalon.contractAudit.deviationPercent).toFixed(1)}%` : "—", color: selectedSalon.contractAudit?.color || "gray" },
                                    ].map((item) => (
                                        <div key={item.label} className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">{item.label}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ background: getSemaphoreColor(item.color) }} />
                                                <span className="text-sm font-bold text-white">{item.val}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Información General</span>
                                        <p className="text-sm text-white font-medium">{selectedSalon.nombre_salon}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{selectedSalon.direccion_salon}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300">Tier {selectedSalon.tier}</span>
                                            <span className="px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-[10px] text-slate-300">{selectedSalon.municipio_salon}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Carga Operativa</span>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Alquiler Real:</span>
                                                <span className="text-white font-medium">{formatARS(selectedSalon.costos_fijos_salon || 0)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Ventas:</span>
                                                <span className="text-white font-medium">{formatARS(selectedSalon.ventas_totales_salon || 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Activos</span>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Superficie:</span>
                                                <span className="text-white font-medium">{selectedSalon.mt2_salon} m²</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Capacidad:</span>
                                                <span className="text-white font-medium">{selectedSalon.pax_calculado} PAX</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
