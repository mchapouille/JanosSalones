"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, Info } from "lucide-react";
import { formatARS, formatPercentage } from "@/lib/formatters";
import { BENCHMARK_DATA, TIER_DEFINITIONS, getSemaphoreColor } from "@/lib/calculations";
import { getSalonesData } from "@/lib/sample-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function BenchmarkingPage() {
    const salones = useMemo(() => getSalonesData().filter((s) => s.estado_salon === "ACTIVO"), []);

    const tierComparison = Object.entries(BENCHMARK_DATA).map(([tier, data]) => ({
        tier: `Tier ${tier}`, promedioReal: data.promedioReal,
        promedioMercado: data.promedioMercado, desvio: data.desvio, estado: data.estado,
    }));

    const salonBenchmarks = salones
        .filter((s) => s.benchmark && s.tier >= 2)
        .map((s) => ({ name: s.nombre_salon, tier: s.tier, costPerMt2: s.benchmark!.costPerMt2, marketCost: s.benchmark!.marketCostPerMt2, deviation: s.benchmark!.deviation, color: getSemaphoreColor(s.benchmark!.color) }))
        .sort((a, b) => b.deviation - a.deviation);

    const colors = ["#8b5cf6", "#3b82f6", "#06b6d4", "#22c55e", "#84cc16"];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Benchmarking</h1>
                <p className="text-slate-400 text-sm mt-1">Comparación $m² vs Mercado (Zonaprop / Argenprop)</p>
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
                            <motion.div key={tier} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: tier * 0.1 }}
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
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e3a8a40", borderRadius: 12, color: "#e2e8f0" }} formatter={(value: number) => formatARS(value)} />
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
                            <th className="text-right py-3 px-3 text-slate-400">Zonaprop /m²</th>
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

            {/* Individual Salon Breakdown */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Apertura Individual</h2>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salonBenchmarks} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={140} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e3a8a40", borderRadius: 12, color: "#e2e8f0" }} formatter={(value: number) => formatARS(value) as any} />
                            <Bar dataKey="costPerMt2" name="Real /m²" fill="#ef4444" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="marketCost" name="Mercado /m²" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
