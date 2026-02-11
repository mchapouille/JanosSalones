"use client";

import { useState, useMemo } from "react";
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
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    Info,
} from "lucide-react";
import { formatARS, formatNumber, formatPercentage } from "@/lib/formatters";
import { getSemaphoreColor, TIER_DEFINITIONS, calcGlobalStatus } from "@/lib/calculations";
import { getSalonesData, type SalonIntegral } from "@/lib/sample-data";

export default function DashboardPage() {
    const salones = useMemo(() => getSalonesData(), []);
    const [selectedTier, setSelectedTier] = useState<number | null>(null);
    const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
    const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
    const [selectedSalon, setSelectedSalon] = useState<SalonIntegral | null>(salones[0]); // Default to first

    const municipios = useMemo(
        () => [...new Set(salones.map((s) => s.municipio_salon).filter(Boolean))] as string[],
        [salones]
    );

    const filtered = useMemo(() => {
        return salones.filter((s) => {
            if (selectedTier && s.tier !== selectedTier) return false;
            if (selectedEstado && s.estado_salon !== selectedEstado) return false;
            if (selectedMunicipio && s.municipio_salon !== selectedMunicipio) return false;
            return true;
        });
    }, [salones, selectedTier, selectedEstado, selectedMunicipio]);

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
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Command Center</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Análisis estratégico y monitoreo de red
                </p>
            </div>

            {/* KPI Cards (Global Context) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Salones Activos", value: activeSalones.length.toString(), icon: Building2, color: "#2563eb", sub: `de ${filtered.length} en red` },
                    { label: "Facturación Total", value: formatARS(totalRevenue), icon: DollarSign, color: "#22c55e", sub: "período analizado" },
                    { label: "Eventos Totales", value: formatNumber(totalEvents), icon: Users, color: "#8b5cf6", sub: "acumulado" },
                    { label: "Incidencia Promedio", value: formatPercentage(avgIncidence), icon: TrendingUp, color: avgIncidence > 25 ? "#ef4444" : avgIncidence > 15 ? "#eab308" : "#22c55e", sub: avgIncidence > 25 ? "⚠ Alerta" : "normal" },
                ].map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <motion.div
                            key={kpi.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="kpi-card"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}
                                >
                                    <Icon size={20} style={{ color: kpi.color }} />
                                </div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">{kpi.sub}</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{kpi.value}</p>
                            <p className="text-sm text-slate-400 mt-1">{kpi.label}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* General Filters */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                <select
                    value={selectedTier ?? ""}
                    onChange={(e) => setSelectedTier(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                >
                    <option value="">Todos los Tiers</option>
                    {[1, 2, 3, 4, 5].map((t) => (
                        <option key={t} value={t}>Tier {t} — {TIER_DEFINITIONS[t]?.name}</option>
                    ))}
                </select>

                <select
                    value={selectedEstado ?? ""}
                    onChange={(e) => setSelectedEstado(e.target.value || null)}
                    className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                >
                    <option value="">Todos los Estados</option>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="OBRA">EN OBRA</option>
                </select>

                <select
                    value={selectedMunicipio ?? ""}
                    onChange={(e) => setSelectedMunicipio(e.target.value || null)}
                    className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                >
                    <option value="">Todos los Municipios</option>
                    {municipios.sort().map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>

                {(selectedTier || selectedEstado || selectedMunicipio) && (
                    <button
                        onClick={() => { setSelectedTier(null); setSelectedEstado(null); setSelectedMunicipio(null); }}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <X size={14} /> Limpiar filtros
                    </button>
                )}
            </div>

            {/* Strategic Decision Highlight */}
            {selectedSalon && strategicStatus && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden group pt-2"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/5" />
                    <div className="glass-card p-6 md:p-8 relative">
                        {/* Internal Selector for the specific salon analysis */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <BrainCircuit size={18} className="text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Análisis de Decisión por Salón</h3>
                            </div>
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <select
                                    value={selectedSalon?.id_salon ?? ""}
                                    onChange={(e) => {
                                        const s = salones.find(x => x.id_salon === parseInt(e.target.value));
                                        if (s) setSelectedSalon(s);
                                    }}
                                    className="bg-blue-600/10 border border-blue-500/30 rounded-xl px-4 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60 min-w-[240px] font-medium"
                                >
                                    {salones.map(s => (
                                        <option key={s.id_salon} value={s.id_salon} className="bg-slate-900">{s.nombre_salon}</option>
                                    ))}
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

            {/* Map + Portfolio Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 min-h-[400px]">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-blue-400" />
                        Mapa de Red de Salones
                    </h2>
                    <div className="relative w-full h-[360px] bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/30">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-full h-full">
                                <div className="absolute inset-4 border border-slate-700/20 rounded-xl" />
                                {filtered.map((salon) => {
                                    if (!salon.lat_salon || !salon.lon_salon) return null;
                                    const minLat = -35.0, maxLat = -34.4, minLon = -59.0, maxLon = -57.8;
                                    const x = ((salon.lon_salon - minLon) / (maxLon - minLon)) * 100;
                                    const y = ((salon.lat_salon - minLat) / (maxLat - minLat)) * 100;
                                    const effColor = salon.efficiency ? getSemaphoreColor(salon.efficiency.color) : "#6b7280";

                                    return (
                                        <button
                                            key={salon.id_salon}
                                            onClick={() => setSelectedSalon(salon)}
                                            className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
                                            style={{ left: `${Math.min(90, Math.max(10, x))}%`, top: `${Math.min(90, Math.max(10, y))}%` }}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg transition-transform group-hover:scale-150 ${selectedSalon?.id_salon === salon.id_salon ? "scale-150 ring-4 ring-white/20" : ""}`}
                                                style={{ background: effColor, boxShadow: `0 0 8px ${effColor}80` }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
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
                                key={salon.id_salon}
                                onClick={() => setSelectedSalon(salon)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all border ${selectedSalon?.id_salon === salon.id_salon
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
        </div>
    );
}
