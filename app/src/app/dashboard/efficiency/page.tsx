"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Gauge, Info } from "lucide-react";
import { formatPercentage } from "@/lib/formatters";
import { getSemaphoreColor, TIER_DEFINITIONS } from "@/lib/calculations";
import { getSalonesData } from "@/lib/sample-data";
import { useDashboard } from "@/components/DashboardContext";

export default function EfficiencyPage() {
    const { selectedYear, setSelectedYear, availableYears } = useDashboard();
    const salones = useMemo(() => getSalonesData(selectedYear).filter((s) => s.estado_salon === "ACTIVO"), [selectedYear]);

    const salonesWithEfficiency = salones.filter((s) => s.efficiency);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Eficiencia de Activos</h1>
                    <p className="text-slate-400 text-sm mt-1">Índice Global de Eficiencia — PAX & $m² vs Mediana del Tier</p>
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

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300/80">
                    <p>Índice Global = promedio(Ratio PAX, Ratio $m²). Un valor de <strong>1.0</strong> = equilibrio de mercado del Tier.</p>
                    <p className="mt-1">Un índice alto no implica ineficiencia si el volumen de ventas absorbe el costo.</p>
                </div>
            </div>

            {/* Threshold Legend */}
            <div className="flex flex-wrap gap-4">
                {[
                    { label: "< 1.0 — Eficiente", color: "#22c55e" },
                    { label: "1.0 — Equilibrio", color: "#eab308" },
                    { label: "1.0 - 1.25 — Atención", color: "#eab308" },
                    { label: "> 1.25 — Renegociar", color: "#ef4444" },
                ].map((t) => (
                    <span key={t.label} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                        {t.label}
                    </span>
                ))}
            </div>

            {/* Gauge Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {salonesWithEfficiency
                    .sort((a, b) => (b.efficiency?.globalIndex || 0) - (a.efficiency?.globalIndex || 0))
                    .map((salon, idx) => {
                        const eff = salon.efficiency!;
                        const color = getSemaphoreColor(eff.color);
                        // Gauge angle: 0 = left (efficient), 180 = right (renegotiate). Map 0-2 index to 0-180.
                        const gaugeAngle = Math.min(180, (eff.globalIndex / 2) * 180);

                        return (
                            <motion.div
                                key={`${salon.id_salon}-${salon.year}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-card p-5"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{salon.nombre_salon}</p>
                                        <p className="text-[11px] text-slate-500">Tier {salon.tier} — {TIER_DEFINITIONS[salon.tier]?.name}</p>
                                    </div>
                                    <span className="semaphore-dot" style={{ backgroundColor: color }} />
                                </div>

                                {/* Simple Gauge */}
                                <div className="flex justify-center mb-4">
                                    <svg width="140" height="80" viewBox="0 0 140 80">
                                        {/* Background arc */}
                                        <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                                        {/* Green zone */}
                                        <path d="M 10 70 A 60 60 0 0 1 70 10" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                                        {/* Yellow zone */}
                                        <path d="M 70 10 A 60 60 0 0 1 105 28" fill="none" stroke="#eab308" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                                        {/* Red zone */}
                                        <path d="M 105 28 A 60 60 0 0 1 130 70" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                                        {/* Needle */}
                                        <line
                                            x1="70" y1="70"
                                            x2={70 + 50 * Math.cos((Math.PI * (180 - gaugeAngle)) / 180)}
                                            y2={70 - 50 * Math.sin((Math.PI * (180 - gaugeAngle)) / 180)}
                                            stroke={color} strokeWidth="3" strokeLinecap="round"
                                        />
                                        <circle cx="70" cy="70" r="5" fill={color} />
                                        {/* Value */}
                                        <text x="70" y="65" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                                            {eff.globalIndex.toFixed(2)}
                                        </text>
                                    </svg>
                                </div>

                                {/* Ratios */}
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="glass-card-light p-2">
                                        <p className="text-[10px] text-slate-500 uppercase">Ratio PAX</p>
                                        <p className="text-sm font-bold text-white">{eff.paxRatio.toFixed(2)}</p>
                                    </div>
                                    <div className="glass-card-light p-2">
                                        <p className="text-[10px] text-slate-500 uppercase">Ratio $m²</p>
                                        <p className="text-sm font-bold text-white">{eff.mt2Ratio.toFixed(2)}</p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
            </div>

            {/* Summary Table */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Resumen por Salón</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/50">
                            <th className="text-left py-3 px-3 text-slate-400">Salón</th>
                            <th className="text-center py-3 px-3 text-slate-400">Tier</th>
                            <th className="text-right py-3 px-3 text-slate-400">Ratio PAX</th>
                            <th className="text-right py-3 px-3 text-slate-400">Ratio $m²</th>
                            <th className="text-right py-3 px-3 text-slate-400">Índice Global</th>
                            <th className="text-center py-3 px-3 text-slate-400">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salonesWithEfficiency
                            .sort((a, b) => (a.efficiency?.globalIndex || 0) - (b.efficiency?.globalIndex || 0))
                            .map((s) => {
                                const eff = s.efficiency!;
                                const color = getSemaphoreColor(eff.color);
                                return (
                                    <tr key={`${s.id_salon}-${s.year}`} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                                        <td className="py-3 px-3 text-white font-medium">{s.nombre_salon}</td>
                                        <td className="py-3 px-3 text-center text-slate-400">{s.tier}</td>
                                        <td className="py-3 px-3 text-right text-white">{eff.paxRatio.toFixed(2)}</td>
                                        <td className="py-3 px-3 text-right text-white">{eff.mt2Ratio.toFixed(2)}</td>
                                        <td className="py-3 px-3 text-right font-bold" style={{ color }}>{eff.globalIndex.toFixed(2)}</td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                                                {eff.color === "green" ? "Eficiente" : eff.color === "yellow" ? "Atención" : "Renegociar"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
