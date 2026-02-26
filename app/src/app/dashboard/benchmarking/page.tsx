"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Search, X, ChevronDown } from "lucide-react";
import { formatARS, formatPercentage } from "@/lib/formatters";
import { BENCHMARK_DATA, TIER_DEFINITIONS, getSemaphoreColor } from "@/lib/calculations";
import { useDashboard } from "@/components/DashboardContext";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ScatterChart, Scatter, ZAxis, ReferenceLine, Cell,
} from "recharts";

const TIER_COLORS: Record<number, string> = {
    1: "#64748b", 2: "#3b82f6", 3: "#8b5cf6", 4: "#06b6d4", 5: "#22c55e",
};

export default function BenchmarkingPage() {
    const { salones: allSalones } = useDashboard();
    const [searchTerm, setSearchTerm] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);

    // Active salons only
    const salones = useMemo(() => allSalones.filter((s) => s.estado_salon === "ACTIVO"), [allSalones]);

    // Salon benchmarks — Tier 2+ only (Tier 1 excluded from scatter/lists)
    const salonBenchmarks = useMemo(() =>
        salones
            .filter((s: any) => s.benchmark && s.tier >= 2)
            .map((s: any) => ({
                id: s.id_salon,
                name: s.nombre_salon,
                tier: s.tier,
                costPerMt2: s.benchmark!.costPerMt2 ?? 0,
                marketCost: s.benchmark!.marketCostPerMt2 ?? 0,
                deviation: s.benchmark!.deviation ?? 0,
                color: getSemaphoreColor(s.benchmark!.color),
                isFiltered: searchTerm === "" || s.nombre_salon.toLowerCase().includes(searchTerm.toLowerCase()),
            }))
            .sort((a: any, b: any) => b.deviation - a.deviation),
        [salones, searchTerm]
    );

    const selectedSalon = useMemo(() =>
        selectedSalonId != null ? salonBenchmarks.find(s => s.id === selectedSalonId) ?? null : null,
        [salonBenchmarks, selectedSalonId]
    );

    // Per-group sorted by |deviation| desc (highest % first)
    const groupedBenchmarks = useMemo(() => {
        const byAbs = (a: typeof salonBenchmarks[0], b: typeof salonBenchmarks[0]) =>
            Math.abs(b.deviation) - Math.abs(a.deviation);
        return {
            efficient: [...salonBenchmarks.filter(b => b.deviation <= 0)].sort(byAbs),
            aligned: [...salonBenchmarks.filter(b => b.deviation > 0 && b.deviation <= 50)].sort(byAbs),
            critical: [...salonBenchmarks.filter(b => b.deviation > 50)].sort(byAbs),
        };
    }, [salonBenchmarks]);

    // Search dropdown suggestions
    const suggestions = useMemo(() =>
        searchTerm.length > 0
            ? salonBenchmarks.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8)
            : [],
        [salonBenchmarks, searchTerm]
    );

    const handleSelectSalon = (s: typeof salonBenchmarks[0]) => {
        setSelectedSalonId(prev => prev === s.id ? null : s.id);
        setSearchTerm(s.name);
        setShowDropdown(false);
    };

    const clearSelection = () => {
        setSelectedSalonId(null);
        setSearchTerm("");
        setShowDropdown(false);
    };

    // KPI
    const avgReal = salonBenchmarks.length > 0
        ? salonBenchmarks.reduce((acc, s) => acc + s.costPerMt2, 0) / salonBenchmarks.length
        : 0;
    const avgDev = salonBenchmarks.length > 0
        ? salonBenchmarks.reduce((acc, s) => acc + s.deviation, 0) / salonBenchmarks.length
        : 0;

    // Tier comparison bar chart (all tiers, from BENCHMARK_DATA)
    const tierComparison = Object.entries(BENCHMARK_DATA).map(([tier, data]) => ({
        tier: `Tier ${tier}`,
        promedioReal: data.promedioReal,
        promedioMercado: data.promedioMercado,
        desvio: data.desvio,
        estado: data.estado,
    }));

    // ZAxis size: selected gets larger dot
    const salonBenchmarksWithSize = useMemo(() =>
        salonBenchmarks.map(s => ({
            ...s,
            dotSize: s.id === selectedSalonId ? 220 : 70,
        })),
        [salonBenchmarks, selectedSalonId]
    );

    return (
        <div className="space-y-6">

            {/* Header + Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Benchmarking</h1>
                    <p className="text-slate-400 text-sm mt-1">Comparación $/m² vs Mercado (Zonaprop / Argenprop)</p>
                </div>

                {/* Salon search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                    <input
                        type="text"
                        placeholder="Buscar salón para comparar..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); setSelectedSalonId(null); }}
                        onFocus={() => setShowDropdown(true)}
                        className="bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 w-[260px] transition-all"
                    />
                    {searchTerm ? (
                        <button onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                            <X size={14} />
                        </button>
                    ) : (
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    )}
                    {/* Dropdown */}
                    <AnimatePresence>
                        {showDropdown && suggestions.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                            >
                                {suggestions.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => handleSelectSalon(s)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center justify-between transition-colors"
                                    >
                                        <span>{s.name}</span>
                                        <span className="text-[10px] text-slate-500 font-bold">Tier {s.tier}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Individual Salon Compare Panel ── */}
            <AnimatePresence>
                {selectedSalon && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }}
                        className="glass-card p-6 border border-blue-500/20 bg-blue-500/3 overflow-hidden"
                    >
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <p className="text-[10px] text-blue-400 uppercase font-black tracking-wider mb-1">Análisis Individual</p>
                                <h2 className="text-xl font-bold text-white">{selectedSalon.name}</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Tier {selectedSalon.tier} · $/m² real vs referencia de mercado zonal</p>
                            </div>
                            <button onClick={clearSelection} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "Real $/m²", value: formatARS(selectedSalon.costPerMt2), sub: "Costo real del salón", colorClass: "text-white", bg: "bg-white/5 border-white/5" },
                                { label: "Mercado $/m²", value: formatARS(selectedSalon.marketCost), sub: `Referencia Tier ${selectedSalon.tier}`, colorClass: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/10" },
                                {
                                    label: "Desvío",
                                    value: `${selectedSalon.deviation > 0 ? "+" : ""}${formatPercentage(selectedSalon.deviation)}`,
                                    sub: selectedSalon.deviation > 50 ? "Sobrecosto crítico" : selectedSalon.deviation > 0 ? "Sobre mercado" : "Bajo mercado",
                                    colorClass: selectedSalon.deviation > 50 ? "text-red-400" : selectedSalon.deviation > 0 ? "text-yellow-400" : "text-green-400",
                                    bg: selectedSalon.deviation > 50 ? "bg-red-500/5 border-red-500/10" : selectedSalon.deviation > 0 ? "bg-yellow-500/5 border-yellow-500/10" : "bg-green-500/5 border-green-500/10",
                                },
                            ].map(card => (
                                <div key={card.label} className={`p-4 rounded-2xl border text-center ${card.bg}`}>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">{card.label}</p>
                                    <p className={`text-2xl font-black ${card.colorClass}`}>{card.value}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">{card.sub}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Salones Analizados</p>
                    <p className="text-3xl font-bold text-white">{salonBenchmarks.length}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        De {salones.length} activos {salones.length > salonBenchmarks.length && <span className="text-amber-400 font-bold ml-1">({salones.length - salonBenchmarks.length} sin info / Tier 1)</span>}
                    </p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Promedio Real $/m²</p>
                    <p className="text-3xl font-bold text-blue-400">
                        {avgReal > 0 ? formatARS(avgReal) : <span className="text-slate-600">—</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">valor medio de la red</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Desvío Promedio</p>
                    <p className="text-3xl font-bold" style={{ color: avgDev > 0 ? "#ef4444" : "#22c55e" }}>
                        {avgDev !== 0 ? `${avgDev > 0 ? "+" : ""}${formatPercentage(avgDev)}` : <span className="text-slate-600">—</span>}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">vs mercado zonal</p>
                </motion.div>
            </div>

            {/* ── Pirámide Tier 2–5 ── */}
            <div className="glass-card p-6">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-400" />
                    Pirámide de Tiers — Segmentos Benchmarkeados
                </h2>
                <div className="space-y-2">
                    {[2, 3, 4, 5].map((tier, idx) => {
                        const def = TIER_DEFINITIONS[tier];
                        const benchmark = BENCHMARK_DATA[tier];
                        const count = salones.filter(s => s.tier === tier).length;
                        const color = TIER_COLORS[tier];
                        const widths = ["88%", "72%", "56%", "42%"];
                        return (
                            <motion.div
                                key={tier}
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}
                                style={{ width: widths[idx] }}
                                className="rounded-lg overflow-hidden"
                            >
                                <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: `${color}10`, border: `1px solid ${color}22` }}>
                                    {/* Tier badge */}
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs" style={{ background: `${color}18`, color }}>
                                        T{tier}
                                    </div>
                                    {/* Name + examples */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white leading-tight">{def?.name}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{def?.examples?.join(", ")}</p>
                                    </div>
                                    {/* Stats */}
                                    <div className="flex items-center gap-5 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white">{count}</p>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-wide">salones</p>
                                        </div>
                                        {benchmark && (
                                            <div className="text-right w-14">
                                                <p className="text-sm font-bold" style={{ color: benchmark.desvio <= 0 ? "#22c55e" : "#ef4444" }}>
                                                    {benchmark.desvio > 0 ? "+" : ""}{formatPercentage(benchmark.desvio)}
                                                </p>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-wide">desvío</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ── Bar Chart Real vs Mercado ── */}
            <div className="glass-card p-6">
                <h2 className="text-base font-semibold text-white mb-4">$/m² Promedio: Real vs Mercado por Tier</h2>
                <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tierComparison} barGap={4} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="tier" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ background: "#0f172a", border: "1px solid #1e3a8a40", borderRadius: 12, color: "#e2e8f0" }}
                                formatter={(value: any) => value !== undefined ? formatARS(Number(value)) : ""}
                            />
                            <Bar dataKey="promedioReal" name="Costo Real /m²" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="promedioMercado" name="Mercado /m²" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Tier Table ── */}
            <div className="glass-card p-6 overflow-x-auto">
                <h2 className="text-base font-semibold text-white mb-4">Comparativa por Tier</h2>
                <table className="w-full text-sm min-w-[500px]">
                    <thead>
                        <tr className="border-b border-white/5">
                            {["Segmento", "Real /m²", "Mercado /m²", "Desvío", "Estado"].map((h, i) => (
                                <th key={h} className={`py-3 px-4 text-slate-500 uppercase text-[10px] font-bold tracking-wider ${i === 0 ? "text-left" : i === 1 || i === 2 ? "text-right" : "text-center"}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tierComparison.map(t => (
                            <tr key={t.tier} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4 text-white font-bold">{t.tier}</td>
                                <td className="py-3 px-4 text-right text-slate-100 font-medium">{formatARS(t.promedioReal)}</td>
                                <td className="py-3 px-4 text-right text-blue-400 font-medium">{formatARS(t.promedioMercado)}</td>
                                <td className="py-3 px-4 text-center font-bold" style={{ color: t.desvio <= 0 ? "#22c55e" : "#ef4444" }}>
                                    {t.desvio > 0 ? "+" : ""}{formatPercentage(t.desvio)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                                        style={{ background: t.estado === "Eficiente" ? "#22c55e15" : "#ef444415", color: t.estado === "Eficiente" ? "#22c55e" : "#ef4444", border: `1px solid ${t.estado === "Eficiente" ? "#22c55e30" : "#ef444430"}` }}>
                                        {t.estado}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Strategic Scatter ── */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-base font-semibold text-white">Análisis Estratégico de Activos</h2>
                        <p className="text-xs text-slate-500 mt-1">Dispersión Costo Real vs Referencia de Mercado · Click para seleccionar salón</p>
                    </div>
                    {selectedSalonId && (
                        <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 transition-colors">
                            <X size={11} /> Deseleccionar
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                    <div className="lg:col-span-3 h-[420px] relative">
                        <div className="absolute top-3 right-3 text-[9px] font-black text-red-500/25 uppercase tracking-widest pointer-events-none px-2 py-1 rounded-md border border-red-500/5 bg-red-500/5">SOBRE-MERCADO</div>
                        <div className="absolute bottom-10 left-14 text-[9px] font-black text-green-500/25 uppercase tracking-widest pointer-events-none px-2 py-1 rounded-md border border-green-500/5 bg-green-500/5">BAJO-MERCADO</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis type="number" dataKey="marketCost" name="Mercado /m²" stroke="#475569"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    label={{ value: "Mercado ($/m²)", position: "bottom", offset: 0, fill: "#64748b", fontSize: 12 }}
                                    domain={["auto", "auto"]}
                                />
                                <YAxis type="number" dataKey="costPerMt2" name="Real /m²" stroke="#475569"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    label={{ value: "Real ($/m²)", angle: -90, position: "left", fill: "#64748b", fontSize: 12 }}
                                    domain={["auto", "auto"]}
                                />
                                <ZAxis type="number" dataKey="dotSize" range={[70, 220]} />
                                <Tooltip cursor={{ strokeDasharray: "3 3" }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl text-left">
                                                <p className="text-sm font-bold text-white mb-2">{d.name}</p>
                                                <div className="space-y-1 border-t border-white/5 pt-2">
                                                    {[
                                                        ["Real", formatARS(d.costPerMt2), "text-white"],
                                                        ["Mercado", formatARS(d.marketCost), "text-blue-400"],
                                                        ["Desvío", `${d.deviation > 0 ? "+" : ""}${d.deviation.toFixed(1)}%`, d.deviation > 0 ? "text-red-400" : "text-green-400"],
                                                    ].map(([k, v, cls]) => (
                                                        <div key={k as string} className="flex justify-between gap-4">
                                                            <span className="text-[10px] text-slate-500 uppercase">{k}:</span>
                                                            <span className={`text-[10px] font-bold ${cls}`}>{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                                <ReferenceLine
                                    segment={[{ x: 0, y: 0 }, { x: 999999, y: 999999 }]}
                                    stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5"
                                    label={{ position: "top", value: "Paridad", fill: "#3b82f6", fontSize: 10 }}
                                />
                                <Scatter
                                    name="Salones"
                                    data={salonBenchmarksWithSize}
                                    onClick={(data: any) => setSelectedSalonId(prev => prev === data.id ? null : data.id)}
                                    className="cursor-pointer"
                                >
                                    {salonBenchmarksWithSize.map((entry, i) => {
                                        const isSel = entry.id === selectedSalonId;
                                        const hasSel = selectedSalonId !== null;
                                        const opacity = hasSel ? (isSel ? 1 : 0.08) : 0.75;
                                        return (
                                            <Cell
                                                key={`c-${i}`}
                                                fill={entry.color}
                                                stroke={isSel ? "#fff" : entry.color}
                                                strokeWidth={isSel ? 2.5 : 0}
                                                fillOpacity={opacity}
                                                strokeOpacity={isSel ? 1 : 0}
                                            />
                                        );
                                    })}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 self-start">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Guía</h3>
                        <div className="space-y-4">
                            {[
                                { color: "bg-green-500", label: "Eficiencia Máxima", desc: "Costo real por debajo del mercado zonal." },
                                { color: "bg-yellow-500", label: "Alineación", desc: "Desvío tolerable vs referencia." },
                                { color: "bg-red-500", label: "Sobrecosto", desc: "Requiere revisión de contrato." },
                            ].map((g, i) => (
                                <div key={g.label} className={`flex gap-2.5 ${i > 0 ? "pt-3 border-t border-white/5" : ""}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${g.color} mt-1 flex-shrink-0`} />
                                    <div>
                                        <p className="text-[11px] font-bold" style={{ color: g.color.includes("green") ? "#4ade80" : g.color.includes("yellow") ? "#facc15" : "#f87171" }}>{g.label}</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">{g.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Group Lists ── */}
                <div className="border-t border-white/5 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { key: "efficient" as const, label: "Eficiencia Máxima", color: "#22c55e", glow: "rgba(34,197,94,0.4)", sub: "Bajo Mercado", pct: (d: number) => formatPercentage(d), prefix: "" },
                            { key: "aligned" as const, label: "Alineados", color: "#eab308", glow: "rgba(234,179,8,0.4)", sub: "Desvío tolerable", pct: (d: number) => formatPercentage(d), prefix: "+" },
                            { key: "critical" as const, label: "Sobrecosto Crítico", color: "#ef4444", glow: "rgba(239,68,68,0.4)", sub: "Fuerte Desvío", pct: (d: number) => formatPercentage(d), prefix: "+" },
                        ].map(({ key, label, color, glow, sub, pct, prefix }) => (
                            <div key={key} className="glass-card !bg-slate-900/40 overflow-hidden flex flex-col h-[260px]">
                                <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ background: `${color}08`, borderBottom: `1px solid ${color}20` }}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${glow}` }} />
                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background: `${color}10`, color, borderColor: `${color}30` }}>
                                        {groupedBenchmarks[key].length}
                                    </span>
                                </div>
                                <div className="p-2.5 overflow-y-auto flex-1 space-y-1.5">
                                    {groupedBenchmarks[key].length > 0 ? groupedBenchmarks[key].map(s => {
                                        const isSel = s.id === selectedSalonId;
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => handleSelectSalon(s)}
                                                className="w-full p-2.5 rounded-lg border flex items-center justify-between transition-all text-left"
                                                style={{
                                                    background: isSel ? `${color}12` : "transparent",
                                                    borderColor: isSel ? `${color}40` : "rgba(255,255,255,0.05)",
                                                }}
                                            >
                                                <span className="text-[11px] font-semibold text-slate-200 truncate mr-2">{s.name}</span>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-[10px] font-black" style={{ color }}>{prefix}{pct(s.deviation)}</p>
                                                    <p className="text-[8px] text-slate-500 uppercase">{sub}</p>
                                                </div>
                                            </button>
                                        );
                                    }) : (
                                        <div className="h-full flex items-center justify-center text-[10px] text-slate-600 italic">Sin registros</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
