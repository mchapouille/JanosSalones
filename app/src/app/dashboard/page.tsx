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
} from "lucide-react";
import { formatARS, formatNumber, formatPercentage } from "@/lib/formatters";
import { getSemaphoreColor, TIER_DEFINITIONS } from "@/lib/calculations";
import { getSalonesData, type SalonIntegral } from "@/lib/sample-data";

export default function DashboardPage() {
    const salones = useMemo(() => getSalonesData(), []);
    const [selectedTier, setSelectedTier] = useState<number | null>(null);
    const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
    const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
    const [selectedSalon, setSelectedSalon] = useState<SalonIntegral | null>(null);

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Command Center</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Vista integral de la red de salones de Jano&apos;s Eventos
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
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

            {/* KPI Cards */}
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

            {/* Map + Salon List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map placeholder */}
                <div className="lg:col-span-2 glass-card p-6 min-h-[400px]">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-blue-400" />
                        Mapa de Red de Salones
                    </h2>
                    <div className="relative w-full h-[360px] bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/30">
                        {/* Map with markers */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-full h-full">
                                {/* Argentina outline hint */}
                                <div className="absolute inset-4 border border-slate-700/20 rounded-xl" />
                                {/* Salon markers */}
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
                                            title={salon.nombre_salon}
                                        >
                                            <div
                                                className="w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg transition-transform group-hover:scale-150"
                                                style={{ background: effColor, boxShadow: `0 0 8px ${effColor}80` }}
                                            />
                                            <span className="absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 px-2 py-0.5 rounded">
                                                {salon.nombre_salon}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Legend */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-slate-900/90 px-3 py-2 rounded-lg text-[10px]">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Eficiente</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />Atención</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Renegociar</span>
                        </div>
                    </div>
                </div>

                {/* Salon List */}
                <div className="glass-card p-6 max-h-[500px] overflow-y-auto">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-cyan-400" />
                        Salones ({filtered.length})
                    </h2>
                    <div className="space-y-2">
                        {filtered.map((salon) => (
                            <button
                                key={salon.id_salon}
                                onClick={() => setSelectedSalon(salon)}
                                className={`w-full text-left p-3 rounded-xl transition-all duration-200 border ${selectedSalon?.id_salon === salon.id_salon
                                        ? "border-blue-500/40 bg-blue-500/10"
                                        : "border-transparent hover:bg-slate-800/40"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">{salon.nombre_salon}</p>
                                        <p className="text-[11px] text-slate-500">
                                            Tier {salon.tier} · {salon.municipio_salon || "—"} · {salon.estado_salon}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {salon.performance && (
                                            <span
                                                className="semaphore-dot"
                                                style={{ backgroundColor: getSemaphoreColor(salon.performance.color) }}
                                                title={`Incidencia: ${formatPercentage(salon.performance.rentIncidence)}`}
                                            />
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Salon Detail Drawer */}
            {selectedSalon && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedSalon.nombre_salon}</h2>
                            <p className="text-sm text-slate-400">
                                {selectedSalon.direccion_salon} · {selectedSalon.municipio_salon}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedSalon(null)}
                            className="w-8 h-8 rounded-lg hover:bg-slate-800/60 flex items-center justify-center text-slate-400"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Performance */}
                        <div className="glass-card-light p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Incidencia Alquiler</p>
                            <p className="text-2xl font-bold" style={{ color: getSemaphoreColor(selectedSalon.performance?.color || "gray") }}>
                                {selectedSalon.performance ? formatPercentage(selectedSalon.performance.rentIncidence) : "—"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Multiplicador: {selectedSalon.performance ? `${selectedSalon.performance.multiplier.toFixed(1)}x` : "—"}
                            </p>
                        </div>

                        {/* Revenue */}
                        <div className="glass-card-light p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Facturación</p>
                            <p className="text-2xl font-bold text-white">
                                {selectedSalon.ventas_totales_salon ? formatARS(selectedSalon.ventas_totales_salon) : "—"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Alquiler: {selectedSalon.costos_fijos_salon ? formatARS(selectedSalon.costos_fijos_salon) : "—"}
                            </p>
                        </div>

                        {/* PAX */}
                        <div className="glass-card-light p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Capacidad PAX</p>
                            <p className="text-2xl font-bold text-white">
                                {selectedSalon.pax_calculado ? formatNumber(selectedSalon.pax_calculado) : "—"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Formal: {selectedSalon.pax_formal_pista || "—"} · Informal: {selectedSalon.pax_informal_pista || "—"}
                            </p>
                        </div>

                        {/* Efficiency */}
                        <div className="glass-card-light p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Índice Global</p>
                            <p className="text-2xl font-bold" style={{ color: getSemaphoreColor(selectedSalon.efficiency?.color || "gray") }}>
                                {selectedSalon.efficiency ? selectedSalon.efficiency.globalIndex.toFixed(2) : "—"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {selectedSalon.mt2_salon ? `${selectedSalon.mt2_salon} m²` : "—"} · {selectedSalon.cantidad_eventos_salon || 0} eventos
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
