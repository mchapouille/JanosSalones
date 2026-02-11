"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Award, Sliders } from "lucide-react";
import { formatARS, formatPercentage, formatMultiplier } from "@/lib/formatters";
import { getSemaphoreColor, simulateRentReduction } from "@/lib/calculations";
import { getSalonesData } from "@/lib/sample-data";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts";

export default function PerformancePage() {
    const salones = useMemo(() => getSalonesData().filter((s) => s.estado_salon === "ACTIVO"), []);
    const [rentReduction, setRentReduction] = useState(0);
    const [selectedSalon, setSelectedSalon] = useState(salones[0]?.id_salon || null);

    // Sort by rent incidence descending for chart
    const chartData = useMemo(() => {
        return salones
            .filter((s) => s.performance)
            .sort((a, b) => (b.performance?.rentIncidence || 0) - (a.performance?.rentIncidence || 0))
            .map((s) => ({
                name: s.nombre_salon.length > 15 ? s.nombre_salon.slice(0, 15) + "…" : s.nombre_salon,
                fullName: s.nombre_salon,
                facturacion: s.ventas_totales_salon || 0,
                alquiler: s.costos_fijos_salon || 0,
                incidencia: s.performance?.rentIncidence || 0,
                color: getSemaphoreColor(s.performance?.color || "gray"),
            }));
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
            <div>
                <h1 className="text-2xl font-bold text-white">Performance</h1>
                <p className="text-slate-400 text-sm mt-1">Análisis de Rentabilidad Mensualizada</p>
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

            {/* Revenue vs Rent Chart */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-400" />
                    Facturación vs Alquiler por Salón
                </h2>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: "#94a3b8", fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={0}
                                tickMargin={10}
                            />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                            <Tooltip
                                contentStyle={{ background: "#0f172a", border: "1px solid #1e3a8a40", borderRadius: 12, color: "#e2e8f0" }}
                                formatter={(value: any) => formatARS(Number(value))}
                                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                            />
                            <Legend />
                            <Bar dataKey="facturacion" name="Facturación" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="alquiler" name="Alquiler" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
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

            {/* Full Table */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Detalle Completo</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left py-3 px-3 text-slate-400 font-medium">Salón</th>
                                <th className="text-left py-3 px-3 text-slate-400 font-medium">Tier</th>
                                <th className="text-right py-3 px-3 text-slate-400 font-medium">Facturación</th>
                                <th className="text-right py-3 px-3 text-slate-400 font-medium">Alquiler</th>
                                <th className="text-right py-3 px-3 text-slate-400 font-medium">Incidencia</th>
                                <th className="text-right py-3 px-3 text-slate-400 font-medium">Retorno</th>
                                <th className="text-center py-3 px-3 text-slate-400 font-medium">Clasificación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salones
                                .sort((a, b) => (a.performance?.rentIncidence || 0) - (b.performance?.rentIncidence || 0))
                                .map((s) => (
                                    <tr key={s.id_salon} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                                        <td className="py-3 px-3 text-white font-medium">{s.nombre_salon}</td>
                                        <td className="py-3 px-3 text-slate-400">{s.tier}</td>
                                        <td className="py-3 px-3 text-right text-white">{formatARS(s.ventas_totales_salon || 0)}</td>
                                        <td className="py-3 px-3 text-right text-slate-300">{formatARS(s.costos_fijos_salon || 0)}</td>
                                        <td className="py-3 px-3 text-right font-medium" style={{ color: getSemaphoreColor(s.performance?.color || "gray") }}>
                                            {s.performance ? formatPercentage(s.performance.rentIncidence) : "—"}
                                        </td>
                                        <td className="py-3 px-3 text-right text-blue-400">
                                            {s.performance ? formatMultiplier(s.performance.multiplier) : "—"}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {s.performance && (
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                                    style={{
                                                        background: `${getSemaphoreColor(s.performance.color)}15`,
                                                        color: getSemaphoreColor(s.performance.color),
                                                        border: `1px solid ${getSemaphoreColor(s.performance.color)}30`,
                                                    }}
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: getSemaphoreColor(s.performance.color) }} />
                                                    {s.performance.classification === "alta_eficiencia" ? "Alta Eficiencia" :
                                                        s.performance.classification === "normal" ? "Normal" :
                                                            s.performance.classification === "riesgo" ? "Riesgo" : "Riesgo Crítico"}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
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
                                {salones.map((s) => (
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
