"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, X } from "lucide-react";
import { formatARS, formatPercentage } from "@/lib/formatters";
import { BENCHMARK_DATA, TIER_DEFINITIONS, getSemaphoreColor } from "@/lib/calculations";
import { useDashboard } from "@/components/DashboardContext";
import { PredictiveSearch } from "@/components/PredictiveSearch";
import { SalonSelector } from "@/components/SalonSelector";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ScatterChart, Scatter, ZAxis, ReferenceLine, Cell,
} from "recharts";

const TIER_COLORS: Record<number, string> = {
    1: "#64748b", 2: "#3b82f6", 3: "#8b5cf6", 4: "#06b6d4", 5: "#22c55e",
};

export default function BenchmarkingPage() {
    const { salones: allSalones, selectedSalonId, setSelectedSalonId } = useDashboard();

    // Active salons only
    const salones = useMemo(() => allSalones.filter((s) => s.estado_salon === "ACTIVO"), [allSalones]);

    // Handle salon selection from PredictiveSearch
    const handleSelectSearch = (salon: { id_salon: number }) => {
        setSelectedSalonId(salon.id_salon);
    };

    // Salon benchmarks — all tiers
    const salonBenchmarks = useMemo(() =>
        salones
            .filter((s) => s.benchmark)
            .map((s) => ({
                id: s.id_salon,
                name: s.nombre_salon,
                tier: s.tier,
                costPerMt2: s.benchmark!.costPerMt2 ?? ((s.mt2_salon ?? 0) > 0 ? (s.costos_fijos_salon ?? 0) / (s.mt2_salon ?? 1) : 0),
                marketCost: s.benchmark!.marketCostPerMt2 ?? 0,
                deviation: s.benchmark!.deviation ?? 0,
                color: getSemaphoreColor(s.benchmark!.color),
            }))
            .sort((a, b) => b.deviation - a.deviation),
        [salones]
    );

    const selectedSalon = useMemo(() =>
        selectedSalonId != null ? salonBenchmarks.find(s => s.id === selectedSalonId) ?? null : null,
        [salonBenchmarks, selectedSalonId]
    );

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
    };

    const salonBenchmarksWithSize = useMemo(() =>
        salonBenchmarks.map(s => ({ ...s, dotSize: s.id === selectedSalonId ? 200 : 70 })),
        [salonBenchmarks, selectedSalonId]
    );

    const tierComparison = Object.entries(BENCHMARK_DATA).map(([tier, data]) => ({
        tier: `Tier ${tier}`,
        promedioReal: data.promedioReal,
        promedioMercado: data.promedioMercado,
        desvio: data.desvio,
        estado: data.estado,
    }));

    const panelValues = {
        costPerMt2: selectedSalon?.costPerMt2 ?? 0,
        marketCost: selectedSalon?.marketCost ?? 0,
        deviation: selectedSalon?.deviation ?? 0,
        name: selectedSalon?.name ?? "—",
        tier: selectedSalon?.tier ?? "—",
    };

    return (
        <div className="space-y-6">

            {/* ── Header + dual filter ── */}
            <div className="flex flex-col gap-6 pb-6 border-b border-[#b8891a]/10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#7a1515]/10 flex items-center justify-center">
                        <BarChart3 size={18} className="text-[#b8891a]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1a1208] font-display">Benchmarking</h1>
                        <p className="text-[#7a6d5a] text-sm">Comparación $/m² vs Mercado (Zonaprop / Argenprop)</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-start gap-4">
                    {/* Predictive search input */}
                    <PredictiveSearch
                        salones={salones}
                        onSelect={handleSelectSearch}
                    />

                    <div className="flex items-end pb-2 text-[#856f57] text-xs font-bold select-none">ó</div>

                    {/* Select dropdown */}
                    <SalonSelector
                        value={selectedSalonId}
                        onChange={handleSelectSalon}
                        salones={salones}
                    />

                    {selectedSalonId && (
                        <div className="flex items-end pb-2">
                            <button onClick={() => handleSelectSalon(null)} className="text-xs text-[#7a6d5a] hover:text-red-600 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#b8891a]/15 hover:border-red-300 transition-all">
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Individual Analysis Panel (always visible) ── */}
            <div className="glass-card p-5">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <p className="text-[10px] text-[#b8891a] uppercase font-black tracking-wider mb-1">Análisis Individual</p>
                        <p className="text-base font-bold text-[#1a1208]">{panelValues.name}</p>
                        {selectedSalon && <p className="text-xs text-[#7a6d5a] mt-0.5">Tier {panelValues.tier} · $/m² real vs referencia de mercado</p>}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        {
                            label: "Real $/m²",
                            value: panelValues.costPerMt2 > 0 ? formatARS(panelValues.costPerMt2) : "—",
                            sub: "costos_fijos / m²",
                            colorClass: "text-[#1a1208]",
                            bg: "bg-[#faf8f4] border-[#b8891a]/10",
                        },
                        {
                            label: "Mercado $/m²",
                            value: panelValues.marketCost > 0 ? formatARS(panelValues.marketCost) : "—",
                            sub: `Referencia${selectedSalon ? ` Tier ${panelValues.tier}` : ""}`,
                            colorClass: "text-[#b8891a]",
                            bg: "bg-[#f0dfa0]/20 border-[#b8891a]/15",
                        },
                        {
                            label: "Desvío",
                            value: selectedSalon ? `${panelValues.deviation > 0 ? "+" : ""}${formatPercentage(panelValues.deviation)}` : "—",
                            sub: selectedSalon
                                ? panelValues.deviation > 50 ? "Sobrecosto crítico" : panelValues.deviation > 0 ? "Sobre mercado" : "Bajo mercado"
                                : "sin selección",
                            colorClass: !selectedSalon ? "text-[#7a6d5a]" : panelValues.deviation > 50 ? "text-red-600" : panelValues.deviation > 0 ? "text-yellow-700" : "text-green-700",
                            bg: !selectedSalon ? "bg-white/4 border-white/5" : panelValues.deviation > 50 ? "bg-red-500/5 border-red-500/10" : panelValues.deviation > 0 ? "bg-yellow-500/5 border-yellow-500/10" : "bg-green-500/5 border-green-500/10",
                        },
                    ].map(card => (
                        <div key={card.label} className={`p-3.5 rounded-2xl border text-center ${card.bg}`}>
                             <p className="text-[10px] text-[#7a6d5a] uppercase font-bold mb-1.5">{card.label}</p>
                            <p className={`text-xl font-black ${card.colorClass}`}>{card.value}</p>
                             <p className="text-[10px] text-[#856f57] mt-1">{card.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Pirámide Tier 2–5 ── */}
            <div className="glass-card p-6">
                <h2 className="text-base font-semibold text-[#1a1208] mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#b8891a]" /> Pirámide de Tiers — Segmentos con Benchmarking
                </h2>
                <div className="space-y-2">
                    {[2, 3, 4, 5].map((tier, idx) => {
                        const def = TIER_DEFINITIONS[tier];
                        const benchmark = BENCHMARK_DATA[tier];
                        const count = salones.filter((s) => s.tier === tier).length;
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
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#1a1208] leading-tight">{def?.name}</p>
                                    </div>
                                    <div className="flex items-center gap-5 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-[#1a1208]">{count}</p>
                                             <p className="text-[9px] text-[#856f57] uppercase">salones</p>
                                        </div>
                                        {benchmark && (
                                            <div className="text-right w-14">
                                                <p className="text-sm font-bold" style={{ color: benchmark.desvio <= 0 ? "#22c55e" : "#ef4444" }}>
                                                    {benchmark.desvio > 0 ? "+" : ""}{formatPercentage(benchmark.desvio)}
                                                </p>
                                                 <p className="text-[9px] text-[#856f57] uppercase">desvío</p>
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
                <h2 className="text-base font-semibold text-[#1a1208] mb-4">$/m² Promedio: Real vs Mercado por Tier</h2>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tierComparison} barGap={4} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc8" />
                            <XAxis dataKey="tier" tick={{ fill: "#8a7560", fontSize: 12 }} />
                            <YAxis tick={{ fill: "#8a7560", fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(184,137,26,0.2)", borderRadius: 12, color: "#1a1208" }} formatter={(value: number | string | undefined) => value !== undefined ? formatARS(Number(value)) : ""} />
                            <Bar dataKey="promedioReal" name="Costo Real /m²" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="promedioMercado" name="Mercado /m²" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Tier Table ── */}
            <div className="glass-card p-6 overflow-x-auto">
                <h2 className="text-base font-semibold text-[#1a1208] mb-4">Comparativa por Tier</h2>
                <table className="w-full text-sm min-w-[500px]">
                    <thead>
                        <tr className="border-b border-[#b8891a]/10">
                            {["Segmento", "Real /m²", "Mercado /m²", "Desvío", "Estado"].map((h, i) => (
                                 <th key={h} className={`py-3 px-4 text-[#7a6d5a] uppercase text-[10px] font-bold tracking-wider ${i === 0 ? "text-left" : i < 3 ? "text-right" : "text-center"}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tierComparison.map(t => (
                            <tr key={t.tier} className="border-b border-[#b8891a]/8 last:border-0 hover:bg-[#faf8f4] transition-colors">
                                <td className="py-3 px-4 text-[#1a1208] font-bold">{t.tier}</td>
                                <td className="py-3 px-4 text-right text-[#1a1208] font-medium">{formatARS(t.promedioReal)}</td>
                                <td className="py-3 px-4 text-right text-[#b8891a] font-medium">{formatARS(t.promedioMercado)}</td>
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
                        <h2 className="text-base font-semibold text-[#1a1208]">Análisis Estratégico de Activos</h2>
                         <p className="text-xs text-[#7a6d5a] mt-1">Dispersión Costo Real vs Referencia de Mercado · Click para seleccionar</p>
                    </div>
                    {selectedSalonId && (
                             <button onClick={() => handleSelectSalon(null)} className="text-xs text-[#7a6d5a] hover:text-[#1a1208] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#faf8f4] border border-[#b8891a]/15">
                            <X size={11} /> Deseleccionar
                        </button>
                    )}
                </div>

                {/* Chart + legend same height */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                    <div className="lg:col-span-3 h-[420px] relative">
                        <div className="absolute top-3 right-3 text-[9px] font-black text-red-700 uppercase tracking-widest pointer-events-none px-2 py-1 rounded-md border border-red-200 bg-red-50">SOBRE-MERCADO</div>
                        <div className="absolute bottom-10 left-16 text-[9px] font-black text-green-700 uppercase tracking-widest pointer-events-none px-2 py-1 rounded-md border border-green-200 bg-green-50">BAJO-MERCADO</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 25, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc8" vertical={false} />
                                <XAxis type="number" dataKey="marketCost" name="Mercado /m²" stroke="#c8b49a"
                                    tick={{ fill: "#8a7560", fontSize: 11 }}
                                    label={{ value: "Mercado ($/m²)", position: "bottom", offset: 5, fill: "#8a7560", fontSize: 11 }}
                                    domain={["auto", "auto"]}
                                />
                                <YAxis type="number" dataKey="costPerMt2" name="Real /m²" stroke="#c8b49a"
                                    tick={{ fill: "#8a7560", fontSize: 11 }}
                                    label={{ value: "Real ($/m²)", angle: -90, position: "insideLeft", fill: "#8a7560", fontSize: 11, offset: 10 }}
                                    domain={["auto", "auto"]}
                                />
                                <ZAxis type="number" dataKey="dotSize" range={[70, 200]} />
                                <Tooltip cursor={{ strokeDasharray: "3 3" }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white border border-[#b8891a]/20 p-3 rounded-xl shadow-lg text-left min-w-[180px]">
                                                <p className="text-xs font-bold text-[#1a1208] mb-2">{d.name}</p>
                                                <div className="space-y-1 border-t border-[#b8891a]/10 pt-2">
                                                    {                                                    [
                                                        ["Real $/m²", formatARS(d.costPerMt2), "text-[#1a1208]"],
                                                        ["Mercado $/m²", formatARS(d.marketCost), "text-[#b8891a]"],
                                                        ["Desvío", `${d.deviation > 0 ? "+" : ""}${d.deviation.toFixed(1)}%`, d.deviation > 0 ? "text-red-500" : "text-green-600"],
                                                    ].map(([k, v, cls]) => (
                                                        <div key={k as string} className="flex justify-between gap-4">
                                                            <span className="text-[10px] text-[#7a6d5a]">{k}:</span>
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
                                    stroke="#b8891a" strokeWidth={1} strokeDasharray="5 5"
                                />
                                <Scatter
                                    name="Salones"
                                    data={salonBenchmarksWithSize}
                                    onClick={(data: { id: number }) => handleSelectSalon(data.id === selectedSalonId ? null : data.id)}
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

                    {/* Legend — same h-[420px] as chart */}
                    <div className="h-[420px] p-4 rounded-2xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col justify-center">
                         <h3 className="text-[10px] font-black text-[#7a6d5a] uppercase tracking-widest mb-5">Guía Estratégica</h3>
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
                                     <p className="text-[10px] text-[#7a6d5a] leading-relaxed pl-4">{g.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-auto pt-5 border-t border-[#b8891a]/10">
                             <p className="text-[10px] text-[#856f57] leading-relaxed">Cada punto es un salón. El eje de paridad (línea dorada) representa la igualdad real=mercado.</p>
                        </div>
                    </div>
                </div>

                {/* ── Group Lists ── */}
                <div className="border-t border-[#b8891a]/10 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { key: "efficient" as const, label: "Eficiencia Máxima", color: "#16a34a", sub: "Bajo Mercado", prefix: "" },
                            { key: "aligned" as const, label: "Alineados", color: "#ca8a04", sub: "Desvío tolerable", prefix: "+" },
                            { key: "critical" as const, label: "Sobrecosto Crítico", color: "#dc2626", sub: "Fuerte Desvío", prefix: "+" },
                        ].map(({ key, label, color, sub, prefix }) => (
                            <div key={key} className="glass-card overflow-hidden flex flex-col h-[260px]">
                                <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ background: `${color}06`, borderBottom: `1px solid ${color}18` }}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
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
                                                style={{ background: isSel ? `${color}10` : "transparent", borderColor: isSel ? `${color}35` : "rgba(184,137,26,0.08)" }}
                                            >
                                                <span className="text-[11px] font-semibold text-[#1a1208] truncate mr-2">{s.name}</span>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-[10px] font-black" style={{ color }}>{prefix}{formatPercentage(s.deviation)}</p>
                                                     <p className="text-[8px] text-[#856f57] uppercase">{sub}</p>
                                                </div>
                                            </button>
                                        );
                                    }                                    ) : (
                                         <div className="h-full flex items-center justify-center text-[10px] text-[#856f57] italic">Sin registros</div>
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
