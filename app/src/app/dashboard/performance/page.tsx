"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Award, Sliders, Search, X, BrainCircuit } from "lucide-react";
import { formatARS, formatPercentage, formatMultiplier } from "@/lib/formatters";
import { getSemaphoreColor, simulateRentReduction, calcPerformance, get_color_from_incidence } from "@/lib/calculations";
import { getSalonesData } from "@/lib/sample-data";
import { useDashboard } from "@/components/DashboardContext";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
} from "recharts";

function interpolateScore(val: number, x0: number, x1: number, y0: number, y1: number) {
    if (val <= x0) return y0;
    if (val >= x1) return y1;
    return y0 + ((val - x0) / (x1 - x0)) * (y1 - y0);
}

export default function PerformancePage() {
    const { } = useDashboard();

    // Performance works mainly on active salons
    const salones = useMemo(() => getSalonesData().filter((s) => s.estado_salon === "ACTIVO"), []);
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
    const [ipWeights, setIpWeights] = useState({ margen: 40, incidencia: 30, ticketEvento: 15, ticketInvitado: 15 });

    // Update selected salon if it's not in the filtered list
    useEffect(() => {
        if (selectedSalonId && !salones.find(s => s.id_salon === selectedSalonId)) {
            setSelectedSalonId(null);
        }
    }, [salones, selectedSalonId]);

    // Compute dynamic IP score for selected salon
    const dynamicScore = useMemo(() => {
        const s = salones.find(x => x.id_salon === selectedSalonId);
        if (!s) return null;
        const incPct = (s.incidencia_alquiler_sobre_facturacion_anual || 0) * 100;
        const maxMargen = Math.max(...salones.map(x => x.margen_individual || 0));
        const pts_inc = Math.max(0, Math.min(100, interpolateScore(incPct, 5, 30, 100, 0)));
        const pts_mar = Math.max(0, Math.min(100, interpolateScore(s.margen_individual || 0, 0, maxMargen || 1, 0, 100)));
        const pts_eve = Math.max(0, Math.min(100, interpolateScore(s.ticket_evento_promedio || 0, 10000000, 40000000, 0, 100)));
        const pts_inv = Math.max(0, Math.min(100, interpolateScore(s.ticket_persona_promedio || 0, 150000, 500000, 0, 100)));
        const total = ipWeights.margen + ipWeights.incidencia + ipWeights.ticketEvento + ipWeights.ticketInvitado || 100;
        let score = (pts_mar * ipWeights.margen + pts_inc * ipWeights.incidencia + pts_eve * ipWeights.ticketEvento + pts_inv * ipWeights.ticketInvitado) / total;
        if ((s.margen_individual || 0) < 0) score = 0;
        const label = score >= 60 ? "Desempeño Alto" : score >= 40 ? "Desempeño Medio" : score >= 5 ? "Desempeño Bajo" : "Riesgo Crítico";
        const color = score >= 60 ? "green" : score >= 40 ? "yellow" : score >= 5 ? "red" : "critical";
        const categoria = score >= 60 ? "alta" : score >= 40 ? "media" : score >= 5 ? "baja" : "muy_baja";
        return { score, label, color, categoria };
    }, [selectedSalonId, salones, ipWeights]);

    // Data for ScatterChart: Margen Total (X) vs Score Rentabilidad (Y)
    const chartData = useMemo(() => {
        if (!selectedSalonId) {
            // Default View: Show ONE aggregate point
            const totalMargin = salones.reduce((acc, s) => acc + ((s.ventas_totales_salon || 0) - (s.costos_totales_salon || 0)), 0);
            return [{
                id: 'total',
                name: 'Total Red',
                x: totalMargin,
                y: 100, // Fixed 100 per instruction
                z: 1,
                color: '#3b82f6',
                isFiltered: true
            }];
        }

        // Selected View: Show ONLY the selected salon
        const s = salones.find(x => x.id_salon === selectedSalonId);
        if (!s) return [];

        return [{
            id: s.id_salon,
            name: s.nombre_salon,
            x: (s.ventas_totales_salon || 0) - (s.costos_totales_salon || 0),
            y: s.performance?.score || 0,
            z: 1,
            color: getSemaphoreColor(s.performance?.color || "gray"),
            isFiltered: true
        }];
    }, [salones, selectedSalonId]);

    const groupedSalones = useMemo(() => {
        const baseList = salones.filter(s => s.performance);
        return {
            alta: baseList.filter(s => (s.performance?.score || 0) >= 60).sort((a, b) => (b.performance?.score || 0) - (a.performance?.score || 0)),
            media: baseList.filter(s => (s.performance?.score || 0) >= 40 && (s.performance?.score || 0) < 60).sort((a, b) => (b.performance?.score || 0) - (a.performance?.score || 0)),
            baja: baseList.filter(s => (s.performance?.score || 0) >= 5 && (s.performance?.score || 0) < 40).sort((a, b) => (a.performance?.score || 0) - (b.performance?.score || 0)),
            muyBaja: baseList.filter(s => (s.performance?.score || 0) < 5).sort((a, b) => (a.performance?.score || 0) - (b.performance?.score || 0)),
        };
    }, [salones]);

    // Top 5 rankings
    const top5Margin = useMemo(
        () => [...salones].sort((a, b) => (b.performance?.marginContribution || 0) - (a.performance?.marginContribution || 0)).slice(0, 5),
        [salones]
    );
    const top5Return = useMemo(
        () => [...salones].sort((a, b) => (b.performance?.multiplier || 0) - (a.performance?.multiplier || 0)).slice(0, 5),
        [salones]
    );
    const top5Risk = useMemo(
        () => [...salones].sort((a, b) => (b.performance?.rentIncidence || 0) - (a.performance?.rentIncidence || 0)).slice(0, 5),
        [salones]
    );

    // What-If for selected salon
    const simSalon = salones.find((s) => s.id_salon === selectedSalonId);
    const [rentReduction, setRentReduction] = useState(0);

    const simulation = simSalon
        ? simulateRentReduction(
            simSalon.costos_fijos_salon || 0, // Using fixed costs as base as requested in v3
            simSalon.ventas_totales_salon || 0,
            simSalon.costos_variables_salon || 0,
            rentReduction
        )
        : null;

    // Alert salones (>25%)
    const alertSalones = salones.filter((s) => (s.performance?.rentIncidence || 0) > 25);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Performance</h1>
                    <p className="text-slate-400 text-sm mt-1">Análisis de Rentabilidad</p>
                </div>
            </div>

            {/* Salon Selector — prominent panel */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-purple-600/5 rounded-2xl border border-blue-500/20" />
                <div className="glass-card p-5 relative flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                            <Search size={16} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Seleccionar Salón</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">Filtra todos los paneles por salón activo</p>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <select
                            value={selectedSalonId ?? ""}
                            onChange={(e) => setSelectedSalonId(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-3 text-sm text-blue-100 font-bold focus:outline-none focus:border-blue-500/60 appearance-none cursor-pointer transition-colors"
                        >
                            <option value="">— Ver todos los salones activos —</option>
                            {[...salones]
                                .sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon))
                                .map(s => (
                                    <option key={s.id_salon} value={s.id_salon}>
                                        {s.nombre_salon} ({s.id_salon})
                                    </option>
                                ))
                            }
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500/60">
                            <Search size={14} />
                        </div>
                    </div>
                    {selectedSalonId && (
                        <button
                            onClick={() => setSelectedSalonId(null)}
                            className="flex-shrink-0 text-xs text-slate-500 hover:text-red-400 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/8 hover:border-red-500/20 transition-all"
                        >
                            <X size={12} /> Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Salones Analizados</p>
                    <p className="text-3xl font-bold text-white">
                        {!selectedSalonId
                            ? [...new Set(salones.map(s => s.id_salon))].length
                            : 1}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        De {salones.length} activos
                    </p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Score Rentabilidad</p>
                    {(() => {
                        // Use dynamicScore when salon selected (same source as the panel circle)
                        const score = !selectedSalonId ? 100 : (dynamicScore?.score ?? 0);
                        const scoreColor = score >= 60 ? "#22c55e" : score >= 40 ? "#facc15" : score >= 5 ? "#f97316" : "#ef4444";
                        const scoreLabel = score >= 60 ? "Alta" : score >= 40 ? "Media" : score >= 5 ? "Baja" : "Muy Baja";
                        return (
                            <>
                                <p className="text-3xl font-bold" style={{ color: scoreColor }}>{score.toFixed(0)}</p>
                                <p className="text-xs font-bold mt-1" style={{ color: scoreColor }}>{scoreLabel}</p>
                            </>
                        );
                    })()}
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Margen Total</p>
                    <p className="text-3xl font-bold text-emerald-400">
                        {formatARS(
                            !selectedSalonId
                                ? salones.reduce((acc, s) => acc + ((s.ventas_totales_salon || 0) - (s.costos_totales_salon || 0)), 0)
                                : ((salones.find(s => s.id_salon === selectedSalonId)?.ventas_totales_salon || 0) - (salones.find(s => s.id_salon === selectedSalonId)?.costos_totales_salon || 0))
                        )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">contribución acumulada</p>
                </motion.div>
            </div>

            {/* Revenue vs Rent Scatter Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
                <div className="lg:col-span-3 h-[450px] relative glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-400" />
                            Matriz de Performance: Margen vs Score
                        </h2>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">
                            Referencia: Score Rentabilidad (0-100)
                        </div>
                    </div>

                    <div className="absolute top-24 right-12 text-[10px] font-black text-red-500/30 uppercase tracking-[0.2em] pointer-events-none p-2 rounded-lg border border-red-500/5 bg-red-500/5">ALTA INCIDENCIA</div>
                    <div className="absolute bottom-24 left-32 text-[10px] font-black text-green-500/30 uppercase tracking-[0.2em] pointer-events-none p-2 rounded-lg border border-green-500/5 bg-green-500/5">ALTA EFICIENCIA</div>

                    <ResponsiveContainer width="100%" height="90%">
                        <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                            <XAxis
                                type="number"
                                dataKey="x"
                                name="Margen Total"
                                stroke="#475569"
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                                label={{ value: 'Margen Total ($)', position: 'bottom', offset: 20, fill: '#64748b', fontSize: 12 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                name="Score"
                                domain={[0, 100]}
                                stroke="#475569"
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                label={{ value: 'Score Rentabilidad', angle: -90, position: 'left', offset: 0, fill: '#64748b', fontSize: 12 }}
                            />
                            <ZAxis type="number" dataKey="z" range={[100, 100]} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md min-w-[200px]">
                                                <p className="text-sm font-bold text-white mb-3 border-b border-white/5 pb-2">{data.name}</p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-[10px] text-slate-500 uppercase">Margen Total:</span>
                                                        <span className="text-[10px] font-bold text-emerald-400">{formatARS(data.x)}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4 pt-1 border-t border-white/5">
                                                        <span className="text-[10px] text-slate-500 uppercase">Score:</span>
                                                        <span className={`text-[10px] font-bold ${data.y < 40 ? "text-red-400" : data.y > 60 ? "text-green-400" : "text-blue-400"}`}>
                                                            {data.y.toFixed(0)} pts
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            {/* Reference Lines for Score Quadrants */}
                            <ReferenceLine y={5} stroke="#f97316" strokeDasharray="3 3" opacity={0.6} label={{ position: 'right', value: 'Baja', fill: '#f97316', fontSize: 9 }} />
                            <ReferenceLine y={40} stroke="#facc15" strokeDasharray="3 3" opacity={0.6} label={{ position: 'right', value: 'Media', fill: '#facc15', fontSize: 9 }} />
                            <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="3 3" opacity={0.6} label={{ position: 'right', value: 'Alta', fill: '#22c55e', fontSize: 9 }} />
                            <Scatter name="Salones" data={chartData}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        strokeWidth={2}
                                        stroke={entry.color}
                                        fillOpacity={entry.isFiltered ? 0.4 : 0.05}
                                        strokeOpacity={entry.isFiltered ? 1 : 0.1}
                                        className={`cursor-pointer transition-all ${entry.isFiltered ? "hover:fill-opacity-80" : "pointer-events-none"}`}
                                        onClick={() => entry.isFiltered && setSelectedSalonId(entry.id as number)}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/5 h-full">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sliders size={14} className="text-blue-400" />
                            Guía de Cuadrantes
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 mt-0.5 flex-shrink-0 shadow-[0_0_6px_#22c55e88]" />
                                <div>
                                    <p className="text-[11px] font-bold text-green-400">Alta (60 – 100)</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">Alta contribución al margen y score optimizado.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-white/5">
                                <div className="w-2 h-2 rounded-full bg-yellow-400 mt-0.5 flex-shrink-0 shadow-[0_0_6px_#facc1588]" />
                                <div>
                                    <p className="text-[11px] font-bold text-yellow-400">Media (40 – 60)</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">Performance alineada con el promedio de la red.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-white/5">
                                <div className="w-2 h-2 rounded-full bg-orange-500 mt-0.5 flex-shrink-0 shadow-[0_0_6px_#f9731688]" />
                                <div>
                                    <p className="text-[11px] font-bold text-orange-400">Baja (5 – 40)</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">Requiere revisión de costos o impulso comercial.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-white/5">
                                <div className="w-2 h-2 rounded-full bg-red-600 mt-0.5 flex-shrink-0 shadow-[0_0_6px_#ef444488]" />
                                <div>
                                    <p className="text-[11px] font-bold text-red-500">Muy Baja (&lt; 5)</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">Situación crítica. Revisión inmediata de contrato.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10">
                            <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                El gráfico cruza la facturación total mensual contra el costo de alquiler para identificar la salud del margen bruto de cada locación.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Situation Cards Row — 4 buckets matching guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Alta (60-100) */}
                <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[300px]">
                    <div className="p-4 border-b border-green-500/20 bg-green-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="text-[11px] font-black text-green-400 uppercase tracking-widest">Alta</span>
                            <span className="text-[9px] text-green-600 font-bold">60-100</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] font-bold text-green-500 border border-green-500/20">
                            {groupedSalones.alta.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                        {groupedSalones.alta.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSalonId === s.id_salon ? "bg-green-500/10 border-green-500/30" : "bg-slate-900/60 border-white/5 hover:border-green-500/20"}`}>
                                <span className="text-[10px] font-bold text-slate-200 truncate mr-2">{s.nombre_salon}</span>
                                <span className="text-[10px] font-black text-green-400 flex-shrink-0">{s.performance?.score.toFixed(0)} pts</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Media (40-60) */}
                <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[300px]">
                    <div className="p-4 border-b border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                            <span className="text-[11px] font-black text-yellow-400 uppercase tracking-widest">Media</span>
                            <span className="text-[9px] text-yellow-600 font-bold">40-60</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-[10px] font-bold text-yellow-500 border border-yellow-500/20">
                            {groupedSalones.media.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                        {groupedSalones.media.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSalonId === s.id_salon ? "bg-yellow-500/10 border-yellow-500/30" : "bg-slate-900/60 border-white/5 hover:border-yellow-500/20"}`}>
                                <span className="text-[10px] font-bold text-slate-200 truncate mr-2">{s.nombre_salon}</span>
                                <span className="text-[10px] font-black text-yellow-400 flex-shrink-0">{s.performance?.score.toFixed(0)} pts</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Baja (5-40) */}
                <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[300px]">
                    <div className="p-4 border-b border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                            <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">Baja</span>
                            <span className="text-[9px] text-orange-600 font-bold">5-40</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-[10px] font-bold text-orange-500 border border-orange-500/20">
                            {groupedSalones.baja.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                        {groupedSalones.baja.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSalonId === s.id_salon ? "bg-orange-500/10 border-orange-500/30" : "bg-slate-900/60 border-white/5 hover:border-orange-500/20"}`}>
                                <span className="text-[10px] font-bold text-slate-200 truncate mr-2">{s.nombre_salon}</span>
                                <span className="text-[10px] font-black text-orange-400 flex-shrink-0">{s.performance?.score.toFixed(0)} pts</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Muy Baja (< 5) */}
                <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[300px]">
                    <div className="p-4 border-b border-red-600/20 bg-red-600/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                            <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Muy Baja</span>
                            <span className="text-[9px] text-red-800 font-bold">&lt; 5</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-red-600/10 text-[10px] font-bold text-red-600 border border-red-600/20">
                            {groupedSalones.muyBaja.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                        {groupedSalones.muyBaja.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSalonId === s.id_salon ? "bg-red-600/10 border-red-600/30" : "bg-slate-900/60 border-white/5 hover:border-red-600/20"}`}>
                                <span className="text-[10px] font-bold text-slate-200 truncate mr-2">{s.nombre_salon}</span>
                                <span className="text-[10px] font-black text-red-500 flex-shrink-0">{s.performance?.score.toFixed(0)} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Rankings Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Top 5 Margin */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Award size={16} className="text-green-400" />
                        Top 5 Participación Margen
                    </h3>
                    <div className="space-y-2">
                        {top5Margin.map((s, i) => (
                            <div key={s.id_salon} className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">
                                    <span className="text-slate-600 mr-2">{i + 1}.</span>
                                    {s.nombre_salon}
                                </span>
                                <span className="text-green-400 font-medium">
                                    {formatPercentage((s.performance?.marginContribution || 0) * 100)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top 5 Return */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-400" />
                        Top 5 Retorno Alquiler
                    </h3>
                    <div className="space-y-2">
                        {top5Return.map((s, i) => (
                            <div key={s.id_salon} className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">
                                    <span className="text-slate-600 mr-2">{i + 1}.</span>
                                    {s.nombre_salon}
                                </span>
                                <span className="text-blue-400 font-medium">
                                    {formatMultiplier(s.performance?.multiplier || 0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top 5 Risk */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-400" />
                        Top 5 Incidencia Alquiler
                    </h3>
                    <div className="space-y-2">
                        {top5Risk.map((s, i) => (
                            <div key={s.id_salon} className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">
                                    <span className="text-slate-600 mr-2">{i + 1}.</span>
                                    {s.nombre_salon}
                                </span>
                                <span style={{ color: get_color_from_incidence(s.performance?.rentIncidence || 0) }} className="font-medium text-red-400">
                                    {formatPercentage((s.performance?.rentIncidence || 0) * 100)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Score Rentabilidad Panel */}
            {selectedSalonId && dynamicScore && (() => {
                const hex = getSemaphoreColor(dynamicScore.color);
                const totalWeight = ipWeights.margen + ipWeights.incidencia + ipWeights.ticketEvento + ipWeights.ticketInvitado;
                const weights = [
                    { id: 'margen', label: 'Margen', shortLabel: 'MAR', value: ipWeights.margen, color: '#10b981' },
                    { id: 'incidencia', label: 'Incidencia', shortLabel: 'INC', value: ipWeights.incidencia, color: '#8b5cf6' },
                    { id: 'ticketEvento', label: 'Tk. Evento', shortLabel: 'EVT', value: ipWeights.ticketEvento, color: '#3b82f6' },
                    { id: 'ticketInvitado', label: 'Tk. Invitado', shortLabel: 'INV', value: ipWeights.ticketInvitado, color: '#06b6d4' },
                ] as const;
                return (
                    <div className="relative overflow-hidden glass-card">
                        {/* Background gradient */}
                        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 15% 60%, ${hex}18, transparent 55%)` }} />

                        {/* Header */}
                        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${hex}20` }}>
                                <BrainCircuit size={15} style={{ color: hex }} />
                            </div>
                            <h3 className="text-sm font-bold text-white">Score Rentabilidad</h3>
                            <span className="ml-auto text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border" style={{ color: hex, borderColor: `${hex}40`, background: `${hex}12` }}>
                                {dynamicScore.label}
                            </span>
                        </div>

                        {/* Body: 2-col grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 p-6">
                            {/* Score circle */}
                            <div className="flex flex-col items-center justify-center gap-2">
                                <div
                                    className="w-24 h-24 rounded-full flex flex-col items-center justify-center relative shadow-xl flex-shrink-0"
                                    style={{ background: `${hex}10`, border: `3px solid ${hex}50` }}
                                >
                                    <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: hex, opacity: 0.06 }} />
                                    <span className="text-3xl font-black text-white relative z-10 leading-none">{dynamicScore.score.toFixed(0)}</span>
                                    <span className="text-[9px] font-bold tracking-widest relative z-10 mt-0.5" style={{ color: hex }}>/ 100</span>
                                </div>
                                {/* Mini weight total indicator */}
                                <div className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${totalWeight === 100 ? 'text-green-400 border-green-500/30 bg-green-500/8' : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8'}`}>
                                    Σ {totalWeight} / 100
                                </div>
                            </div>

                            {/* Weight controls — compact 2×2 grid */}
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Sliders size={10} /> Ponderación Dinámica
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {weights.map((w) => {
                                        const pct = Math.round((w.value / Math.max(totalWeight, 1)) * 100);
                                        return (
                                            <div
                                                key={w.id}
                                                className="rounded-xl border p-3 flex flex-col gap-2"
                                                style={{ borderColor: `${w.color}25`, background: `${w.color}08` }}
                                            >
                                                {/* Label + badge */}
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400">{w.label}</span>
                                                    <span className="text-[10px] font-black tabular-nums" style={{ color: w.color }}>
                                                        {w.value}
                                                    </span>
                                                </div>
                                                {/* Compact slider */}
                                                <input
                                                    type="range"
                                                    min="0" max="100" step="5"
                                                    value={w.value}
                                                    onChange={(e) => setIpWeights(prev => ({ ...prev, [w.id]: parseInt(e.target.value) }))}
                                                    className="w-full h-1.5 rounded-full cursor-pointer"
                                                    style={{ accentColor: w.color }}
                                                />
                                                {/* Contribution bar */}
                                                <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
                                                        style={{ width: `${pct}%`, background: w.color }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}


            {/* What-If Simulator */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Sliders size={18} className="text-cyan-400" />
                    Simulador &quot;What-If&quot; — Reducción de Alquiler
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Salón Seleccionado</label>
                            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white flex items-center justify-between">
                                <span className="font-bold">{simSalon?.nombre_salon || 'Ningún salón seleccionado'}</span>
                                <div className={`w-2 h-2 rounded-full ${simSalon ? 'bg-green-500' : 'bg-slate-600'}`} />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">
                                Reducción de Alquiler: <span className="text-white font-bold">{rentReduction}%</span>
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={50}
                                step={1}
                                value={rentReduction}
                                onChange={(e) => setRentReduction(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none bg-slate-800 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg"
                            />
                            <div className="flex justify-between text-xs text-slate-600 mt-1">
                                <span>0%</span><span>25%</span><span>50%</span>
                            </div>
                        </div>
                    </div>

                    {simulation && simSalon && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="glass-card-light p-3">
                                    <p className="text-xs text-slate-500">Nuevo Alquiler</p>
                                    <p className="text-lg font-bold text-white">{formatARS(simulation.newCostosFijos)}</p>
                                </div>
                                <div className="glass-card-light p-3">
                                    <p className="text-xs text-slate-500">Incidencia Resultante</p>
                                    <p className="text-lg font-bold" style={{ color: simulation.newIncidence > 0.25 ? "#ef4444" : simulation.newIncidence > 0.15 ? "#eab308" : "#22c55e" }}>
                                        {rentReduction === 0 && simSalon?.performance
                                            ? formatPercentage(simSalon.performance.rentIncidence * 100)
                                            : formatPercentage(simulation.newIncidence * 100)}
                                    </p>
                                </div>
                                <div className="glass-card-light p-3">
                                    <p className="text-xs text-slate-500">Nuevo Margen</p>
                                    <p className="text-lg font-bold text-white">{formatARS(simulation.newMargin)}</p>
                                </div>
                                <div className="glass-card-light p-3">
                                    <p className="text-xs text-slate-500">Mejora en Margen</p>
                                    <p className="text-lg font-bold text-green-400">+{formatARS(simulation.marginImprovement)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
