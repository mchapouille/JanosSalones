"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileCheck,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus,
    Ban,
    HelpCircle,
    CheckCircle2,
} from "lucide-react";
import { formatARS } from "@/lib/formatters";
import { getSemaphoreColor } from "@/lib/calculations";
import { useDashboard } from "@/components/DashboardContext";

// ────── Types & helpers ──────

type ContractStatus = "ok" | "non_active" | "no_data";

import { type SalonIntegral, type ContractAuditResult } from "@/lib/sample-data";

function getContractAuditData(s: SalonIntegral) {
    const ca = s.contractAudit ?? ({} as ContractAuditResult);
    const status: ContractStatus = ca.contractStatus ?? "non_active";
    return {
        status,
        estadoContrato: ca.estadoContrato ?? "",
        precioAlquiler: ca.precioAlquiler ?? 0,
        alquilerContrato: ca.alquilerContrato ?? 0,
        desvioNominal: ca.desvioNominal ?? null,
        desvioPercent: ca.desvioPercent ?? null,
        color: ca.color ?? "gray",
    };
}

function ContractStatusBadge({ status }: { status: ContractStatus; estadoContrato: string }) {
    if (status === "non_active") {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700/60 border border-slate-600/40 text-slate-400">
                <Ban size={11} />
                Contrato no vigente
            </span>
        );
    }
    if (status === "no_data") {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <HelpCircle size={11} />
                Sin dato de alquiler
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 border border-green-500/30 text-green-400">
            <CheckCircle2 size={11} />
            Vigente
        </span>
    );
}

function DesvioIcon({ pct }: { pct: number }) {
    if (pct > 5) return <TrendingUp size={20} className="text-red-400" />;
    if (pct < -5) return <TrendingDown size={20} className="text-yellow-400" />;
    return <Minus size={20} className="text-green-400" />;
}

function getDesvioLabel(desvioPercent: number) {
    if (desvioPercent > 15) return "DESVÍO CRÍTICO";
    if (desvioPercent > 5) return "REVISIÓN MANUAL";
    if (desvioPercent >= -5) return "CUMPLIMIENTO OK";
    return "PAGO INFERIOR AL CONTRATO";
}

// ────── Main Page ──────

