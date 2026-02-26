"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, ChevronDown, X } from "lucide-react";
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
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Active salons only
    const salones = useMemo(() => allSalones.filter((s) => s.estado_salon === "ACTIVO"), [allSalones]);

    // All active salons for the dropdown (same style as Dashboard)
    const dropdownSuggestions = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return salones
            .filter(s => !q || s.nombre_salon.toLowerCase().includes(q) || String(s.id_salon).includes(q))
            .sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon));
    }, [salones, searchQuery]);

    // Salon benchmarks — all tiers (scatter shows everything, lists filter Tier 2+)
    const salonBenchmarks = useMemo(() =>
        salones
            .filter((s: any) => s.benchmark)
            .map((s: any) => ({
                id: s.id_salon,
                name: s.nombre_salon,
                tier: s.tier,
                // costPerMt2 = costos_fijos_salon / mt2_salon (from backend)
                costPerMt2: s.benchmark!.costPerMt2 ?? (s.mt2_salon > 0 ? (s.costos_fijos_salon ?? 0) / s.mt2_salon : 0),
                marketCost: s.benchmark!.marketCostPerMt2 ?? 0,
                deviation: s.benchmark!.deviation ?? 0,
                color: getSemaphoreColor(s.benchmark!.color),
            }))
            .sort((a: any, b: any) => b.deviation - a.deviation),
        [salones]
    );

    const selectedSalon = useMemo(() =>
        selectedSalonId != null ? salonBenchmarks.find(s => s.id === selectedSalonId) ?? null : null,
        [salonBenchmarks, selectedSalonId]
    );

    const selectedSalonMeta = useMemo(() =>
        selectedSalonId != null ? salones.find(s => s.id_salon === selectedSalonId) ?? null : null,
        [salones, selectedSalonId]
    );

    // Per-group (Tier 2+), sorted by |deviation| desc
    const salonBenchmarksTier2Plus = useMemo(() =>
        salonBenchmarks.filter(s => s.tier >= 2),
        [salonBenchmarks]
    );

    const groupedBenchmarks = useMemo(() => {
        const byAbs = (a: typeof salonBenchmarks[0], b: typeof salonBenchmarks[0]) =>
            Math.abs(b.deviation) - Math.abs(a.deviation);
        const arr = salonBenchmarksTier2Plus;
        return {
            efficient: [...arr.filter(b => b.deviation <= 0)].sort(byAbs),
            aligned: [...arr.filter(b => b.deviation > 0 && b.deviation <= 50)].sort(byAbs),
            critical: [...arr.filter(b => b.deviation > 50)].sort(byAbs),
        };
    }, [salonBenchmarksTier2Plus]);

    const handleSelectSalon = (id: number | null) => {
        setSelectedSalonId(id);
        setDropdownOpen(false);
        setSearchQuery("");
    };

    // ZAxis size: selected gets bigger dot
    const salonBenchmarksWithSize = useMemo(() =>
        salonBenchmarks.map(s => ({ ...s, dotSize: s.id === selectedSalonId ? 200 : 70 })),
        [salonBenchmarks, selectedSalonId]
    );

    // Tier comparison bar chart
    const tierComparison = Object.entries(BENCHMARK_DATA).map(([tier, data]) => ({
        tier: `Tier ${tier}`,
        promedioReal: data.promedioReal,
        promedioMercado: data.promedioMercado,
        desvio: data.desvio,
        estado: data.estado,
    }));

    // Individual panel values (0 when nothing selected)
    const panelValues = {
        costPerMt2: selectedSalon?.costPerMt2 ?? 0,
        marketCost: selectedSalon?.marketCost ?? 0,
        deviation: selectedSalon?.deviation ?? 0,
        name: selectedSalon?.name ?? "—",
        tier: selectedSalon?.tier ?? "—",
    };

    return (
        <div className="space-y-6">

            {/* ── Header + Salon Dropdown ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Benchmarking</h1>
                    <p className="text-slate-400 text-sm mt-1">Comparación $/m² vs Mercado (Zonaprop / Argenprop)</p>
                </div>

                {/* Salon dropdown — same pattern as Dashboard */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(o => !o)}
                        className="flex items-center gap-2 bg-slate-900/80 border border-white/10 rounded-xl pl-4 pr-3 py-2.5 text-sm text-white hover:border-blue-500/50 transition-all w-[280px] justify-between"
                    >
                        <span className={selectedSalonMeta ? "text-white" : "text-slate-500"}>
                            {selectedSalonMeta
                                ? `#${selectedSalonMeta.id_salon} — ${selectedSalonMeta.nombre_salon}`
                                : "Seleccionar salón..."}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {selectedSalonId && (
                                <span
                                    onClick={e => { e.stopPropagation(); handleSelectSalon(null); }}
                                    className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={13} />
                                </span>
                            )}
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                        </div>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                            {/* Search inside dropdown */}
                            <div className="p-2 border-b border-white/5">
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    autoFocus
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                                />
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                                {dropdownSuggestions.map(s => (
                                    <button
                                        key={s.id_salon}
                                        onClick={() => handleSelectSalon(s.id_salon)}
                                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${s.id_salon === selectedSalonId ? "bg-blue-500/15 text-blue-300" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                                    >
                                        <span className="truncate">{s.nombre_salon}</span>
                                        <span className="text-[10px] text-slate-500 ml-2 flex-shrink-0">#{s.id_salon} · T{s.tier}</span>
                                    </button>
                                ))}
                                {dropdownSuggestions.length === 0 && (
                                    <p className="text-xs text-slate-600 italic px-4 py-3">Sin resultados</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Individual Analysis Panel (always visible) ── */}
            <div className="glass-card p-5 border border-white/5">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-[10px] text-blue-400 uppercase font-black tracking-wider mb-1">Análisis Individual</p>
                        <p className="text-base font-bold text-white">{panelValues.name}</p>
                        {selectedSalon && <p className="text-xs text-slate-500 mt-0.5">Tier {panelValues.tier} · $/m² real vs referencia de mercado</p>}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        {
                            label: "Real $/m²",
                            value: panelValues.costPerMt2 > 0 ? formatARS(panelValues.costPerMt2) : "—",
                            sub: "costos_fijos / m²",
                            colorClass: "text-white",
                            bg: "bg-white/4 border-white/5",
                        },
                        {
                            label: "Mercado $/m²",
                            value: panelValues.marketCost > 0 ? formatARS(panelValues.marketCost) : "—",
                            sub: `Referencia${selectedSalon ? ` Tier ${panelValues.tier}` : ""}`,
                            colorClass: "text-blue-400",
                            bg: "bg-blue-500/4 border-blue-500/10",
                        },
                        {
                            label: "Desvío",
                            value: selectedSalon ? `${panelValues.deviation > 0 ? "+" : ""}${formatPercentage(panelValues.deviation)}` : "—",
                            sub: selectedSalon
                                ? panelValues.deviation > 50 ? "Sobrecosto crítico" : panelValues.deviation > 0 ? "Sobre mercado" : "Bajo mercado"
                                : "sin selección",
                            colorClass: !selectedSalon ? "text-slate-500" : panelValues.deviation > 50 ? "text-red-400" : panelValues.deviation > 0 ? "text-yellow-400" : "text-green-400",
                            bg: !selectedSalon ? "bg-white/4 border-white/5" : panelValues.deviation > 50 ? "bg-red-500/5 border-red-500/10" : panelValues.deviation > 0 ? "bg-yellow-500/5 border-yellow-500/10" : "bg-green-500/5 border-green-500/10",
                        },
                    ].map(card => (
                        <div key={card.label} className={`p-3.5 rounded-2xl border text-center ${card.bg}`}>
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1.5">{card.label}</p>
                            <p className={`text-xl font-black ${card.colorClass}`}>{card.value}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{card.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Pirámide Tier 2–5 ── */}
            <div className="glass-card p-6">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-400" /> Pirámide de Tiers — Segmentos con Benchmarking
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
                                    <div className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center font-black text-xs" style={{ background: `${color}18`, color }}>T{tier}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white leading-tight">{def?.name}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{def?.examples?.join(", ")}</p>
                                    </div>
                                    <div className="flex items-center gap-5 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white">{count}</p>
                                            <p className="text-[9px] text-slate-500 uppercase">salones</p>
                                        </div>
                                        {benchmark && (
                                            <div className="text-right w-14">
                                                <p className="text-sm font-bold" style={{ color: benchmark.desvio <= 0 ? "#22c55e" : "#ef4444" }}>
                                                    {benchmark.desvio > 0 ? "+" : ""}{formatPercentage(benchmark.desvio)}
                                                </p>
                                                <p className="text-[9px] text-slate-500 uppercase">desvío</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ── Bar Chart ── */}
            <div className="glass-card p-6">
                <h2 className="text-base font-semibold text-white mb-4">$/m² Promedio: Real vs Mercado por Tier</h2>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tierComparison} barGap={4} barCategoryGap="30%">
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

            {/* ── Tier Table ── */}
            <div className="glass-card p-6 overflow-x-auto">
                <h2 className="text-base font-semibold text-white mb-4">Comparativa por Tier</h2>
                <table className="w-full text-sm min-w-[500px]">
                    <thead>
                        <tr className="border-b border-white/5">
                            {["Segmento", "Real /m²", "Mercado /m²", "Desvío", "Estado"].map((h, i) => (
                                <th key={h} className={`py-3 px-4 text-slate-500 uppercase text-[10px] font-bold tracking-wider ${i === 0 ? "text-left" : i < 3 ? "text-right" : "text-center"}`}>{h}</th>
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
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-base font-semibold text-white">Análisis Estratégico de Activos</h2>
                        <p className="text-xs text-slate-500 mt-1">Dispersión Costo Real vs Referencia de Mercado · Click para seleccionar</p>
                    </div>
                    {selectedSalonId && (
                        <button onClick={() => handleSelectSalon(null)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <X size={11} /> Deseleccionar
                        </button>
                    )}
                </div>

                {/* Chart + legend same height */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                    <div className="lg:col-span-3 h-[420px] relative">
                        <div className="absolute top-3 right-3 text-[9px] font-black text-red-500/20 uppercase tracking-widest pointer-events-none px-2 py-1 rounded-md border border-red-500/5 bg-red-500/5">SOBRE-MERCADO</div>
                        <div className="absolute bottom-10 left-16 text-[9px] font-black text-green-500/20 uppercase tracking-widest pointer-events-none px-2 py-1 rounded-md border border-green-500/5 bg-green-500/5">BAJO-MERCADO</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 25, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis type="number" dataKey="marketCost" name="Mercado /m²" stroke="#475569"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    label={{ value: "Mercado ($/m²)", position: "bottom", offset: 5, fill: "#64748b", fontSize: 11 }}
                                    domain={["auto", "auto"]}
                                />
                                <YAxis type="number" dataKey="costPerMt2" name="Real /m²" stroke="#475569"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    label={{ value: "Real ($/m²)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11, offset: 10 }}
                                    domain={["auto", "auto"]}
                                />
                                <ZAxis type="number" dataKey="dotSize" range={[70, 200]} />
                                <Tooltip cursor={{ strokeDasharray: "3 3" }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl text-left min-w-[180px]">
                                                <p className="text-xs font-bold text-white mb-2">{d.name}</p>
                                                <div className="space-y-1 border-t border-white/5 pt-2">
                                                    {[
                                                        ["Real $/m²", formatARS(d.costPerMt2), "text-white"],
                                                        ["Mercado $/m²", formatARS(d.marketCost), "text-blue-400"],
                                                        ["Desvío", `${d.deviation > 0 ? "+" : ""}${d.deviation.toFixed(1)}%`, d.deviation > 0 ? "text-red-400" : "text-green-400"],
                                                    ].map(([k, v, cls]) => (
                                                        <div key={k as string} className="flex justify-between gap-4">
                                                            <span className="text-[10px] text-slate-500">{k}:</span>
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
                                />
                                <Scatter
                                    name="Salones"
                                    data={salonBenchmarksWithSize}
                                    onClick={(data: any) => handleSelectSalon(data.id === selectedSalonId ? null : data.id)}
                                    className="cursor-pointer"
                                >
                                    {salonBenchmarksWithSize.map((entry, i) => {
                                        const isSel = entry.id === selectedSalonId;
                                        const hasSel = selectedSalonId !== null;
                                        const opacity = hasSel ? (isSel ? 1 : 0.1) : 0.8;
                                        return (
                                            <Cell
                                                key={`c-${i}`}
                                                fill={entry.color}
                                                stroke={isSel ? "#fff" : entry.color}
                                                strokeWidth={isSel ? 2 : 0}
                                                fillOpacity={opacity}
                                            />
                                        );
                                    })}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend — same height as chart (h-[420px]) */}
                    <div className="h-[420px] p-4 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col justify-center">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Guía Estratégica</h3>
                        <div className="space-y-5">
                            {[
                                { color: "#22c55e", label: "Eficiencia Máxima", desc: "Costo real por debajo de la referencia zonal." },
                                { color: "#eab308", label: "Alineación", desc: "Desvío tolerable respecto al mercado." },
                                { color: "#ef4444", label: "Sobrecosto", desc: "Requiere revisión de contrato urgente." },
                            ].map((g, i, arr) => (
                                <div key={g.label} className={i < arr.length - 1 ? "pb-5 border-b border-white/5" : ""}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                                        <p className="text-[11px] font-bold" style={{ color: g.color }}>{g.label}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed pl-4">{g.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-auto pt-5 border-t border-white/5">
                            <p className="text-[10px] text-slate-600 leading-relaxed">Cada punto es un salón. El eje de paridad (línea azul) representa la igualdad real=mercado.</p>
                        </div>
                    </div>
                </div>

                {/* ── Group Lists ── */}
                <div className="border-t border-white/5 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { key: "efficient" as const, label: "Eficiencia Máxima", color: "#22c55e", glow: "rgba(34,197,94,0.35)", sub: "Bajo Mercado", prefix: "" },
                            { key: "aligned" as const, label: "Alineados", color: "#eab308", glow: "rgba(234,179,8,0.35)", sub: "Desvío tolerable", prefix: "+" },
                            { key: "critical" as const, label: "Sobrecosto Crítico", color: "#ef4444", glow: "rgba(239,68,68,0.35)", sub: "Fuerte Desvío", prefix: "+" },
                        ].map(({ key, label, color, glow, sub, prefix }) => (
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
                                                onClick={() => handleSelectSalon(isSel ? null : s.id)}
                                                className="w-full p-2.5 rounded-lg border flex items-center justify-between transition-all text-left"
                                                style={{ background: isSel ? `${color}12` : "transparent", borderColor: isSel ? `${color}40` : "rgba(255,255,255,0.05)" }}
                                            >
                                                <span className="text-[11px] font-semibold text-slate-200 truncate mr-2">{s.name}</span>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-[10px] font-black" style={{ color }}>{prefix}{formatPercentage(s.deviation)}</p>
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
