"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileCheck, AlertCircle } from "lucide-react";
import { formatARS, formatPercentage } from "@/lib/formatters";
import { getSemaphoreColor, USD_ARS_RATE, calcContractDeviation } from "@/lib/calculations";
import { getSalonesData } from "@/lib/sample-data";

// Simulated contract data (since contracts table is not in the DDL)
const contractData = [
    { id_salon: 1, nombre: "Sans Souci", contratoUSD: 6200, pagoRealARS: 8500000 },
    { id_salon: 2, nombre: "Costanera", contratoUSD: 6800, pagoRealARS: 9200000 },
    { id_salon: 3, nombre: "Palermo Soho", contratoUSD: 4200, pagoRealARS: 5800000 },
    { id_salon: 4, nombre: "Belgrano Events", contratoUSD: 3800, pagoRealARS: 5200000 },
    { id_salon: 5, nombre: "Canning Grand", contratoUSD: 4500, pagoRealARS: 7200000 },
    { id_salon: 6, nombre: "Hudson Palace", contratoUSD: 4000, pagoRealARS: 6800000 },
    { id_salon: 7, nombre: "Ramos Mejía Centro", contratoUSD: 2800, pagoRealARS: 4500000 },
    { id_salon: 8, nombre: "La Plata Eventos", contratoUSD: 3200, pagoRealARS: 5100000 },
    { id_salon: 9, nombre: "Villa Luzuriaga Fiestas", contratoUSD: 1800, pagoRealARS: 3200000 },
    { id_salon: 10, nombre: "Merlo Social", contratoUSD: 1600, pagoRealARS: 2900000 },
    { id_salon: 11, nombre: "Pilar Premium", contratoUSD: 4100, pagoRealARS: 6000000 },
];

export default function ContractsPage() {
    const audits = useMemo(() =>
        contractData.map((c) => {
            const result = calcContractDeviation(c.contratoUSD, c.pagoRealARS);
            return { ...c, ...result };
        }), []
    );

    const totalDeviation = audits.reduce((s, a) => s + a.deviation, 0);
    const alertCount = audits.filter((a) => a.color === "red").length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Auditoría de Contratos</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Cruce: &quot;Excel de Alquileres&quot; (USD) vs &quot;Alquileres Salones&quot; (ARS real)
                </p>
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
                    <p className="text-xs text-slate-500 mt-1">vigentes a Feb 2026</p>
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
                    <p className="text-3xl font-bold text-cyan-400">{formatARS(USD_ARS_RATE)}</p>
                    <p className="text-xs text-slate-500 mt-1">USD → ARS proyectada</p>
                </motion.div>
            </div>

            {/* Contracts Table */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileCheck size={18} className="text-blue-400" />
                    Detalle de Contratos Vigentes
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700/50">
                                <th className="text-left py-3 px-3 text-slate-400">Salón</th>
                                <th className="text-right py-3 px-3 text-slate-400">Contrato (USD)</th>
                                <th className="text-right py-3 px-3 text-slate-400">Contrato (ARS)</th>
                                <th className="text-right py-3 px-3 text-slate-400">Pago Real (ARS)</th>
                                <th className="text-right py-3 px-3 text-slate-400">Desvío</th>
                                <th className="text-right py-3 px-3 text-slate-400">Desvío %</th>
                                <th className="text-center py-3 px-3 text-slate-400">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audits
                                .sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent))
                                .map((a) => {
                                    const color = getSemaphoreColor(a.color);
                                    return (
                                        <tr key={a.id_salon} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                                            <td className="py-3 px-3 text-white font-medium">{a.nombre}</td>
                                            <td className="py-3 px-3 text-right text-slate-400">USD {a.contratoUSD.toLocaleString("es-AR")}</td>
                                            <td className="py-3 px-3 text-right text-slate-300">{formatARS(a.contractAmount)}</td>
                                            <td className="py-3 px-3 text-right text-white">{formatARS(a.realPayment)}</td>
                                            <td className="py-3 px-3 text-right font-medium" style={{ color }}>
                                                {a.deviation > 0 ? "+" : ""}{formatARS(a.deviation)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-medium" style={{ color }}>
                                                {a.deviationPercent > 0 ? "+" : ""}{formatPercentage(a.deviationPercent)}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                                                    {a.color === "green" ? "OK" : a.color === "yellow" ? "Revisar" : "Desvío"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
