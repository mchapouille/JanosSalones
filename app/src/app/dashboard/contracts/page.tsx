"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileCheck, AlertCircle } from "lucide-react";
import { formatARS, formatPercentage } from "@/lib/formatters";
import { getSemaphoreColor } from "@/lib/calculations";
import { getSalonesData } from "@/lib/sample-data";
import { useDashboard } from "@/components/DashboardContext";

export default function ContractsPage() {
    const { conversionRate, salones: allSalones } = useDashboard();

    // Contracts works mainly on active salons
    const salones = useMemo(() => allSalones.filter((s) => s.estado_salon === "ACTIVO"), [allSalones]);

    const audits = useMemo(() =>
        salones.map((s) => {
            const contractUSD = s.contractAudit?.contractAmount ? s.contractAudit.contractAmount / conversionRate : 0;
            const deviation = (s.costos_fijos_salon || 0) - (s.contractAudit?.contractAmount || 0);
            const deviationPercent = s.contractAudit?.contractAmount ? (deviation / s.contractAudit.contractAmount) * 100 : 0;
            const color = deviationPercent > 15 ? 'red' : deviationPercent > 5 ? 'yellow' : 'green';

            return {
                id_salon: s.id_salon,
                year: s.year,
                nombre: s.nombre_salon,
                municipio: s.municipio_salon,
                tier: s.tier,
                contratoUSD: contractUSD,
                pagoRealARS: s.costos_fijos_salon || 0,
                rentIncidence: s.performance?.rentIncidence || 0,
                // From precalculated output (or recalced for conversionRate dynamicness):
                contractAmount: s.contractAudit?.contractAmount || 0,
                realPayment: s.costos_fijos_salon || 0,
                deviation,
                deviationPercent,
                color,
                ...s.contractAudit
            };
        }).filter(a => a.contratoUSD > 0), [salones, conversionRate]
    );

    const [selectedAuditKey, setSelectedAuditKey] = useState<string | null>(null);

    // Initial selection
    useEffect(() => {
        if (audits.length > 0 && selectedAuditKey === null) {
            setSelectedAuditKey(String(audits[0].id_salon));
        }
    }, [audits, selectedAuditKey]);

    const selectedAudit = useMemo(() =>
        audits.find(a => String(a.id_salon) === selectedAuditKey),
        [audits, selectedAuditKey]
    );

    const totalDeviation = audits.reduce((s, a) => s + a.deviation, 0);
    const alertCount = audits.filter((a) => a.color === "red").length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Auditoría de Contratos</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Auditoría: Monto Pactado (USD) vs Pago Real Ejecutado (ARS)
                    </p>
                </div>
            </div>

            {alertCount > 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">
                        <strong>{alertCount} contratos</strong> con desvíos superiores al 15% entre monto pactado y pago real.
                    </p>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Contratos Analizados</p>
                    <p className="text-3xl font-bold text-white">{audits.length}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        De {salones.length} activos {salones.length > audits.length && <span className="text-red-400 font-bold ml-1">({salones.length - audits.length} s/info)</span>}
                    </p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Desvío Total Acumulado</p>
                    <p className="text-3xl font-bold" style={{ color: totalDeviation > 0 ? "#ef4444" : "#22c55e" }}>
                        {totalDeviation > 0 ? "+" : ""}{formatARS(totalDeviation)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">pago real vs contrato</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tasa Conversión</p>
                    <p className="text-3xl font-bold text-cyan-400">{formatARS(conversionRate)}</p>
                    <p className="text-xs text-slate-500 mt-1">USD → ARS (Manual)</p>
                </motion.div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Audit List Sidebar */}
                <div className="lg:col-span-1 glass-card p-4 overflow-hidden flex flex-col h-full max-h-[600px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Salones</h2>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{audits.length} AUDITORÍAS</span>
                    </div>
                    <div className="overflow-y-auto pr-2 space-y-1">
                        {audits
                            .sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent))
                            .map((a) => {
                                const key = `${a.id_salon}-${a.year}`;
                                const isActive = selectedAuditKey === key;
                                const color = getSemaphoreColor(a.color);
                                return (
                                    <button
                                        key={a.id_salon}
                                        onClick={() => setSelectedAuditKey(String(a.id_salon))}
                                        className={`w-full text-left p-3 rounded-xl transition-all border ${isActive
                                            ? "bg-blue-500/10 border-blue-500/30"
                                            : "bg-transparent border-transparent hover:bg-white/5"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isActive ? "text-blue-100" : "text-slate-300"}`}>
                                                    {a.nombre}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-500">Tier {a.tier}</span>
                                                    <span className="text-[10px] text-slate-600">•</span>
                                                    <span className={`text-[10px] font-bold ${a.deviationPercent > 0 ? "text-red-400" : "text-green-400"}`}>
                                                        Desvío: {a.deviationPercent > 0 ? "+" : ""}{formatPercentage(a.deviationPercent)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-600">•</span>
                                                    <span className="text-[10px] text-slate-400">Inc: {formatPercentage(a.rentIncidence)}</span>
                                                </div>
                                            </div>
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Right: Detailed Audit View */}
                <div className="lg:col-span-2">
                    {selectedAudit ? (
                        <motion.div
                            key={`${selectedAudit.id_salon}-${selectedAudit.year}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-card p-6 h-full"
                        >
                            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedAudit.nombre}</h2>
                                    <p className="text-slate-400">Detalle de Auditoría Contractual — Año {selectedAudit.year}</p>
                                </div>
                                <span
                                    className="px-4 py-1.5 rounded-full text-xs font-bold"
                                    style={{
                                        background: `${getSemaphoreColor(selectedAudit.color)}15`,
                                        color: getSemaphoreColor(selectedAudit.color),
                                        border: `1px solid ${getSemaphoreColor(selectedAudit.color)}30`
                                    }}
                                >
                                    {selectedAudit.color === "green" ? "CUMPLIMIENTO OK" : selectedAudit.color === "yellow" ? "REVISIÓN MANUAL" : "DESVÍO CRÍTICO"}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <FileCheck size={60} className="text-blue-400" />
                                    </div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-4">Contrato Pactado</p>
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-slate-400 text-xs">Monto USD:</span>
                                            <span className="text-lg font-bold text-white">USD {selectedAudit.contratoUSD.toLocaleString("es-AR")}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline pt-3 border-t border-white/5">
                                            <span className="text-slate-400 text-xs">Monto ARS (est.):</span>
                                            <span className="text-lg font-bold text-cyan-400">{formatARS(selectedAudit.contractAmount)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <AlertCircle size={60} className="text-purple-400" />
                                    </div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-4">Pago Real Ejecutado</p>
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-slate-400 text-xs">Total ARS:</span>
                                            <span className="text-lg font-bold text-white">{formatARS(selectedAudit.realPayment)}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline pt-3 border-t border-white/5">
                                            <span className="text-slate-400 text-xs">Desvío Detectado:</span>
                                            <span className={`text-lg font-bold ${selectedAudit.deviation > 0 ? "text-red-400" : "text-green-400"}`}>
                                                {selectedAudit.deviation > 0 ? "+" : ""}{formatARS(selectedAudit.deviation)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center justify-center text-center">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-2">Desvío del Contrato</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-5xl font-black ${selectedAudit.deviationPercent > 15 ? "text-red-500" : selectedAudit.deviationPercent > 5 ? "text-yellow-500" : "text-green-500"}`}>
                                        {selectedAudit.deviation > 0 ? "+" : ""}{selectedAudit.deviationPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-4 max-w-sm leading-relaxed">
                                    {selectedAudit.deviationPercent > 15
                                        ? `El desvío supera el umbral crítico. El salón tiene una incidencia real de alquiler del ${formatPercentage(selectedAudit.rentIncidence)}.`
                                        : selectedAudit.deviationPercent > 5
                                            ? `El desvío es moderado (${formatPercentage(selectedAudit.deviationPercent)}). La incidencia sobre ventas es del ${formatPercentage(selectedAudit.rentIncidence)}.`
                                            : "El pago real está alineado con el contrato pactado según la tasa de conversión actual."}
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-50 border-dashed">
                            <FileCheck size={48} className="text-slate-700 mb-4" />
                            <p className="text-slate-500">Selecciona un salón para ver la auditoría detallada.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
