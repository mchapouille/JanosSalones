"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Award, Sliders, Search, X } from "lucide-react";
import { formatARS, formatPercentage, formatMultiplier } from "@/lib/formatters";
import { getSemaphoreColor, simulateRentReduction, calcPerformance } from "@/lib/calculations";
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
        if (selectedYear !== null) return salonesResource;

        // Aggregate by id_salon
        const aggregatedMap = new Map<number, any>();
        salonesResource.forEach(s => {
            if (!aggregatedMap.has(s.id_salon)) {
                aggregatedMap.set(s.id_salon, { ...s, count: 1 });
            } else {
                const existing = aggregatedMap.get(s.id_salon);
                existing.ventas_totales_salon = (existing.ventas_totales_salon || 0) + (s.ventas_totales_salon || 0);
                existing.costos_fijos_salon = (existing.costos_fijos_salon || 0) + (s.costos_fijos_salon || 0);
                existing.costos_variables_salon = (existing.costos_variables_salon || 0) + (s.costos_variables_salon || 0);
                existing.count += 1;
            }
        });

        return Array.from(aggregatedMap.values()).map(s => {
            const avgVentas = s.ventas_totales_salon / s.count;
            const avgFijos = s.costos_fijos_salon / s.count;
            const avgVariables = s.costos_variables_salon / s.count;

            // Recalculate performance with averages
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
    const [rentReduction, setRentReduction] = useState(0);
    const [selectedSalon, setSelectedSalon] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Update selected salon if it's not in the filtered list
    useEffect(() => {
        if (salones.length > 0 && (!selectedSalon || !salones.find(s => s.id_salon === selectedSalon))) {
            setSelectedSalon(salones[0].id_salon);
        }
    }, [salones, selectedSalon]);

    // Data for ScatterChart: Facturación (X) vs Alquiler (Y)
    const chartData = useMemo(() => {
        return salones
            .filter((s) => s.performance)
            .map((s) => {
                const isFiltered = searchTerm === "" || s.nombre_salon.toLowerCase().includes(searchTerm.toLowerCase());
                return {
                    id: s.id_salon,
                    name: s.nombre_salon,
                    x: s.ventas_totales_salon || 0,
                    y: s.costos_fijos_salon || 0,
                    z: 1,
                    incidencia: s.performance?.rentIncidence || 0,
                    color: getSemaphoreColor(s.performance?.color || "gray"),
                    isFiltered
                };
            });
    }, [salones, searchTerm]);

    // Categorization by situation (also filtered by search)
    const groupedSalones = useMemo(() => {
        const filtered = chartData.filter(s => s.isFiltered);
        return {
            efficient: filtered.filter(s => s.incidencia < 12).sort((a, b) => a.incidencia - b.incidencia),
            aligned: filtered.filter(s => s.incidencia >= 12 && s.incidencia <= 18).sort((a, b) => a.incidencia - b.incidencia),
            critical: filtered.filter(s => s.incidencia > 18).sort((a, b) => b.incidencia - a.incidencia),
        };
    }, [chartData]);

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
    const simSalon = salones.find((s) => s.id_salon === selectedSalon);
    const simulation = simSalon
        ? simulateRentReduction(
            simSalon.costos_fijos_salon || 0,
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
                    <p className="text-slate-400 text-sm mt-1">Análisis de Rentabilidad Mensualizada</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar salón..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 w-[200px] md:w-[300px] transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
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

            {/* Alert Cards */}
            {alertSalones.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
                >
                    <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-400">
                            {alertSalones.length} salón(es) con incidencia de alquiler superior al 25%
                        </p>
                        <p className="text-xs text-red-400/70 mt-1">
                            {alertSalones.map((s) => s.nombre_salon).join(", ")}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Revenue vs Rent Scatter Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
                <div className="lg:col-span-3 h-[450px] relative glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-400" />
                            Matriz de Performance: Facturación vs Alquiler
                        </h2>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">
                            Referencia Benchmark: 15% Incidencia
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
                                name="Facturación"
                                stroke="#475569"
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`}
                                label={{ value: 'Facturación Mensual ($)', position: 'bottom', offset: 20, fill: '#64748b', fontSize: 12 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                name="Alquiler"
                                stroke="#475569"
                                tick={{ fill: "#94a3b8", fontSize: 11 }}
                                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                                label={{ value: 'Alquiler ($)', angle: -90, position: 'left', offset: 0, fill: '#64748b', fontSize: 12 }}
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
                                                        <span className="text-[10px] text-slate-500 uppercase">Facturación:</span>
                                                        <span className="text-[10px] font-bold text-blue-400">{formatARS(data.x)}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-[10px] text-slate-500 uppercase">Alquiler:</span>
                                                        <span className="text-[10px] font-bold text-slate-300">{formatARS(data.y)}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4 pt-1 border-t border-white/5">
                                                        <span className="text-[10px] text-slate-500 uppercase">Incidencia:</span>
                                                        <span className={`text-[10px] font-bold ${data.incidencia > 18 ? "text-red-400" : data.incidencia < 12 ? "text-green-400" : "text-yellow-400"}`}>
                                                            {data.incidencia.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            {/* 15% Benchmark Line */}
                            <ReferenceLine
                                segment={[{ x: 0, y: 0 }, { x: 120000000, y: 18000000 }]}
                                stroke="#3b82f6"
                                strokeWidth={1}
                                strokeDasharray="5 5"
                                label={{ position: 'top', value: 'Límite 15%', fill: '#3b82f6', fontSize: 10, offset: 10 }}
                            />
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
                                        onClick={() => entry.isFiltered && setSelectedSalon(entry.id)}
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
                        <div className="space-y-5">
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />
                                <div>
                                    <p className="text-[11px] font-bold text-green-400">Eficiencia Máxima</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">Incidencia &lt; 12%. Operación altamente rentable.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                                <div>
                                    <p className="text-[11px] font-bold text-blue-400">Alineación</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">Rango 12-18%. Estructura de costos equilibrada.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1" />
                                <div>
                                    <p className="text-[11px] font-bold text-red-400">Riesgo Operativo</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">Incidencia &gt; 18%. Requiere revisión urgente.</p>
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
                            <div key={s.id} onClick={() => setSelectedSalon(s.id)} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedSalon === s.id ? "bg-green-500/10 border-green-500/30" : "bg-slate-900/60 border-white/5 hover:border-green-500/20"}`}>
                                <span className="text-[11px] font-bold text-slate-200">{s.name}</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-green-400">{s.incidencia.toFixed(1)}%</p>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Incidencia</p>
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
                            <div key={s.id} onClick={() => setSelectedSalon(s.id)} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedSalon === s.id ? "bg-blue-500/10 border-blue-500/30" : "bg-slate-900/60 border-white/5 hover:border-blue-500/20"}`}>
                                <span className="text-[11px] font-bold text-slate-200">{s.name}</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-blue-400">{s.incidencia.toFixed(1)}%</p>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Equilibrio</p>
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
                            <div key={s.id} onClick={() => setSelectedSalon(s.id)} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedSalon === s.id ? "bg-red-500/10 border-red-500/30" : "bg-slate-900/60 border-white/5 hover:border-red-500/20"}`}>
                                <span className="text-[11px] font-bold text-slate-200">{s.name}</span>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-red-400">{s.incidencia.toFixed(1)}%</p>
                                    <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Sobrecosto</p>
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
                        Top 5 Aporte al Margen
                    </h3>
                    <div className="space-y-2">
                        {top5Margin.map((s, i) => (
                            <div key={s.id_salon} className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">
                                    <span className="text-slate-600 mr-2">{i + 1}.</span>
                                    {s.nombre_salon}
                                </span>
                                <span className="text-green-400 font-medium">
                                    {formatARS(s.performance?.marginContribution || 0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top 5 Return */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-400" />
                        Top 5 Retorno por $1
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
                        Top 5 Mayor Incidencia
                    </h3>
                    <div className="space-y-2">
                        {top5Risk.map((s, i) => (
                            <div key={s.id_salon} className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">
                                    <span className="text-slate-600 mr-2">{i + 1}.</span>
                                    {s.nombre_salon}
                                </span>
                                <span style={{ color: getSemaphoreColor(s.performance?.color || "gray") }} className="font-medium">
                                    {formatPercentage(s.performance?.rentIncidence || 0)}
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
                            <label className="text-sm text-slate-400 mb-2 block">Seleccionar Salón</label>
                            <select
                                value={selectedSalon ?? ""}
                                onChange={(e) => setSelectedSalon(parseInt(e.target.value))}
                                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
                            >
                                {salones
                                    .filter(s => searchTerm === "" || s.nombre_salon.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((s) => (
                                        <option key={s.id_salon} value={s.id_salon}>{s.nombre_salon}</option>
                                    ))}
                            </select>
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
                                    <p className="text-xs text-slate-500">Nueva Incidencia</p>
                                    <p className="text-lg font-bold" style={{ color: simulation.newIncidence > 25 ? "#ef4444" : simulation.newIncidence > 15 ? "#eab308" : "#22c55e" }}>
                                        {formatPercentage(simulation.newIncidence)}
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
        </div>
    );
}
