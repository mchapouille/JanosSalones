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

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.15),_transparent_50%)]" />
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">

        {/* Header (Logo + Tagline) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center gap-8 mb-24"
        >
          <SerendipLogo size="xl" />

          <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
            Solución integral de visualización para análisis de salones de eventos JANOS
          </p>
        </motion.div>

        {/* Methodology Steps */}
        <div className="space-y-6 mb-24">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-10 text-center"
          >
            Nuestra Metodología
          </motion.h2>

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + (idx * 0.1) }}
                className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 group hover:border-blue-500/30 transition-all duration-300"
              >
                {/* Number & Icon */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-black/20"
                    style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                  >
                    <Icon size={32} style={{ color: step.color }} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                    <span className="hidden md:block text-slate-600">•</span>
                    <span className="text-sm font-medium uppercase tracking-wider" style={{ color: step.color }}>
                      {step.subtitle}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="flex flex-col items-center gap-6"
        >
          <Link href="/login" className="btn-primary flex items-center gap-3 text-lg px-8 py-4 shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40">
            Acceder al Dashboard
            <ArrowRight size={20} />
          </Link>

          <p className="text-slate-600 text-sm mt-8">
            © 2026 Serendip.IA — Consultoría IT & Control Interno
          </p>
        </motion.div>
      </div>
    </main>
  );
}
