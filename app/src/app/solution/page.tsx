"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SerendipLogo from "@/components/SerendipLogo";
import { Database, Layers, BarChart3, Lightbulb, ArrowRight } from "lucide-react";

const steps = [
    {
        icon: Database,
        number: "01",
        title: "Ingesta",
        subtitle: "Recopilación de Datos",
        description:
            "Capturamos datos dispersos de múltiples fuentes: contratos, CRM, planillas de alquileres y plataformas inmobiliarias. Identificamos inconsistencias y errores manuales.",
        color: "#2563eb",
    },
    {
        icon: Layers,
        number: "02",
        title: "Normalización",
        subtitle: "Base Relacional",
        description:
            "Consolidamos toda la información en una base PostgreSQL normalizada. 5 tablas interrelacionadas con datos de master, costos, capacidad PAX, superficie m² y ubicación geográfica.",
        color: "#7c3aed",
    },
    {
        icon: BarChart3,
        number: "03",
        title: "Semáforos",
        subtitle: "4 Análisis de Auditoría",
        description:
            "Aplicamos 4 módulos de diagnóstico: Rentabilidad Mensualizada, Benchmarking de Mercado, Índice Global de Eficiencia y Auditoría de Contratos. Cada uno genera un semáforo de alerta.",
        color: "#06b6d4",
    },
    {
        icon: Lightbulb,
        number: "04",
        title: "Decisión",
        subtitle: "Recomendaciones Accionables",
        description:
            "El resultado final unifica los 4 semáforos en una visión integral. Identificamos salones de alta eficiencia, activos de riesgo y oportunidades de renegociación.",
        color: "#22c55e",
    },
];

export default function SolutionPage() {
    return (
        <main className="min-h-screen relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-background to-slate-950" />
                <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <div className="flex justify-center mb-6">
                        <SerendipLogo size="lg" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Nuestra <span className="gradient-text">Metodología</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Un proceso de 4 pasos para transformar datos dispersos en decisiones
                        estratégicas sobre la red de salones.
                    </p>
                </motion.div>

                {/* Steps */}
                <div className="space-y-8">
                    {steps.map((step, idx) => {
                        const Icon = step.icon;
                        return (
                            <motion.div
                                key={step.number}
                                initial={{ opacity: 0, x: idx % 2 === 0 ? -40 : 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: idx * 0.15 }}
                                className="glass-card p-8 flex flex-col md:flex-row items-start gap-6 group hover:border-blue-500/30 transition-all duration-300"
                            >
                                {/* Number & Icon */}
                                <div className="flex items-center gap-4 flex-shrink-0">
                                    <span
                                        className="text-5xl font-black opacity-20"
                                        style={{ color: step.color }}
                                    >
                                        {step.number}
                                    </span>
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                        style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                                    >
                                        <Icon size={28} style={{ color: step.color }} />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white mb-1">{step.title}</h2>
                                    <p className="text-sm font-medium mb-3" style={{ color: step.color }}>
                                        {step.subtitle}
                                    </p>
                                    <p className="text-slate-400 leading-relaxed">{step.description}</p>
                                </div>

                                {/* Arrow */}
                                {idx < steps.length - 1 && (
                                    <div className="hidden md:flex items-center self-center">
                                        <ArrowRight size={20} className="text-slate-600" />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="text-center mt-16"
                >
                    <Link href="/login" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
                        Acceder al Dashboard
                        <ArrowRight size={20} />
                    </Link>
                </motion.div>

                {/* Footer */}
                <footer className="text-center mt-20 pt-8 border-t border-slate-800/50">
                    <p className="text-slate-600 text-sm">
                        © 2026 Serendip.IA — Consultoría IT & Control Interno
                    </p>
                </footer>
            </div>
        </main>
    );
}
