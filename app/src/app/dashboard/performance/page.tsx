"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Award, Sliders, Search, X } from "lucide-react";
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

export default function PerformancePage() {
    const { selectedYear, setSelectedYear, availableYears } = useDashboard();
    const salonesResource = useMemo(() => getSalonesData(selectedYear).filter((s) => s.estado_salon === "ACTIVO"), [selectedYear]);

    const salones = useMemo(() => {
        // Aggregate by id_salon to handle "All Years" view or multiple records
        const aggregatedMap = new Map<number, any>();

        salonesResource.forEach(s => {
            if (!aggregatedMap.has(s.id_salon)) {
                aggregatedMap.set(s.id_salon, { ...s, count: 1 });
            } else {
                const existing = aggregatedMap.get(s.id_salon);
                existing.ventas_totales_salon = (existing.ventas_totales_salon || 0) + (s.ventas_totales_salon || 0);
                existing.costos_fijos_salon = (existing.costos_fijos_salon || 0) + (s.costos_fijos_salon || 0);
                existing.costos_variables_salon = (existing.costos_variables_salon || 0) + (s.costos_variables_salon || 0);
                // Also sum pre-calculated metrics to promediate them
                existing.performance = {
                    ...existing.performance,
                    score: (existing.performance?.score || 0) + (s.performance?.score || 0),
                    rentIncidence: (existing.performance?.rentIncidence || 0) + (s.performance?.rentIncidence || 0),
                    marginContribution: (existing.performance?.marginContribution || 0) + (s.performance?.marginContribution || 0),
                };
                existing.count += 1;
            }
        });

        return Array.from(aggregatedMap.values()).map(s => {
            const count = s.count || 1;
            const avgVentas = s.ventas_totales_salon / count;
            const avgFijos = s.costos_fijos_salon / count;
            const avgVariables = s.costos_variables_salon / count;

            // If we have only 1 record (specific year), use its performance data but fix scaling
            if (count === 1) {
                return {
                    ...s,
                    performance: {
                        ...s.performance,
                        // Ensure it's correctly calculated
                        ...calcPerformance(s.costos_fijos_salon, s.ventas_totales_salon, s.costos_variables_salon)
                    }
                };
            }

            // For aggregated view (All Years), recalculate weighted performance
            const perf = calcPerformance(avgFijos, avgVentas, avgVariables);

            return {
                ...s,
                ventas_totales_salon: avgVentas,
                costos_fijos_salon: avgFijos,
                costos_variables_salon: avgVariables,
                performance: perf
            };
        });
    }, [salonesResource, selectedYear]);
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);

    // Update selected salon if it's not in the filtered list
    useEffect(() => {
        if (selectedSalonId && !salones.find(s => s.id_salon === selectedSalonId)) {
            setSelectedSalonId(null);
        }
    }, [salones, selectedSalonId]);

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
        // Here we use salones list directly to have access to full performance object
        const baseList = salones.filter(s => s.performance);
        return {
            efficient: baseList.filter(s => (s.performance?.score || 0) >= 60).sort((a, b) => (b.performance?.score || 0) - (a.performance?.score || 0)),
            aligned: baseList.filter(s => (s.performance?.score || 0) >= 40 && (s.performance?.score || 0) < 60).sort((a, b) => (b.performance?.score || 0) - (a.performance?.score || 0)),
            critical: baseList.filter(s => (s.performance?.score || 0) < 40).sort((a, b) => (a.performance?.score || 0) - (b.performance?.score || 0)),
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Performance</h1>
                    <p className="text-slate-400 text-sm mt-1">Análisis de Rentabilidad</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <select
                            value={selectedSalonId ?? ""}
                            onChange={(e) => setSelectedSalonId(e.target.value ? parseInt(e.target.value) : null)}
                            className="bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 min-w-[200px] transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Buscar Salón...</option>
                            {salones
                                .sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon))
                                .map(s => (
                                    <option key={s.id_salon} value={s.id_salon}>
                                        {s.nombre_salon} ({s.id_salon})
                                    </option>
                                ))
                            }
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <Search size={14} />
                        </div>
                    </div>

                    <select
                        value={selectedYear ?? ""}
                        onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                        className="bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2.5 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60 min-w-[140px] font-bold"
                    >
                        <option value="">Año (Todos)</option>
                        {availableYears.map((y) => (
                            <option key={y} value={y}>Año {y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Salones Analizados</p>
                    <p className="text-3xl font-bold text-white">
                        {!selectedSalonId
                            ? [...new Set(getSalonesData(selectedYear).filter(s => s.estado_salon === "ACTIVO").map(s => s.id_salon))].length
                            : 1}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        De {salones.length} activos
                    </p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Score Rentabilidad</p>
                    <p className="text-3xl font-bold text-blue-400">
                        {(!selectedSalonId ? 100 : (salones.find(s => s.id_salon === selectedSalonId)?.performance?.score || 0)).toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">índice de salud financiera</p>
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
                            <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ position: 'right', value: 'Nula', fill: '#ef4444', fontSize: 9 }} />
                            <ReferenceLine y={40} stroke="#f97316" strokeDasharray="3 3" opacity={0.5} label={{ position: 'right', value: 'Baja', fill: '#f97316', fontSize: 9 }} />
                            <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.5} label={{ position: 'right', value: 'Estándar', fill: '#3b82f6', fontSize: 9 }} />
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
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />
                                <div>
                                    <p className="text-[11px] font-bold text-green-400">Muy Rentable (60-100)</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">Salones con alta contribución y score optimizado.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                                <div>
                                    <p className="text-[11px] font-bold text-blue-400">Estándar (40-60)</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">Performance alineada con el promedio de la red.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1" />
                                <div>
                                    <p className="text-[11px] font-bold text-orange-400">Baja Rentabilidad (5-40)</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">Requiere revisión de costos o impulsos comerciales.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1" />
                                <div>
                                    <p className="text-[11px] font-bold text-red-400">Nula Rentabilidad (&lt; 5)</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">Situación crítica. Revisión inmediata de contrato.</p>
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

            {/* Situation Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* High Efficiency */}
                <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[320px]">
                    <div className="p-4 border-b border-green-500/20 bg-green-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="text-[11px] font-black text-green-400 uppercase tracking-widest">Alta Eficiencia</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] font-bold text-green-500 border border-green-500/20">
                            {groupedSalones.efficient.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                        {groupedSalones.efficient.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedSalonId === s.id_salon ? "bg-green-500/10 border-green-500/30" : "bg-slate-900/60 border-white/5 hover:border-green-500/20"}`}>
                                <span className="text-[11px] font-bold text-slate-200">{s.nombre_salon}</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-green-400">{s.performance?.score.toFixed(0)} pts</p>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Score</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aligned */}
                <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[320px]">
                    <div className="p-4 border-b border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                            <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Alineados</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-500 border border-blue-500/20">
                            {groupedSalones.aligned.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                        {groupedSalones.aligned.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedSalonId === s.id_salon ? "bg-blue-500/10 border-blue-500/30" : "bg-slate-900/60 border-white/5 hover:border-blue-500/20"}`}>
                                <span className="text-[11px] font-bold text-slate-200">{s.nombre_salon}</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-blue-400">{s.performance?.score.toFixed(0)} pts</p>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Estandar</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* High Risk */}
                <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[320px]">
                    <div className="p-4 border-b border-red-500/20 bg-red-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                            <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Críticos</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-[10px] font-bold text-red-500 border border-red-500/20">
                            {groupedSalones.critical.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                        {groupedSalones.critical.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedSalonId === s.id_salon ? "bg-red-500/10 border-red-500/30" : "bg-slate-900/60 border-white/5 hover:border-red-500/20"}`}>
                                <span className="text-[11px] font-bold text-slate-200">{s.nombre_salon}</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-red-400">{s.performance?.score.toFixed(0)} pts</p>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Análisis</p>
                                </div>
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
