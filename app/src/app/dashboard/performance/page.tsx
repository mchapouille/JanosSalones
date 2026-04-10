"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Award, Sliders, BrainCircuit, Ticket, UserCheck, BarChart2 } from "lucide-react";
import { formatARS, formatPercentage, formatMultiplier } from "@/lib/formatters";
import { getSemaphoreColor, simulateRentReduction, get_color_from_incidence } from "@/lib/calculations";

import { useDashboard } from "@/components/DashboardContext";
import { PredictiveSearch } from "@/components/PredictiveSearch";
import { SalonSelector } from "@/components/SalonSelector";
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
    const { salones: allSalones, selectedSalonId, setSelectedSalonId } = useDashboard();

    // Performance works mainly on active salons
    const salones = useMemo(() => allSalones.filter((s) => s.estado_salon === "ACTIVO"), [allSalones]);

    // Handle salon selection from PredictiveSearch
    const handleSelectSearch = (salon: { id_salon: number }) => {
        setSelectedSalonId(salon.id_salon);
    };

    // Update selected salon if it's not in the filtered list (guard invalid IDs)
    useEffect(() => {
        if (selectedSalonId && !salones.find(s => s.id_salon === selectedSalonId)) {
            setSelectedSalonId(null);
        }
    }, [salones, selectedSalonId, setSelectedSalonId]);

    // Compute dynamic IP score for selected salon (uses fixed weights matching backend)
    const FIXED_WEIGHTS = { margen: 40, incidencia: 30, ticketEvento: 15, ticketInvitado: 15 };
    const dynamicScore = useMemo(() => {
        const s = salones.find(x => x.id_salon === selectedSalonId);
        if (!s) return null;
        // Use backend ip_score directly for consistency
        const score = s.ip_score || s.performance?.score || 0;
        const label = score >= 60 ? "Desempeño Alto" : score >= 40 ? "Desempeño Medio" : score >= 20 ? "Desempeño Bajo" : "Riesgo Crítico";
        const color = score >= 60 ? "green" : score >= 40 ? "yellow" : score >= 20 ? "red" : "critical";
        const categoria = score >= 60 ? "alta" : score >= 40 ? "media" : score >= 20 ? "baja" : "muy_baja";
        return { score, label, color, categoria };
    }, [selectedSalonId, salones]);

    // Data for ScatterChart: all eligible salones; selected salon is visually highlighted
    const chartData = useMemo(() => {
        return salones
            .filter(s => s.performance)
            .map(s => {
                const isSelected = s.id_salon === selectedSalonId;
                const baseColor = getSemaphoreColor(s.performance?.color || "gray");
                return {
                    id: s.id_salon,
                    name: s.nombre_salon,
                    x: (s.ventas_totales_salon || 0) - (s.costos_totales_salon || 0),
                    y: s.performance?.score || 0,
                    z: 1,
                    color: baseColor,
                    isSelected,
                    // Visual emphasis props — selected: prominent; peers: subdued
                    fillOpacity: isSelected ? 0.9 : (selectedSalonId ? 0.2 : 0.45),
                    strokeOpacity: isSelected ? 1 : (selectedSalonId ? 0.15 : 0.7),
                    r: isSelected ? 10 : 5,
                };
            });
    }, [salones, selectedSalonId]);

    const groupedSalones = useMemo(() => {
        const baseList = salones.filter(s => s.performance);
        return {
            alta: baseList.filter(s => (s.ip_score || s.performance?.score || 0) >= 60).sort((a, b) => (b.ip_score || b.performance?.score || 0) - (a.ip_score || a.performance?.score || 0)),
            media: baseList.filter(s => (s.ip_score || s.performance?.score || 0) >= 40 && (s.ip_score || s.performance?.score || 0) < 60).sort((a, b) => (b.ip_score || b.performance?.score || 0) - (a.ip_score || a.performance?.score || 0)),
            baja: baseList.filter(s => (s.ip_score || 0) >= 20 && (s.ip_score || 0) < 40).sort((a, b) => (b.ip_score || 0) - (a.ip_score || 0)),
            muyBaja: baseList.filter(s => (s.ip_score || 0) < 20).sort((a, b) => (b.ip_score || 0) - (a.ip_score || 0)),
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

    return (
        <div className="space-y-6">
            {/* Header + dual filter (same pattern as Dashboard) */}
            <div className="flex flex-col gap-6 pb-6 border-b border-[#b8891a]/10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#7a1515]/10 flex items-center justify-center">
                        <TrendingUp size={18} className="text-[#b8891a]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1a1208] font-display">Performance</h1>
                        <p className="text-[#7a6d5a] text-sm">Análisis de Rentabilidad</p>
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
                        onChange={setSelectedSalonId}
                        salones={salones}
                    />

                    {selectedSalonId && (
                        <div className="flex items-end pb-2">
                            <button onClick={() => setSelectedSalonId(null)} className="text-xs text-[#7a6d5a] hover:text-red-600 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#b8891a]/15 hover:border-red-300 transition-all">
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
                    <p className="text-xs text-[#7a6d5a] uppercase tracking-wider mb-2">Salones Analizados</p>
                    <p className="text-3xl font-bold text-[#1a1208]">
                        {!selectedSalonId
                            ? [...new Set(salones.map(s => s.id_salon))].length
                            : 1}
                    </p>
                    <p className="text-xs text-[#856f57] mt-1">
                        De {salones.length} activos
                    </p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card">
                    <p className="text-xs text-[#7a6d5a] uppercase tracking-wider mb-2">Score Rentabilidad</p>
                    {(() => {
                        // Use backend ip_score for consistency with the list cards
                        const s = salones.find(x => x.id_salon === selectedSalonId);
                        const score = !selectedSalonId ? 100 : (s?.ip_score || s?.performance?.score || 0);
                        const scoreColor = score >= 60 ? "#22c55e" : score >= 40 ? "#facc15" : score >= 20 ? "#f97316" : "#ef4444";
                        const scoreLabel = score >= 60 ? "Alta" : score >= 40 ? "Media" : score >= 20 ? "Baja" : "Muy Baja";
                        return (
                            <>
                                <p className="text-3xl font-bold" style={{ color: scoreColor }}>{score.toFixed(0)}</p>
                                <p className="text-xs font-bold mt-1" style={{ color: scoreColor }}>{scoreLabel}</p>
                            </>
                        );
                    })()}
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card">
                    <p className="text-xs text-[#7a6d5a] uppercase tracking-wider mb-2">Margen Total</p>
                    <p className="text-3xl font-bold text-emerald-600">
                        {formatARS(
                            !selectedSalonId
                                ? salones.reduce((acc, s) => acc + ((s.ventas_totales_salon || 0) - (s.costos_totales_salon || 0)), 0)
                                : ((salones.find(s => s.id_salon === selectedSalonId)?.ventas_totales_salon || 0) - (salones.find(s => s.id_salon === selectedSalonId)?.costos_totales_salon || 0))
                        )}
                    </p>
                    <p className="text-xs text-[#856f57] mt-1">contribución acumulada</p>
                </motion.div>
            </div>

            {/* Score Rentabilidad Panel — always visible */}
            {(() => {
                // When no salon selected, show average network score
                const panelScore = dynamicScore ?? (() => {
                    const active = salones.filter(s => (s.ip_score || 0) > 0);
                    const avg = active.length > 0
                        ? active.reduce((acc, s) => acc + (s.ip_score || 0), 0) / active.length
                        : 0;
                    const color = avg >= 60 ? "green" : avg >= 40 ? "yellow" : avg >= 20 ? "red" : "critical";
                    return { score: avg, color, label: avg >= 60 ? "Alta" : avg >= 40 ? "Media" : avg >= 20 ? "Baja" : "Muy Baja" };
                })();
                const hex = getSemaphoreColor(panelScore.color);
                const weights = [
                    { id: 'margen', label: 'Margen', value: FIXED_WEIGHTS.margen, color: '#10b981' },
                    { id: 'incidencia', label: 'Incidencia', value: FIXED_WEIGHTS.incidencia, color: '#8b5cf6' },
                    { id: 'ticketEvento', label: 'Tk. Evento', value: FIXED_WEIGHTS.ticketEvento, color: '#3b82f6' },
                    { id: 'ticketInvitado', label: 'Tk. Invitado', value: FIXED_WEIGHTS.ticketInvitado, color: '#06b6d4' },
                ] as const;
                return (
                    <div className="relative overflow-hidden glass-card">
                        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 15% 60%, ${hex}18, transparent 55%)` }} />
                        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${hex}20` }}>
                                <BrainCircuit size={15} style={{ color: hex }} />
                            </div>
                            <h3 className="text-sm font-bold text-[#1a1208]">Score Rentabilidad</h3>
                            <span className="ml-auto text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border" style={{ color: hex, borderColor: `${hex}40`, background: `${hex}12` }}>
                                {panelScore.label}{!selectedSalonId ? " · Red" : ""}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 p-6">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center relative shadow-xl flex-shrink-0" style={{ background: `${hex}10`, border: `3px solid ${hex}50` }}>
                                    <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: hex, opacity: 0.06 }} />
                                    <span className="text-3xl font-black text-[#1a1208] relative z-10 leading-none">{panelScore.score.toFixed(0)}</span>
                                    <span className="text-[9px] font-bold tracking-widest relative z-10 mt-0.5" style={{ color: hex }}>/ 100</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-[#7a6d5a] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                     <Sliders size={10} /> Ponderación Fija
                                 </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {weights.map((w) => (
                                        <div key={w.id} className="rounded-xl border p-3 flex flex-col gap-1" style={{ borderColor: `${w.color}25`, background: `${w.color}08` }}>
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="text-[10px] font-bold text-[#7a6d5a]">{w.label}</span>
                                                <span className="text-[10px] font-black tabular-nums" style={{ color: w.color }}>{w.value}%</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-[#e8dcc8] overflow-hidden mt-1">
                                                <div className="h-full rounded-full" style={{ width: `${w.value}%`, background: w.color }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Indicadores Operativos (shown when salon selected) ── */}
            {selectedSalonId && (() => {
                const s = salones.find(x => x.id_salon === selectedSalonId);
                if (!s) return null;
                const tktEvento = s.ticket_evento_promedio || 0;
                const tktInvitado = s.ticket_persona_promedio || 0;
                const eventos = s.cantidad_eventos_salon || 0;
                const invitados = s.total_invitados_salon || 0;
                const invPorEvento = eventos > 0 ? invitados / eventos : 0;
                const incidencia = s.incidencia_alquiler_sobre_facturacion_anual || 0;
                const retorno = s.retorno_sobre_alquiler || s.performance?.multiplier || 0;
                return (
                    <div className="glass-card p-5">
                        <p className="text-[10px] text-[#7a6d5a] uppercase font-black tracking-[0.2em] mb-3">Indicadores Operativos</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {/* Tkt por evento */}
                            <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Ticket size={12} className="text-[#b8891a]" />
                                     <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Tkt / Evento</span>
                                </div>
                                <span className="text-base font-black text-[#1a1208]">
                                    {tktEvento > 0 ? formatARS(tktEvento) : "—"}
                                </span>
                            </div>
                            {/* Tkt por invitado */}
                            <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Ticket size={12} className="text-[#7a1515]" />
                                     <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Tkt / Invitado</span>
                                </div>
                                <span className="text-base font-black text-[#1a1208]">
                                    {tktInvitado > 0 ? formatARS(tktInvitado) : "—"}
                                </span>
                            </div>
                            {/* Invitados por evento */}
                            <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <UserCheck size={12} className="text-[#d4a830]" />
                                     <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Inv. / Evento</span>
                                </div>
                                <span className="text-base font-black text-[#1a1208]">
                                    {invPorEvento > 0 ? invPorEvento.toFixed(0) : "—"}
                                </span>
                            </div>
                            {/* Incidencia promedio */}
                            <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <BarChart2 size={12} className="text-orange-500" />
                                     <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Incidencia</span>
                                </div>
                                <span className="text-base font-black"
                                    style={{ color: get_color_from_incidence(incidencia) }}>
                                    {incidencia > 0 ? formatPercentage(incidencia * 100) : "—"}
                                </span>
                            </div>
                            {/* Retorno sobre alquiler */}
                            <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp size={12} className="text-emerald-600" />
                                     <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Ret. Alquiler</span>
                                </div>
                                <span className="text-base font-black text-[#1a1208]">
                                    {retorno > 0 ? `${retorno.toFixed(2)}x` : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* What-If Simulator — above matrix */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-[#1a1208] mb-4 flex items-center gap-2">
                    <Sliders size={18} className="text-[#b8891a]" />
                    Simulador &quot;What-If&quot; — Reducción de Alquiler
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-[#7a6d5a] mb-2 block">Salón Seleccionado</label>
                            <div className="bg-[#faf8f4] border border-[#b8891a]/15 rounded-xl px-4 py-2.5 text-sm text-[#1a1208] flex items-center justify-between">
                                <span className="font-bold">{simSalon?.nombre_salon || 'Ningún salón seleccionado'}</span>
                                <div className={`w-2 h-2 rounded-full ${simSalon ? 'bg-green-500' : 'bg-[#b8891a]/30'}`} />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-[#7a6d5a] mb-2 block">
                                Reducción de Alquiler: <span className="text-[#1a1208] font-bold">{rentReduction}%</span>
                            </label>
                            <input type="range" min={0} max={50} step={1} value={rentReduction}
                                onChange={(e) => setRentReduction(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none bg-[#e8dcc8] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#b8891a] [&::-webkit-slider-thumb]:shadow-lg"
                            />
                            <div className="flex justify-between text-xs text-[#9e8b74] mt-1"><span>0%</span><span>25%</span><span>50%</span></div>
                        </div>
                    </div>
                    {simulation && simSalon && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="glass-card-light p-3"><p className="text-xs text-[#6b5d4a]">Nuevo Alquiler</p><p className="text-lg font-bold text-[#1a1208]">{formatARS(simulation.newCostosFijos)}</p></div>
                                <div className="glass-card-light p-3"><p className="text-xs text-[#6b5d4a]">Incidencia Resultante</p><p className="text-lg font-bold" style={{ color: simulation.newIncidence > 0.25 ? "#dc2626" : simulation.newIncidence > 0.15 ? "#a16207" : "#15803d" }}>{rentReduction === 0 && simSalon?.performance ? formatPercentage(simSalon.performance.rentIncidence * 100) : formatPercentage(simulation.newIncidence * 100)}</p></div>
                                <div className="glass-card-light p-3"><p className="text-xs text-[#6b5d4a]">Nuevo Margen</p><p className="text-lg font-bold text-[#1a1208]">{formatARS(simulation.newMargin)}</p></div>
                                <div className="glass-card-light p-3"><p className="text-xs text-[#6b5d4a]">Mejora en Margen</p><p className="text-lg font-bold text-green-700">+{formatARS(simulation.marginImprovement)}</p></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Revenue vs Rent Scatter Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
                <div className="lg:col-span-3 h-[450px] relative glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-[#1a1208] flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#b8891a]" />
                            Matriz de Performance: Margen vs Score
                        </h2>
                        <div className="text-[10px] font-bold text-[#856f57] uppercase tracking-widest bg-[#faf8f4] px-3 py-1 rounded-full border border-[#b8891a]/15">
                             Referencia: Score Rentabilidad (0-100)
                         </div>
                    </div>

                    <div className="absolute top-24 right-12 text-[10px] font-black text-red-700 uppercase tracking-[0.2em] pointer-events-none p-2 rounded-lg border border-red-200 bg-red-50">ALTA INCIDENCIA</div>
                    <div className="absolute bottom-24 left-32 text-[10px] font-black text-green-700 uppercase tracking-[0.2em] pointer-events-none p-2 rounded-lg border border-green-200 bg-green-50">ALTA EFICIENCIA</div>

                    <ResponsiveContainer width="100%" height="90%">
                        <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8dcc8" vertical={false} opacity={0.8} />
                            <XAxis
                                type="number"
                                dataKey="x"
                                name="Margen Total"
                                stroke="#c8b49a"
                                tick={{ fill: "#8a7560", fontSize: 11 }}
                                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                                label={{ value: 'Margen Total ($)', position: 'bottom', offset: 20, fill: '#8a7560', fontSize: 12 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                name="Score"
                                domain={[0, 100]}
                                stroke="#c8b49a"
                                tick={{ fill: "#8a7560", fontSize: 11 }}
                                label={{ value: 'Score Rentabilidad', angle: -90, position: 'left', offset: 0, fill: '#8a7560', fontSize: 12 }}
                            />
                            <ZAxis type="number" dataKey="z" range={[60, 60]} />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white border border-[#b8891a]/20 p-4 rounded-xl shadow-lg min-w-[200px]">
                                                <p className="text-sm font-bold text-[#1a1208] mb-3 border-b border-[#b8891a]/10 pb-2">
                                                    {data.name}
                                                    {data.isSelected && <span className="ml-2 text-[10px] text-[#b8891a] font-normal">(seleccionado)</span>}
                                                </p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-[10px] text-[#7a6d5a] uppercase">Margen Total:</span>
                                                        <span className="text-[10px] font-bold text-emerald-600">{formatARS(data.x)}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4 pt-1 border-t border-[#b8891a]/10">
                                                        <span className="text-[10px] text-[#7a6d5a] uppercase">Score:</span>
                                                        <span className={`text-[10px] font-bold ${data.y < 40 ? "text-red-500" : data.y > 60 ? "text-green-600" : "text-[#b8891a]"}`}>
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
                            <ReferenceLine y={20} stroke="#f97316" strokeDasharray="3 3" opacity={0.6} label={{ position: 'right', value: 'Baja', fill: '#f97316', fontSize: 9 }} />
                            <ReferenceLine y={40} stroke="#facc15" strokeDasharray="3 3" opacity={0.6} label={{ position: 'right', value: 'Media', fill: '#facc15', fontSize: 9 }} />
                            <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="3 3" opacity={0.6} label={{ position: 'right', value: 'Alta', fill: '#22c55e', fontSize: 9 }} />
                            <Scatter name="Salones" data={chartData}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        stroke={entry.isSelected ? "#ffffff" : entry.color}
                                        strokeWidth={entry.isSelected ? 2 : 1}
                                        fillOpacity={entry.fillOpacity}
                                        strokeOpacity={entry.strokeOpacity}
                                        r={entry.r}
                                        className="cursor-pointer"
                                        onClick={() => setSelectedSalonId(entry.id === selectedSalonId ? null : entry.id as number)}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-[#faf8f4] border border-[#b8891a]/12 h-full">
                        <h3 className="text-xs font-bold text-[#7a6d5a] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Sliders size={14} className="text-[#b8891a]" />
                            Guía de Cuadrantes
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] font-bold text-green-600">Alta (60 – 100)</p>
                                     <p className="text-[10px] text-[#7a6d5a] leading-relaxed">Alta contribución al margen y score optimizado.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-[#b8891a]/8">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] font-bold text-yellow-600">Media (40 – 60)</p>
                                     <p className="text-[10px] text-[#7a6d5a] leading-relaxed">Performance alineada con el promedio de la red.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-2 h-2 rounded-full bg-orange-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] font-bold text-orange-500">Baja (20 – 40)</p>
                                     <p className="text-[10px] text-[#7a6d5a] leading-relaxed">Requiere revisión de costos o impulso comercial.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-[#b8891a]/8">
                                <div className="w-2 h-2 rounded-full bg-red-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] font-bold text-red-600">Muy Baja (&lt; 20)</p>
                                     <p className="text-[10px] text-[#7a6d5a] leading-relaxed">Situación crítica. Revisión inmediata de contrato.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-[#b8891a]/10">
                             <p className="text-[10px] text-[#856f57] italic leading-relaxed">
                                 El gráfico cruza la facturación total mensual contra el costo de alquiler para identificar la salud del margen bruto de cada locación.
                             </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Situation Cards Row — 4 buckets matching guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Alta (60-100) */}
                <div className="glass-card overflow-hidden flex flex-col h-[300px]">
                    <div className="p-4 border-b border-green-500/20 bg-green-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                             <span className="text-[11px] font-black text-green-700 uppercase tracking-widest">Alta</span>
                            <span className="text-[9px] text-green-600 font-bold">60-100</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-[10px] font-bold text-green-500 border border-green-500/20">
                            {groupedSalones.alta.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                        {groupedSalones.alta.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSalonId === s.id_salon ? "bg-green-50 border-green-400/30" : "bg-[#faf8f4] border-[#b8891a]/8 hover:border-green-400/20"}`}>
                                <span className="text-[10px] font-bold text-[#1a1208] truncate mr-2">{s.nombre_salon}</span>
                                <span className="text-[10px] font-black text-green-600 flex-shrink-0">{(s.ip_score || 0).toFixed(0)} pts</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Media (40-60) */}
                <div className="glass-card overflow-hidden flex flex-col h-[300px]">
                    <div className="p-4 border-b border-yellow-500/20 bg-yellow-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                             <span className="text-[11px] font-black text-yellow-700 uppercase tracking-widest">Media</span>
                            <span className="text-[9px] text-yellow-600 font-bold">40-60</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-[10px] font-bold text-yellow-500 border border-yellow-500/20">
                            {groupedSalones.media.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                        {groupedSalones.media.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSalonId === s.id_salon ? "bg-yellow-50 border-yellow-400/30" : "bg-[#faf8f4] border-[#b8891a]/8 hover:border-yellow-400/20"}`}>
                                <span className="text-[10px] font-bold text-[#1a1208] truncate mr-2">{s.nombre_salon}</span>
                                <span className="text-[10px] font-black text-yellow-600 flex-shrink-0">{(s.ip_score || 0).toFixed(0)} pts</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Baja (5-40) */}
                <div className="glass-card overflow-hidden flex flex-col h-[300px]">
                    <div className="p-4 border-b border-orange-500/20 bg-orange-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                            <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">Baja</span>
                            <span className="text-[9px] text-orange-600 font-bold">20-40</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-[10px] font-bold text-orange-500 border border-orange-500/20">
                            {groupedSalones.baja.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                        {groupedSalones.baja.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSalonId === s.id_salon ? "bg-orange-50 border-orange-400/30" : "bg-[#faf8f4] border-[#b8891a]/8 hover:border-orange-400/20"}`}>
                                <span className="text-[10px] font-bold text-[#1a1208] truncate mr-2">{s.nombre_salon}</span>
                                <span className="text-[10px] font-black text-orange-500 flex-shrink-0">{(s.ip_score || 0).toFixed(0)} pts</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Muy Baja (< 5) */}
                <div className="glass-card overflow-hidden flex flex-col h-[300px]">
                    <div className="p-4 border-b border-red-600/20 bg-red-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                            <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Muy Baja</span>
                            <span className="text-[9px] text-red-800 font-bold">&lt; 20</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-red-600/10 text-[10px] font-bold text-red-600 border border-red-600/20">
                            {groupedSalones.muyBaja.length}
                        </span>
                    </div>
                    <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                        {groupedSalones.muyBaja.map(s => (
                            <div key={s.id_salon} onClick={() => setSelectedSalonId(s.id_salon)} className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedSalonId === s.id_salon ? "bg-red-50 border-red-400/30" : "bg-[#faf8f4] border-[#b8891a]/8 hover:border-red-400/20"}`}>
                                <span className="text-[10px] font-bold text-[#1a1208] truncate mr-2">{s.nombre_salon}</span>
                                <span className="text-[10px] font-black text-red-600 flex-shrink-0">{(s.ip_score || 0).toFixed(0)} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Rankings Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Top 5 Margin */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-[#1a1208] mb-3 flex items-center gap-2">
                        <Award size={16} className="text-green-600" />
                        Top 5 Participación Margen
                    </h3>
                    <div className="space-y-2">
                                     {top5Margin.map((s, i) => (
                                         <div key={s.id_salon} className="flex items-center justify-between text-sm">
                                             <span className="text-[#7a6d5a]">
                                                 <span className="text-[#9e8b74] mr-2">{i + 1}.</span>
                                                 {s.nombre_salon}
                                             </span>
                                <span className="text-green-600 font-medium">
                                    {formatPercentage((s.performance?.marginContribution || 0) * 100)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top 5 Return */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-[#1a1208] mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-[#b8891a]" />
                        Top 5 Retorno Alquiler
                    </h3>
                    <div className="space-y-2">
                                     {top5Return.map((s, i) => (
                                         <div key={s.id_salon} className="flex items-center justify-between text-sm">
                                             <span className="text-[#7a6d5a]">
                                                 <span className="text-[#9e8b74] mr-2">{i + 1}.</span>
                                                 {s.nombre_salon}
                                             </span>
                                <span className="text-[#b8891a] font-medium">
                                    {formatMultiplier(s.performance?.multiplier || 0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top 5 Risk */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-[#1a1208] mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500" />
                        Top 5 Incidencia Alquiler
                    </h3>
                    <div className="space-y-2">
                                     {top5Risk.map((s, i) => (
                                         <div key={s.id_salon} className="flex items-center justify-between text-sm">
                                             <span className="text-[#7a6d5a]">
                                                 <span className="text-[#9e8b74] mr-2">{i + 1}.</span>
                                                 {s.nombre_salon}
                                             </span>
                                <span style={{ color: get_color_from_incidence(s.performance?.rentIncidence || 0) }} className="font-medium">
                                    {formatPercentage((s.performance?.rentIncidence || 0) * 100)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


        </div>
    );
}