export default function ContractsPage() {
    const { conversionRate, salones: allSalones, selectedSalonId, setSelectedSalonId } = useDashboard();

    const activeSalones = useMemo(
        () => allSalones.filter((s) => s.estado_salon === "ACTIVO"),
        [allSalones]
    );

    const enriched = useMemo(() =>
        activeSalones.map((s) => ({
            ...s,
            _contract: getContractAuditData(s),
        })),
        [activeSalones]
    );

    const auditable = useMemo(
        () => enriched.filter((s) => s._contract.status === "ok"),
        [enriched]
    );

    const totalNoVigentes = enriched.filter((s) => s._contract.status === "non_active").length;
    const totalSinDato = enriched.filter((s) => s._contract.status === "no_data").length;
    const alertCount = auditable.filter((s) => s._contract.color === "red").length;
    const totalDesvioNominal = auditable.reduce((acc, s) => acc + (s._contract.desvioNominal ?? 0), 0);

    // Resolve effective selection: use shared context id if it's auditable, otherwise fall back to first auditable
    const effectiveSelectedId = useMemo(() => {
        if (selectedSalonId !== null && enriched.find((s) => s.id_salon === selectedSalonId)) {
            return selectedSalonId;
        }
        return auditable.length > 0 ? auditable[0].id_salon : null;
    }, [selectedSalonId, enriched, auditable]);

    const selected = useMemo(
        () => enriched.find((s) => s.id_salon === effectiveSelectedId) ?? null,
        [enriched, effectiveSelectedId]
    );

    const sortedAuditable = useMemo(
        () => [...auditable].sort((a, b) =>
            Math.abs(b._contract.desvioPercent ?? 0) - Math.abs(a._contract.desvioPercent ?? 0)
        ),
        [auditable]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Auditoría de Contratos</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Análisis de desvío entre alquiler pactado (contrato) y precio actual de alquiler
                    </p>
                </div>
            </div>

            {alertCount > 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">
                        <strong>{alertCount} {alertCount === 1 ? "contrato" : "contratos"}</strong> con desvíos superiores al 15% entre monto pactado y precio actual.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Contratos Auditables</p>
                    <p className="text-3xl font-bold text-white">{auditable.length}</p>
                    <p className="text-xs text-slate-500 mt-1">vigentes con datos</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">No Vigentes</p>
                    <p className="text-3xl font-bold text-slate-500">{totalNoVigentes}</p>
                    <p className="text-xs text-slate-500 mt-1">vencidos o sin estado</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sin Dato Contrato</p>
                    <p className="text-3xl font-bold text-amber-400">{totalSinDato}</p>
                    <p className="text-xs text-slate-500 mt-1">vigentes sin monto</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }} className="kpi-card">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Desvío Total Acum.</p>
                    <p
                        className="text-3xl font-bold"
                        style={{ color: totalDesvioNominal > 0 ? "#ef4444" : totalDesvioNominal < 0 ? "#eab308" : "#22c55e" }}
                    >
                        {totalDesvioNominal > 0 ? "+" : ""}{formatARS(totalDesvioNominal)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">precio actual vs contrato</p>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 glass-card p-4 flex flex-col max-h-[640px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Salones</h2>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{auditable.length} AUDITABLES</span>
                    </div>
                    <div className="overflow-y-auto pr-1 space-y-1 flex-1">
                        {sortedAuditable.map((s) => {
                            const ca = s._contract;
                            const isActive = effectiveSelectedId === s.id_salon;
                            const color = getSemaphoreColor(ca.color);
                            const pct = ca.desvioPercent ?? 0;
                            return (
                                <button
                                    key={s.id_salon}
                                    onClick={() => setSelectedSalonId(s.id_salon)}
                                    className={`w-full text-left p-3 rounded-xl transition-all border ${isActive
                                        ? "bg-blue-500/10 border-blue-500/30"
                                        : "bg-transparent border-transparent hover:bg-white/5"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <p className={`text-sm font-medium truncate ${isActive ? "text-blue-100" : "text-slate-300"}`}>
                                                {s.nombre_salon}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-500">Tier {s.tier}</span>
                                                <span className="text-[10px] text-slate-600">•</span>
                                                <span className="text-[10px] font-bold" style={{ color }}>
                                                    {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                    </div>
                                </button>
                            );
                        })}
                        {sortedAuditable.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileCheck size={36} className="text-slate-700 mb-3" />
                                <p className="text-slate-500 text-sm">No hay contratos vigentes con datos completos</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {selected ? (
                            <DetailPanel key={selected.id_salon} salon={selected} conversionRate={conversionRate} />
                        ) : (
                            <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-50 border-dashed">
                                <FileCheck size={48} className="text-slate-700 mb-4" />
                                <p className="text-slate-500">Seleccioná un salón para ver la auditoría detallada.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {(totalNoVigentes > 0 || totalSinDato > 0) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                        Salones sin auditoría disponible
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {enriched
                            .filter((s) => s._contract.status !== "ok")
                            .map((s) => (
                                <NonAuditableRow key={s.id_salon} salon={s} />
                            ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ────── Detail Panel ──────

interface SalonWithContract extends SalonIntegral {
    _contract: ReturnType<typeof getContractAuditData>;
}

function DetailPanel({ salon, conversionRate }: { salon: SalonWithContract; conversionRate: number }) {
    const ca = salon._contract;
    const status: ContractStatus = ca.status;
    const color = getSemaphoreColor(ca.color);
    const desvioPercent = ca.desvioPercent ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="glass-card p-6 h-full"
        >
            <div className="flex items-start justify-between mb-8 border-b border-white/5 pb-6 gap-4 flex-wrap">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{salon.nombre_salon}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-slate-400 text-sm">Auditoría Contractual · {salon.municipio_salon}</p>
                        <ContractStatusBadge status={status} estadoContrato={ca.estadoContrato} />
                    </div>
                </div>
                {status === "ok" && (
                    <span
                        className="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                    >
                        {getDesvioLabel(desvioPercent)}
                    </span>
                )}
            </div>

            {/* Condition 1: Non-active */}
            {status === "non_active" && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
                        <Ban size={32} className="text-slate-500" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-slate-400">Contrato no vigente</p>
                        {ca.estadoContrato && ca.estadoContrato !== "sin_estado" && (
                            <p className="text-sm text-slate-600 mt-1 capitalize">Estado: {ca.estadoContrato}</p>
                        )}
                        <p className="text-sm text-slate-600 mt-3 max-w-sm leading-relaxed">
                            No se pueden calcular desvíos sin un contrato vigente. Regularizar el estado contractual para habilitar la auditoría.
                        </p>
                    </div>
                    {ca.precioAlquiler > 0 && (
                        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 text-center">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Precio Alquiler Actual</p>
                            <p className="text-lg font-bold text-slate-300">{formatARS(ca.precioAlquiler)}</p>
                            <p className="text-[10px] text-slate-600 mt-1">
                                ≈ USD {Math.round(ca.precioAlquiler / conversionRate).toLocaleString("es-AR")}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Condition 2: No contract amount */}
            {status === "no_data" && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                        <HelpCircle size={32} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-xl font-bold text-amber-400">Sin dato de alquiler en el contrato</p>
                        <p className="text-sm text-slate-500 mt-3 max-w-sm leading-relaxed">
                            El contrato está vigente pero no tiene monto pactado cargado. No es posible calcular el desvío sin ese dato.
                        </p>
                    </div>
                    {ca.precioAlquiler > 0 && (
                        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 text-center">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Precio Alquiler Actual</p>
                            <p className="text-lg font-bold text-white">{formatARS(ca.precioAlquiler)}</p>
                            <p className="text-[10px] text-slate-600 mt-1">
                                ≈ USD {Math.round(ca.precioAlquiler / conversionRate).toLocaleString("es-AR")}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Condition 3: Happy path */}
            {status === "ok" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden">
                            <div className="absolute top-3 right-3 opacity-5 pointer-events-none">
                                <FileCheck size={56} className="text-blue-400" />
                            </div>
                            <p className="text-xs text-slate-500 uppercase font-bold mb-4">Alquiler Pactado (Contrato)</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-400 text-xs">Monto ARS:</span>
                                    <span className="text-xl font-bold text-cyan-300">{formatARS(ca.alquilerContrato)}</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-3 border-t border-white/5">
                                    <span className="text-slate-400 text-xs">Equiv. USD:</span>
                                    <span className="text-base font-bold text-slate-300">
                                        USD {Math.round(ca.alquilerContrato / conversionRate).toLocaleString("es-AR")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden">
                            <div className="absolute top-3 right-3 opacity-5 pointer-events-none">
                                <AlertCircle size={56} className="text-purple-400" />
                            </div>
                            <p className="text-xs text-slate-500 uppercase font-bold mb-4">Precio Alquiler Actual</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-slate-400 text-xs">Monto ARS:</span>
                                    <span className="text-xl font-bold text-white">{formatARS(ca.precioAlquiler)}</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-3 border-t border-white/5">
                                    <span className="text-slate-400 text-xs">Desvío Nominal:</span>
                                    <span className={`text-base font-bold ${(ca.desvioNominal ?? 0) > 0 ? "text-red-400" : "text-green-400"}`}>
                                        {(ca.desvioNominal ?? 0) > 0 ? "+" : ""}{formatARS(ca.desvioNominal ?? 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="p-8 rounded-2xl border flex flex-col items-center justify-center text-center"
                        style={{ background: `${color}08`, borderColor: `${color}25` }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <DesvioIcon pct={desvioPercent} />
                            <p className="text-xs text-slate-500 uppercase font-bold">Desvío del Alquiler</p>
                        </div>
                        <div className="flex items-baseline gap-1 my-3">
                            <span className="text-6xl font-black" style={{ color }}>
                                {desvioPercent > 0 ? "+" : ""}{desvioPercent.toFixed(1)}
                            </span>
                            <span className="text-2xl font-bold text-slate-400">%</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 max-w-sm leading-relaxed">
                            {desvioPercent > 15
                                ? "El pago supera el contrato en más del 15%. Se recomienda revisión contractual urgente."
                                : desvioPercent > 5
                                    ? `Desvío moderado. El precio actual excede el monto pactado en ${desvioPercent.toFixed(1)}%.`
                                    : desvioPercent >= -5
                                        ? "El precio actual está alineado con el monto pactado en contrato."
                                        : `El precio actual es inferior al contrato en ${Math.abs(desvioPercent).toFixed(1)}%.`}
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ────── Non-auditable row ──────

function NonAuditableRow({ salon }: { salon: SalonWithContract }) {
    const ca = salon._contract;
    const isNonActive = ca.status === "non_active";
    return (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${isNonActive
            ? "bg-slate-900/40 border-slate-800/40"
            : "bg-amber-500/5 border-amber-500/15"
            }`}>
            {isNonActive
                ? <Ban size={15} className="text-slate-600 flex-shrink-0" />
                : <HelpCircle size={15} className="text-amber-500 flex-shrink-0" />
            }
            <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${isNonActive ? "text-slate-400" : "text-slate-300"}`}>
                    {salon.nombre_salon}
                </p>
                <p className={`text-[10px] font-bold uppercase ${isNonActive ? "text-slate-600" : "text-amber-600"}`}>
                    {isNonActive ? "Contrato no vigente" : "Sin dato de alquiler en el contrato"}
                </p>
            </div>
        </div>
    );
}
