"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, Info, Search, X } from "lucide-react";
import { formatARS, formatPercentage } from "@/lib/formatters";
import { BENCHMARK_DATA, TIER_DEFINITIONS, getSemaphoreColor, calcBenchmark } from "@/lib/calculations";
import { getSalonesData } from "@/lib/sample-data";
import { useDashboard } from "@/components/DashboardContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, ReferenceLine, Cell } from "recharts";

export default function BenchmarkingPage() {
    const { selectedYear, setSelectedYear, availableYears } = useDashboard();
    const [searchTerm, setSearchTerm] = useState("");
    const salonesResource = useMemo(() => getSalonesData(selectedYear).filter((s) => s.estado_salon === "ACTIVO"), [selectedYear]);

    const salones = useMemo(() => {
        if (selectedYear !== null) return salonesResource;

        const aggregatedMap = new Map<number, any>();
        salonesResource.forEach(s => {
            if (!aggregatedMap.has(s.id_salon)) {
                aggregatedMap.set(s.id_salon, { ...s, count: 1 });
            } else {
                const existing = aggregatedMap.get(s.id_salon);
                existing.costos_fijos_salon = (existing.costos_fijos_salon || 0) + (s.costos_fijos_salon || 0);
                existing.count += 1;
            }
        });

        return Array.from(aggregatedMap.values()).map(s => {
            const avgFijos = s.costos_fijos_salon / s.count;
            const benchmark = calcBenchmark(avgFijos, s.mt2_salon || 0, s.tier);
            return {
                ...s,
                costos_fijos_salon: avgFijos,
                benchmark
            };
        });
    }, [salonesResource, selectedYear]);

    const tierComparison = Object.entries(BENCHMARK_DATA).map(([tier, data]) => ({
        tier: `Tier ${tier}`, promedioReal: data.promedioReal,
        promedioMercado: data.promedioMercado, desvio: data.desvio, estado: data.estado,
    }));

    const salonBenchmarks = useMemo(() => salones
        .filter((s: any) => s.benchmark && s.tier >= 2)
        .map((s: any) => {
            const isFiltered = searchTerm === "" || s.nombre_salon.toLowerCase().includes(searchTerm.toLowerCase());
            return {
                id: s.id_salon,
                name: s.nombre_salon,
                tier: s.tier,
                costPerMt2: s.benchmark!.costPerMt2,
                marketCost: s.benchmark!.marketCostPerMt2,
                deviation: s.benchmark!.deviation,
                color: getSemaphoreColor(s.benchmark!.color),
                isFiltered
            };
        })
        .sort((a: any, b: any) => b.deviation - a.deviation), [salones, searchTerm]);

    const groupedBenchmarks = useMemo(() => {
        const filtered = salonBenchmarks.filter(b => b.isFiltered);
        return {
            efficient: filtered.filter(b => b.deviation <= 0),
            aligned: filtered.filter(b => b.deviation > 0 && b.deviation <= 50),
            critical: filtered.filter(b => b.deviation > 50),
        };
    }, [salonBenchmarks]);

    const colors = ["#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e", "#84cc16"];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Benchmarking</h1>
                    <p className="text-slate-400 text-sm mt-1">Comparación $m² vs Mercado (Zonaprop / Argenprop)</p>
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

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300/80">
                    <p>Tasa USD→ARS: <strong className="text-blue-300">$1.470</strong>. Tier 1 excluido. Tier 2: locales comerciales {">"}100m².</p>
                </div>
            </div>

            {/* Tier Pyramid */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-400" /> Pirámide de Tiers
                </h2>
                <div className="flex flex-col items-center gap-2">
                    {[1, 2, 3, 4, 5].map((tier) => {
                        const def = TIER_DEFINITIONS[tier];
                        const benchmark = BENCHMARK_DATA[tier];
                        const salonesInTier = salones.filter((s) => s.tier === tier);
                        return (
                            <motion.div key={`${tier}-${selectedYear || 'hist'}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: tier * 0.1 }}
                                className="w-full" style={{ maxWidth: `${20 + (5 - tier) * 15 + 20}%` }}>
                                <div className="py-3 px-5 rounded-xl" style={{ background: `${colors[tier - 1]}15`, border: `1px solid ${colors[tier - 1]}30` }}>
                                    <div className="flex items-center justify-between">
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-white">Tier {tier} — {def?.name}</p>
                                            <p className="text-[11px] text-slate-500">{def?.examples.join(", ")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold" style={{ color: colors[tier - 1] }}>{salonesInTier.length} sal.</p>
                                            {benchmark && <p className="text-[11px]" style={{ color: benchmark.desvio <= 0 ? "#22c55e" : "#ef4444" }}>{benchmark.desvio > 0 ? "+" : ""}{formatPercentage(benchmark.desvio)}</p>}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Chart */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">$m² Promedio: Real vs Mercado</h2>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tierComparison} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="tier" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e3a8a40", borderRadius: 12, color: "#e2e8f0" }} formatter={(value: any) => value !== undefined ? formatARS(Number(value)) : ""} />
                            <Bar dataKey="promedioReal" name="Costo Real /m²" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="promedioMercado" name="Mercado /m²" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Comparativa por Tier</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="text-left py-3 px-3 text-slate-400">Segmento</th>
                            <th className="text-right py-3 px-3 text-slate-400">Real /m²</th>
                            <th className="text-right py-3 px-3 text-slate-400">Mercado /m²</th>
                            <th className="text-right py-3 px-3 text-slate-400">Desvío</th>
                            <th className="text-center py-3 px-3 text-slate-400">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tierComparison.map((t) => (
                            <tr key={t.tier} className="border-b border-slate-800/30">
                                <td className="py-3 px-3 text-white font-medium">{t.tier}</td>
                                <td className="py-3 px-3 text-right text-white">{formatARS(t.promedioReal)}</td>
                                <td className="py-3 px-3 text-right text-blue-400">{formatARS(t.promedioMercado)}</td>
                                <td className="py-3 px-3 text-right font-medium" style={{ color: t.desvio <= 0 ? "#22c55e" : "#ef4444" }}>
                                    {t.desvio > 0 ? "+" : ""}{formatPercentage(t.desvio)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: t.estado === "Eficiente" ? "#22c55e15" : "#ef444415", color: t.estado === "Eficiente" ? "#22c55e" : "#ef4444" }}>
                                        {t.estado}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Strategic Analysis: Scatter Plot */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Análisis Estratégico de Activos</h2>
                        <p className="text-xs text-slate-500 mt-1">Dispersión de Costo Real vs. Referencia de Mercado</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
                    <div className="lg:col-span-3 h-[450px] relative">
                        {/* Quadrant Labels */}
                        <div className="absolute top-4 right-4 text-[10px] font-black text-red-500/30 uppercase tracking-[0.2em] pointer-events-none p-2 rounded-lg border border-red-500/5 bg-red-500/5">SOBRE-MERCADO</div>
                        <div className="absolute bottom-12 left-16 text-[10px] font-black text-green-500/30 uppercase tracking-[0.2em] pointer-events-none p-2 rounded-lg border border-green-500/5 bg-green-500/5">BAJO-MERCADO</div>

                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    type="number"
                                    dataKey="marketCost"
                                    name="Mercado /m²"
                                    unit=""
                                    stroke="#475569"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    label={{ value: 'Mercado ($/m²)', position: 'bottom', offset: 0, fill: '#64748b', fontSize: 12 }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="costPerMt2"
                                    name="Real /m²"
                                    unit=""
                                    stroke="#475569"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    label={{ value: 'Real ($/m²)', angle: -90, position: 'left', fill: '#64748b', fontSize: 12 }}
                                />
                                <ZAxis type="number" dataKey="deviation" range={[100, 100]} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                                    <p className="text-sm font-bold text-white mb-2">{data.name}</p>
                                                    <div className="space-y-1.5 border-t border-white/5 pt-2">
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-[10px] text-slate-500 uppercase">Costo Real:</span>
                                                            <span className="text-[10px] font-bold text-white">{formatARS(data.costPerMt2)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-[10px] text-slate-500 uppercase">Mercado:</span>
                                                            <span className="text-[10px] font-bold text-blue-400">{formatARS(data.marketCost)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-[10px] text-slate-500 uppercase">Desvío:</span>
                                                            <span className={`text-[10px] font-bold ${data.deviation > 0 ? "text-red-400" : "text-green-400"}`}>
                                                                {data.deviation > 0 ? "+" : ""}{data.deviation.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine
                                    segment={[{ x: 0, y: 0 }, { x: 50000, y: 50000 }]}
                                    stroke="#3b82f6"
                                    strokeWidth={1}
                                    strokeDasharray="5 5"
                                    label={{ position: 'top', value: 'Paridad de Mercado', fill: '#3b82f6', fontSize: 10, offset: 10 }}
                                />
                                <Scatter name="Salones" data={salonBenchmarks}>
                                    {salonBenchmarks.map((entry: any, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            strokeWidth={2}
                                            stroke={entry.color}
                                            fillOpacity={entry.isFiltered ? 0.4 : 0.05}
                                            strokeOpacity={entry.isFiltered ? 1 : 0.1}
                                            className={`cursor-pointer transition-all ${entry.isFiltered ? "hover:fill-opacity-80" : "pointer-events-none"}`}
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Guía Estratégica</h3>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" />
                                    <div>
                                        <p className="text-[11px] font-bold text-green-400">Eficiencia Máxima</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">Costo real inferior a la referencia zonal.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-3 border-t border-white/5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1" />
                                    <div>
                                        <p className="text-[11px] font-bold text-yellow-400">Alineación</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">Desvío tolerable vs mercado.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-3 border-t border-white/5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1" />
                                    <div>
                                        <p className="text-[11px] font-bold text-red-400">Sobrecosto</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">Requiere revisión de contrato.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Situation Groups: Scrollable Boxes */}
                <div className="mt-10 border-t border-white/5 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Efficient */}
                        <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[280px]">
                            <div className="p-4 border-b border-green-500/20 bg-green-500/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    <span className="text-[11px] font-black text-green-400 uppercase tracking-widest">Eficiencia Máxima</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] font-bold text-green-500 border border-green-500/20">
                                    {groupedBenchmarks.efficient.length}
                                </span>
                            </div>
                            <div className="p-3 overflow-y-auto overflow-x-hidden flex-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                                {groupedBenchmarks.efficient.length > 0 ? groupedBenchmarks.efficient.map(s => (
                                    <div key={s.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between group hover:border-green-500/30 transition-colors">
                                        <span className="text-[11px] font-bold text-slate-200">{s.name}</span>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-green-400">{formatPercentage(s.deviation)}</p>
                                            <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Bajo Mercado</p>
                                        </div>
                                    </div>
                                )) : <div className="h-full flex items-center justify-center text-[10px] text-slate-600 italic">Sin registros</div>}
                            </div>
                        </div>

                        {/* Aligned */}
                        <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[280px]">
                            <div className="p-4 border-b border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                                    <span className="text-[11px] font-black text-yellow-400 uppercase tracking-widest">Alineados</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-[10px] font-bold text-yellow-500 border border-yellow-500/20">
                                    {groupedBenchmarks.aligned.length}
                                </span>
                            </div>
                            <div className="p-3 overflow-y-auto overflow-x-hidden flex-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                                {groupedBenchmarks.aligned.length > 0 ? groupedBenchmarks.aligned.map(s => (
                                    <div key={s.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                                        <span className="text-[11px] font-bold text-slate-200">{s.name}</span>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-yellow-500">{formatPercentage(s.deviation)}</p>
                                            <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Desvío tolerable</p>
                                        </div>
                                    </div>
                                )) : <div className="h-full flex items-center justify-center text-[10px] text-slate-600 italic">Sin registros</div>}
                            </div>
                        </div>

                        {/* Critical */}
                        <div className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[280px]">
                            <div className="p-4 border-b border-red-500/20 bg-red-500/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                    <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Sobrecosto Crítico</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-[10px] font-bold text-red-500 border border-red-500/20">
                                    {groupedBenchmarks.critical.length}
                                </span>
                            </div>
                            <div className="p-3 overflow-y-auto overflow-x-hidden flex-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                                {groupedBenchmarks.critical.length > 0 ? groupedBenchmarks.critical.map(s => (
                                    <div key={s.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between group hover:border-red-500/30 transition-colors">
                                        <span className="text-[11px] font-bold text-slate-200">{s.name}</span>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-red-400">+{formatPercentage(s.deviation)}</p>
                                            <p className="text-[8px] text-slate-500 uppercase tracking-tighter">Fuerte Desvío</p>
                                        </div>
                                    </div>
                                )) : <div className="h-full flex items-center justify-center text-[10px] text-slate-600 italic">Sin registros</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
