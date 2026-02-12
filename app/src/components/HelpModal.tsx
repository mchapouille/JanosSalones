"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, BarChart3, Gauge, FileText, Info, HelpCircle } from "lucide-react";
import { useDashboard } from "./DashboardContext";

export default function HelpModal() {
    const { isHelpOpen, setIsHelpOpen } = useDashboard();

    if (!isHelpOpen) return null;

    const sections = [
        {
            title: "Performance (Rendimiento)",
            icon: Activity,
            color: "text-green-400",
            bg: "bg-green-500/10",
            desc: "Analiza la rentabilidad directa de cada salón. Cruza las ventas mensuales contra el costo de alquiler.",
            logic: "Incidencia < 15% (Eficiente), 15-25% (Alineado), > 25% (Riesgo).",
            usage: "Úsalo para saber qué salones están 'pagando de más' respecto a lo que facturan."
        },
        {
            title: "Benchmarking (Mercado)",
            icon: BarChart3,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            desc: "Compara tu costo por $m² real contra los valores promedio de Zonaprop para ese Tier y zona.",
            logic: "Desvío > 0% significa que pagamos más que el promedio del mercado circundante.",
            usage: "Ideal para detectar oportunidades de renegociación basadas en precios de zona."
        },
        {
            title: "Eficiencia (Índice Global)",
            icon: Gauge,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            desc: "Cruza productividad por m² y rentabilidad por persona (PAX). Mira qué tan bien se usa el activo.",
            logic: "Índice < 1.0 es el objetivo. Combina eficiencia espacial y flujo de invitados.",
            usage: "Te permite ver si un salón grande está siendo subutilizado o si el ticket promedio compensa el costo."
        },
        {
            title: "Auditoría de Contratos",
            icon: FileText,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
            desc: "Controla que lo pagado en ARS coincida con lo pactado originalmente en USD a la tasa oficial.",
            logic: "Desvío > 5% indica una discrepancia que debe ser auditada administrativamente.",
            usage: "Úsalo para evitar sobrepagos por errores de conversión o cargos extras no pactados."
        }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsHelpOpen(false)}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <HelpCircle className="text-blue-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white leading-none">Guía de Uso</h2>
                                <p className="text-slate-500 text-xs mt-1.5 uppercase tracking-widest font-bold">Manual para Toma de Decisiones</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsHelpOpen(false)}
                            className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-800">

                        <div className="grid grid-cols-1 gap-4">
                            {sections.map((s, idx) => (
                                <motion.div
                                    key={s.title}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0 border border-white/5`}>
                                            <s.icon className={s.color} size={24} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className={`text-base font-bold ${s.color}`}>{s.title}</h3>
                                            <p className="text-sm text-slate-300 leading-snug">{s.desc}</p>
                                            <div className="pt-2 flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter w-16">Lógica:</span>
                                                    <span className="text-xs text-slate-400">{s.logic}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-tighter w-16">Para qué:</span>
                                                    <span className="text-xs text-blue-400/80 font-medium italic">{s.usage}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-4">
                                <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-blue-300">Dato de Calidad:</p>
                                    <p className="text-[11px] text-blue-300/60 leading-relaxed">
                                        Si no ves un salón en algún reporte, es porque le falta información crítica en la base de datos (ej: m² o ventas). Esto asegura que los promedios de la red no se distorsionen por datos vacíos.
                                    </p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900/20 border border-blue-500/30 flex items-start gap-4 shadow-lg shadow-blue-500/10">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                    <Gauge className="text-blue-400" size={24} />
                                </div>
                                <div className="space-y-1.5 text-blue-100">
                                    <p className="text-sm font-bold tracking-tight">Estatus Estratégico (Ponderación)</p>
                                    <p className="text-xs leading-relaxed text-blue-200/80">
                                        La decisión final sobre un activo se basa en el **Estatus Estratégico**, que consolida los 4 semáforos.
                                        Por defecto, el Rendimiento (Performance) tiene mayor peso (40%), seguido de Mercado, Eficiencia y Auditoría (20% c/u).
                                        Esto permite determinar si el camino es **Mantener, Optimizar, Renegociar o Cerrar**.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-950/20 border-t border-white/5 text-center">
                        <button
                            onClick={() => setIsHelpOpen(false)}
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                        >
                            ¡Entendido!
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
