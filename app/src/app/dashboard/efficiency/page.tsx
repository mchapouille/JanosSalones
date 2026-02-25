"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gauge, Info } from "lucide-react";
import { formatPercentage } from "@/lib/formatters";
import { getSemaphoreColor, TIER_DEFINITIONS } from "@/lib/calculations";
import { getSalonesData } from "@/lib/sample-data";
import { useDashboard } from "@/components/DashboardContext";

export default function EfficiencyPage() {
    const { } = useDashboard();

    // Efficiency Analysis works mainly on active salons
    const salones = useMemo(() => getSalonesData().filter((s) => s.estado_salon === "ACTIVO"), []);
    const [tierFilter, setTierFilter] = useState<number | null>(null);

    const salonesWithEfficiency = useMemo(() => salones.filter((s) => s.efficiency), [salones]);
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);

    // Initial selection
    useEffect(() => {
        if (salonesWithEfficiency.length > 0 && selectedSalonId === null) {
            setSelectedSalonId(salonesWithEfficiency[0].id_salon);
        }
    }, [salonesWithEfficiency, selectedSalonId]);

    const selectedSalon = useMemo(() =>
        salonesWithEfficiency.find(s => s.id_salon === selectedSalonId),
        [salonesWithEfficiency, selectedSalonId]
    );

    // Global KPIs
    const globalKPIs = useMemo(() => {
        if (salonesWithEfficiency.length === 0) return null;
        const avgIndex = salonesWithEfficiency.reduce((acc, s) => acc + (s.efficiency?.globalIndex || 0), 0) / salonesWithEfficiency.length;
        const efficientCount = salonesWithEfficiency.filter(s => s.efficiency?.color === "green").length;
        const alertCount = salonesWithEfficiency.filter(s => s.efficiency?.color === "red").length;
        return {
            avgIndex,
            efficientPct: (efficientCount / salonesWithEfficiency.length) * 100,
            alertCount,
            total: salonesWithEfficiency.length
        };
    }, [salonesWithEfficiency]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Eficiencia de Activos</h1>
                    <p className="text-slate-400 text-sm mt-1">Índice Global de Eficiencia — PAX & $m² vs Mediana del Tier</p>
                </div>
            </div>

            {/* Global KPIs Section */}
            {globalKPIs && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Salones Analizados</p>
                        <p className="text-3xl font-bold text-white">{globalKPIs.total}</p>
                        <p className="text-xs text-slate-500 mt-1">
                            De {salones.length} activos {salones.length > globalKPIs.total && <span className="text-red-400 font-bold ml-1">({salones.length - globalKPIs.total} s/info)</span>}
                        </p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Eficiencia Promedio</p>
                        <p className="text-3xl font-bold text-blue-400">{globalKPIs.avgIndex.toFixed(2)}</p>
                        <p className="text-xs text-slate-500 mt-1">índice global de red</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">% Salones Eficientes</p>
                        <p className="text-3xl font-bold text-green-400">{formatPercentage(globalKPIs.efficientPct)}</p>
                        <p className="text-xs text-slate-500 mt-1">estatus verde</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="kpi-card">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Salones en Alerta</p>
                        <p className="text-3xl font-bold text-red-500">{globalKPIs.alertCount}</p>
                        <p className="text-xs text-slate-500 mt-1">requieren revisión</p>
                    </motion.div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Salon Selector Table */}
                <div className="lg:col-span-1 glass-card p-4 overflow-hidden flex flex-col h-full max-h-[600px]">
                    <h2 className="text-lg font-semibold text-white mb-4">Seleccionar Salón</h2>
                    <div className="overflow-y-auto pr-2 space-y-1">
                        {salonesWithEfficiency
                            .sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon))
                            .map((s) => {
                                const isActive = selectedSalonId === s.id_salon;
                                const color = getSemaphoreColor(s.efficiency?.color || "gray");
                                return (
                                    <button
                                        key={s.id_salon}
                                        onClick={() => setSelectedSalonId(s.id_salon)}
                                        className={`w-full text-left p-3 rounded-xl transition-all border ${isActive
                                            ? "bg-blue-500/10 border-blue-500/30"
                                            : "bg-transparent border-transparent hover:bg-white/5"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className={`text-sm font-medium ${isActive ? "text-blue-100" : "text-slate-300"}`}>{s.nombre_salon}</p>
                                                <p className="text-[10px] text-slate-500">Tier {s.tier} • {s.municipio_salon}</p>
                                            </div>
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Right: Detailed Analysis View */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedSalon ? (
                        <motion.div
                            key={selectedSalon.id_salon}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card p-6 h-full"
                        >
                            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedSalon.nombre_salon}</h2>
                                    <p className="text-slate-400">Eficiencia Individual de Salón — {TIER_DEFINITIONS[selectedSalon.tier]?.name}</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span
                                        className="px-3 py-1 rounded-full text-xs font-bold mb-2"
                                        style={{
                                            background: `${getSemaphoreColor(selectedSalon.efficiency!.color)}15`,
                                            color: getSemaphoreColor(selectedSalon.efficiency!.color),
                                            border: `1px solid ${getSemaphoreColor(selectedSalon.efficiency!.color)}30`
                                        }}
                                    >
                                        {selectedSalon.efficiency!.color === "green" ? "EFICIENTE" : selectedSalon.efficiency!.color === "yellow" ? "ESTABILIZADO" : "BAJO RENDIMIENTO"}
                                    </span>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Estatus Tier {selectedSalon.tier}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                {/* Gauge and Central Index */}
                                <div className="flex flex-col items-center justify-center p-6 bg-slate-900/40 rounded-3xl border border-white/5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Gauge size={100} className="text-blue-400" />
                                    </div>
                                    <div className="relative z-10">
                                        <svg width="240" height="140" viewBox="0 0 140 80">
                                            <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                                            <path d="M 10 70 A 60 60 0 0 1 70 10" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                                            <path d="M 70 10 A 60 60 0 0 1 105 28" fill="none" stroke="#eab308" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                                            <path d="M 105 28 A 60 60 0 0 1 130 70" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                                            <line
                                                x1="70" y1="70"
                                                x2={70 + 50 * Math.cos((Math.PI * (180 - Math.min(180, (selectedSalon.efficiency!.globalIndex / 2) * 180))) / 180)}
                                                y2={70 - 50 * Math.sin((Math.PI * (180 - Math.min(180, (selectedSalon.efficiency!.globalIndex / 2) * 180))) / 180)}
                                                stroke={getSemaphoreColor(selectedSalon.efficiency!.color)} strokeWidth="3" strokeLinecap="round"
                                            />
                                            <circle cx="70" cy="70" r="5" fill={getSemaphoreColor(selectedSalon.efficiency!.color)} />
                                            <text x="70" y="65" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                                                {(selectedSalon.efficiency?.globalIndex || 0).toFixed(2)}
                                            </text>
                                        </svg>
                                        <div className="text-center mt-2">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-tight">Índice Global</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ratio Details */}
                                <div className="space-y-4">
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="flex justify-between items-end mb-2">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Rentabilidad / PAX</p>
                                            <p className="text-xl font-bold text-white">{(selectedSalon.efficiency?.paxRatio || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${Math.min(100, ((selectedSalon.efficiency?.paxRatio || 0) / 2) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-600 mt-2">Relación entre flujo de personas y costo operativo.</p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="flex justify-between items-end mb-2">
                                            <p className="text-xs text-slate-500 uppercase font-bold">Productividad / m²</p>
                                            <p className="text-xl font-bold text-white">{(selectedSalon.efficiency?.mt2Ratio || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ width: `${Math.min(100, ((selectedSalon.efficiency?.mt2Ratio || 0) / 2) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-600 mt-2">Ventas generadas por cada metro cuadrado del activo.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                                <Info size={16} className="text-blue-400 mt-1 flex-shrink-0" />
                                <p className="text-xs text-blue-300/70 leading-relaxed">
                                    El Índice Global de <strong>{(selectedSalon.efficiency?.globalIndex || 0).toFixed(2)}</strong> para {selectedSalon.nombre_salon}{" "}
                                    indica que el activo está operando a un{" "}
                                    {(selectedSalon.efficiency?.globalIndex || 0) > 1 ? "sobrecosto" : "nivel óptimo"}{" "}
                                    respecto al rendimiento promedio de su Tier ({selectedSalon.tier}).
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-50 border-dashed">
                            <Gauge size={48} className="text-slate-700 mb-4" />
                            <p className="text-slate-500">Selecciona un salón para ver el análisis de eficiencia detallado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
