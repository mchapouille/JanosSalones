"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    Building2,
    DollarSign,
    TrendingUp,
    BrainCircuit,
    Users,
    LayoutGrid,
    MapPin,
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Circle,
    Receipt,
} from "lucide-react";
import { getSemaphoreColor, TIER_DEFINITIONS, get_color_from_incidence } from "@/lib/calculations";
import { formatARS, formatNumber, formatPercentage, formatMultiplier } from "@/lib/formatters";
import { type SalonIntegral } from "@/lib/sample-data";
import GoogleMapView from "@/components/GoogleMapView";
import { useDashboard } from "@/components/DashboardContext";
import { PredictiveSearch, renderSalonItem } from "@/components/PredictiveSearch";
import { SalonSelector } from "@/components/SalonSelector";

function getSemaforoLabel(color: string): string {
    switch (color) {
        case "green": return "Alta";
        case "yellow": return "Media";
        case "red": return "Baja";
        case "critical": return "Crítico";
        default: return "—";
    }
}

function getIpScoreLabel(score: number): string {
    if (score >= 60) return "Alta";
    if (score >= 40) return "Media";
    if (score >= 20) return "Baja";
    return "Muy baja";
}

function getIpScoreColor(score: number): string {
    if (score >= 60) return "green";
    if (score >= 40) return "yellow";
    if (score >= 20) return "red";
    return "critical";
}

function SemaforoIcon({ color, size = 20 }: { color: string; size?: number }) {
    const hex = getSemaphoreColor(color);
    switch (color) {
        case "green": return <CheckCircle2 size={size} style={{ color: hex }} />;
        case "yellow": return <AlertTriangle size={size} style={{ color: hex }} />;
        case "red":
        case "critical": return <XCircle size={size} style={{ color: hex }} />;
        default: return <Circle size={size} className="text-slate-500" />;
    }
}

export default function DashboardPage() {
    const { salones, selectedSalonId, setSelectedSalonId } = useDashboard();
    const [selectedEstado, setSelectedEstado] = useState<string | null>(null);

    // Handle salon selection from PredictiveSearch
    const handleSelectSearch = (salon: SalonIntegral) => {
        setSelectedSalonId(salon.id_salon);
    };

    const filtered = useMemo(() => {
        return salones.filter((s) => {
            if (selectedEstado && s.estado_salon !== selectedEstado) return false;
            return true;
        });
    }, [salones, selectedEstado]);

    const selectedSalon = useMemo(() => {
        if (!selectedSalonId) return null;
        return salones.find(s => s.id_salon === selectedSalonId) || null;
    }, [selectedSalonId, salones]);

    const handleSelectSalon = (salon: SalonIntegral | null) => {
        setSelectedSalonId(salon ? salon.id_salon : null);
    };

    // KPI calculations — always from ALL active salones (not filtered)
    const activeSalones = salones.filter((s) => s.estado_salon === "ACTIVO");
    const filteredActive = filtered.filter((s) => s.estado_salon === "ACTIVO");

    const totalRevenue = filteredActive.reduce((s, x) => s + (x.ventas_totales_salon || 0), 0);
    const totalCosts = filteredActive.reduce((s, x) => s + (x.costos_totales_salon || 0), 0);
    const totalGuests = filteredActive.reduce((s, x) => s + (x.total_invitados_salon || 0), 0);
    const totalEvents = filteredActive.reduce((s, x) => s + (x.cantidad_eventos_salon || 0), 0);

    const validTicket = filteredActive.filter(s => (s.ticket_evento_promedio || 0) > 0);
    const avgTicket = validTicket.length > 0
        ? validTicket.reduce((acc, s) => acc + (s.ticket_evento_promedio || 0), 0) / validTicket.length
        : 0;

    const validInc = filteredActive.filter(s => (s.incidencia_alquiler_sobre_facturacion_anual || 0) > 0);
    const avgIncidencia = validInc.length > 0
        ? validInc.reduce((acc, s) => acc + (s.incidencia_alquiler_sobre_facturacion_anual || 0), 0) / validInc.length
        : 0;

    // Determine if selected salon is non-active (DEVUELTOS or OBRA)
    const isNonActive = selectedSalon && selectedSalon.estado_salon !== "ACTIVO";

    // Determine if Tier 1 (No benchmark applicable)
    const isTier1 = selectedSalon && Number(selectedSalon.tier) === 1;

    // Semaphore cards for selected salon
    const semaforos = selectedSalon ? [
        {
            label: "Rentabilidad",
            color: isNonActive ? "gray" : (selectedSalon.performance?.color || "gray"),
            value: isNonActive ? "—" : `${(selectedSalon.ip_score || 0).toFixed(0)} pts`,
            sublabel: isNonActive ? "—" : getSemaforoLabel(selectedSalon.performance?.color || "gray"),
        },
        {
            label: "Benchmarking",
            // Tier 1 gets gray (no benchmark reference); non-active also gray
            color: (isNonActive || isTier1) ? "gray" : (selectedSalon.benchmark?.color || "gray"),
            value: (isNonActive || isTier1) ? "—" : (selectedSalon.benchmark?.deviation != null
                ? `${selectedSalon.benchmark.deviation > 0 ? "+" : ""}${selectedSalon.benchmark.deviation.toFixed(0)}%`
                : "—"),
            sublabel: isNonActive ? "—" : (isTier1 ? "Sin referencia (T1)" : getSemaforoLabel(selectedSalon.benchmark?.color || "gray")),
        },
        {
            label: "Eficiencia",
            color: isNonActive ? "gray" : (selectedSalon.efficiency?.color || "gray"),
            value: isNonActive ? "—" : ((selectedSalon.efficiency?.globalIndex ?? 0) > 0
                ? `${(selectedSalon.efficiency?.globalIndex ?? 0).toFixed(2)}x`
                : "—"),
            sublabel: isNonActive ? "—" : getSemaforoLabel(selectedSalon.efficiency?.color || "gray"),
        },
        {
            label: "Contratos",
            color: isNonActive ? "gray" : (() => {
                const ca = selectedSalon.contractAudit;
                if (!ca || ca.contractStatus === "non_active") return "gray";
                if (ca.contractStatus === "no_data") return "yellow";
                return ca.color || "green";
            })(),
            value: isNonActive ? "—" : (() => {
                const ca = selectedSalon.contractAudit;
                if (!ca || ca.contractStatus === "non_active") return "—";
                if (ca.contractStatus === "no_data") return "—";
                const pct = ca.desvioPercent ?? 0;
                return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
            })(),
            sublabel: isNonActive ? "—" : (() => {
                const ca = selectedSalon.contractAudit;
                if (!ca || ca.contractStatus === "non_active") return "Vencido / Sin estado";
                if (ca.contractStatus === "no_data") return "Vigente sin monto";
                const pct = ca.desvioPercent ?? 0;
                if (pct > 5) return "Con desvío";
                if (pct < -5) return "Pago inferior";
                return "Sin desvío";
            })(),
        },
    ] : null;

    return (
        <div className="space-y-6">
            {/* PANEL 1: DATOS DEL SALÓN SELECCIONADO */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#7a1515]/5 via-transparent to-[#b8891a]/3 rounded-2xl border border-[#b8891a]/15 shadow-md shadow-[#7a1515]/5" />
                <div className="glass-card p-6 md:p-8 relative">

                    {/* Header */}
                    <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-[#b8891a]/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#7a1515]/10 flex items-center justify-center">
                                <Building2 size={18} className="text-[#b8891a]" />
                            </div>
                            <h2 className="text-lg font-bold text-[#1a1208] tracking-wider font-display">Datos del Salón</h2>
                        </div>

                        {/* Salon Selectors */}
                        <div className="flex flex-wrap items-start gap-4">

                            {/* Predictive search input */}
                            <PredictiveSearch
                                salones={salones}
                                onSelect={handleSelectSearch}
                                renderItem={renderSalonItem}
                            />

                             {/* Divider */}
                             <div className="flex items-end pb-2 text-[#856f57] text-xs font-bold select-none">ó</div>

                            {/* Select dropdown */}
                            <SalonSelector
                                value={selectedSalonId}
                                onChange={setSelectedSalonId}
                                salones={salones}
                            />
                        </div>

                        {/* Validation Alert */}
                        {selectedSalonId && !selectedSalon && (
                             <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 flex items-center gap-2">
                                 <AlertCircle size={16} className="text-amber-700" />
                                 <span className="text-sm text-amber-700 font-medium">No hay datos para el salon solicitado</span>
                             </div>
                        )}

                        {/* Salon Basic Info — compact row */}
                        {selectedSalon && (
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${selectedSalon.estado_salon === "ACTIVO" ? "bg-green-100 text-green-700" :
                                    selectedSalon.estado_salon === "OBRA" ? "bg-amber-100 text-amber-700" :
                                        "bg-[#ede8e0] text-[#6b5d4a]"
                                    }`}>
                                    {selectedSalon.estado_salon}
                                </span>
                                <span className="text-[#9e8b74] text-xs">·</span>
                                 <span className="text-xs text-[#7a6d5a] font-bold uppercase">Tier</span>
                                <span className="text-xs font-bold text-[#1a1208]">{selectedSalon.tier}</span>
                                <span className="text-[#9e8b74] text-xs">·</span>
                                <span className="text-xs text-[#7a6d5a] font-bold uppercase">Municipio</span>
                                <span className="text-xs font-bold text-[#1a1208]">{selectedSalon.municipio_salon}</span>
                                <span className="text-[#9e8b74] text-xs">·</span>
                                <span className="text-xs text-[#7a6d5a] font-bold uppercase">Sup.</span>
                                <span className="text-xs font-bold text-[#1a1208]">{selectedSalon.mt2_salon} m²</span>
                                <span className="text-[#9e8b74] text-xs">·</span>
                                <span className="text-xs text-[#7a6d5a] font-bold uppercase">PAX</span>
                                <span className="text-xs font-bold text-[#1a1208]">{selectedSalon.pax_calculado}</span>
                            </div>
                        )}
                    </div>

                    {selectedSalon && semaforos ? (
                        <div className="space-y-4">
                            {/* ── SEMAPHORE PANEL ── */}
                            <div>
                                <p className="text-[10px] text-[#7a6d5a] uppercase font-black tracking-[0.2em] mb-3">Semáforos</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {semaforos.map((sem) => {
                                        const hex = getSemaphoreColor(sem.color);
                                        return (
                                            <div
                                                key={sem.label}
                                                className="relative p-4 rounded-xl border flex flex-col items-center text-center gap-2 overflow-hidden"
                                                style={{ background: `${hex}08`, borderColor: `${hex}25` }}
                                            >
                                                <div className="absolute inset-0 opacity-5 pointer-events-none"
                                                    style={{ background: `radial-gradient(circle at 50% 0%, ${hex}, transparent 70%)` }} />
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center relative z-10"
                                                    style={{ background: `${hex}15`, border: `2px solid ${hex}40` }}>
                                                    <SemaforoIcon color={sem.color} size={16} />
                                                </div>
                                                <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-[0.18em] relative z-10">{sem.label}</span>
                                                <span className="text-xs font-black uppercase tracking-wider relative z-10" style={{ color: hex }}>{sem.sublabel}</span>
                                                {sem.value !== "—" && (
                                                    <span className="text-[10px] text-[#7a6d5a] font-mono relative z-10">{sem.value}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>


                            {/* ── DETAIL PANELS — compact 3-column ── */}
                            <div>
                                <p className="text-[10px] text-[#7a6d5a] uppercase font-black tracking-[0.2em] mb-3">Indicadores Detallados</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {/* Eventos */}
                                    <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Activity size={11} className="text-[#b8891a]" />
                                             <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Eventos</span>
                                        </div>
                                        <span className="text-xl font-black text-[#1a1208]">{formatNumber(selectedSalon.cantidad_eventos_salon || 0)}</span>
                                    </div>
                                    {/* Invitados */}
                                    <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Users size={11} className="text-[#b8891a]" />
                                             <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Invitados</span>
                                        </div>
                                        <span className="text-xl font-black text-[#1a1208]">{formatNumber(selectedSalon.total_invitados_salon || 0)}</span>
                                    </div>
                                    {/* Ventas */}
                                    <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <DollarSign size={11} className="text-green-600" />
                                             <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Ventas</span>
                                        </div>
                                        <span className="text-sm font-black text-green-600">{formatARS(selectedSalon.ventas_totales_salon || 0)}</span>
                                    </div>
                                    {/* Costos */}
                                    <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Receipt size={11} className="text-red-500" />
                                             <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Costos</span>
                                        </div>
                                        <span className="text-sm font-black text-red-500">{formatARS(selectedSalon.costos_totales_salon || 0)}</span>
                                    </div>
                                    {/* Rentabilidad */}
                                    <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <TrendingUp size={11} className="text-emerald-600" />
                                             <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Rentab.</span>
                                        </div>
                                        <span className={`text-xl font-black ${(selectedSalon.rentabilidad_salon || 0) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {formatPercentage((selectedSalon.rentabilidad_salon || 0) * 100, 1)}
                                        </span>
                                    </div>
                                    {/* Partic. Margen */}
                                    <div className="p-3 rounded-xl bg-[#faf8f4] border border-[#b8891a]/12 flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <BrainCircuit size={11} className="text-[#b8891a]" />
                                             <span className="text-[9px] text-[#7a6d5a] uppercase font-black tracking-widest">Part. Margen</span>
                                        </div>
                                        <span className="text-xl font-black text-[#1a1208]">
                                            {formatPercentage((selectedSalon.participacion_margen || 0) * 100, 1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Building2 size={40} className="text-[#b8891a]/30 mb-4" />
                            <p className="text-[#7a6d5a] text-sm font-medium">Seleccioná un salón para ver el resumen de semáforos e indicadores</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* MAP + SALON LIST — positioned between Datos del Salón and Vista General */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 min-h-[400px]">
                    <h2 className="text-lg font-semibold text-[#1a1208] mb-4 flex items-center gap-2 font-display">
                        <MapPin size={18} className="text-[#b8891a]" />
                        Mapa de Red de Salones
                    </h2>
                    <div className="w-full h-[400px]">
                        <GoogleMapView
                            salones={filtered}
                            selectedSalon={selectedSalon}
                            onSelectSalon={handleSelectSalon}
                        />
                    </div>
                </div>

                {/* Salon List */}
                <div className="glass-card p-6 max-h-[460px] overflow-y-auto">
                    <h2 className="text-lg font-semibold text-[#1a1208] mb-4 flex items-center gap-2 font-display">
                        <Activity size={18} className="text-[#b8891a]" />
                        Listado General ({filtered.length})
                    </h2>
                    <div className="space-y-1">
                        {filtered.map((salon) => (
                            <button
                                key={salon.id_salon}
                                onClick={() => handleSelectSalon(salon)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all border ${selectedSalon?.id_salon === salon.id_salon
                                    ? "border-[#b8891a]/30 bg-[#7a1515]/8"
                                    : "border-transparent hover:bg-[#7a1515]/4"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                         <span className={`text-xs ${selectedSalon?.id_salon === salon.id_salon ? "text-[#1a1208] font-medium" : "text-[#7a6d5a]"}`}>
                                            {salon.nombre_salon}
                                        </span>
                                        {salon.estado_salon !== "ACTIVO" && (
                                             <span className={`text-[8px] font-bold uppercase ${salon.estado_salon === "OBRA" ? "text-amber-600" : "text-[#856f57]"}`}>
                                                {salon.estado_salon}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        {[salon.performance?.color, salon.benchmark?.color, salon.efficiency?.color].map((c, i) => (
                                            c && <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSemaphoreColor(c) }} />
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* PANEL 2: VISTA GENERAL DE SALONES */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#7a1515]/3 via-transparent to-[#b8891a]/3 rounded-2xl border border-[#b8891a]/12 shadow-sm" />
                <div className="glass-card p-6 md:p-8 relative">
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#7a1515]/10 flex items-center justify-center">
                                    <LayoutGrid size={18} className="text-[#b8891a]" />
                                </div>
                                <h2 className="text-lg font-bold text-[#1a1208] tracking-wider font-display">Vista General de Salones</h2>
                            </div>

                            {/* Single Estado filter */}
                            <div className="flex items-center gap-3">
                                <div className="flex gap-2">
                                    {[
                                        { value: null, label: "Todos" },
                                        { value: "ACTIVO", label: "Activos" },
                                        { value: "OBRA", label: "En Obra" },
                                        { value: "DEVUELTOS", label: "Devueltos" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.label}
                                            onClick={() => setSelectedEstado(opt.value)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${selectedEstado === opt.value
                                                ? "bg-[#7a1515]/12 border-[#b8891a]/35 text-[#7a1515]"
                                                : "bg-[#faf8f4] border-[#b8891a]/15 text-[#7a6d5a] hover:text-[#1a1208] hover:bg-[#7a1515]/6"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards — 6 cards in 3+3 grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            {
                                label: "Red de Salones",
                                value: filtered.length.toString(),
                                icon: Building2,
                                color: "#c9a227",
                                sub: `${activeSalones.length} activos en red`
                            },
                            {
                                label: "Facturación Total",
                                value: formatARS(totalRevenue),
                                icon: DollarSign,
                                color: "#22c55e",
                                sub: "salones activos · periodo"
                            },
                            {
                                label: "Costos Totales",
                                value: formatARS(totalCosts),
                                icon: Receipt,
                                color: "#ef4444",
                                sub: "salones activos · periodo"
                            },
                            {
                                label: "Total Invitados",
                                value: formatNumber(totalGuests),
                                icon: Users,
                                color: "#8b1a1a",
                                sub: `${formatNumber(totalEvents)} eventos · acumulado`
                            },
                            {
                                label: "Ticket Prom. / Evento",
                                value: avgTicket > 0 ? formatARS(avgTicket) : "—",
                                icon: TrendingUp,
                                color: "#c9a227",
                                sub: "promedio entre salones activos"
                            },
                            {
                                label: "Incidencia Promedio",
                                value: formatPercentage(avgIncidencia * 100, 1),
                                icon: BrainCircuit,
                                color: avgIncidencia * 100 > 25 ? "#ef4444" : avgIncidencia * 100 > 15 ? "#eab308" : "#22c55e",
                                sub: "alquiler / facturación"
                            },
                        ].map((kpi) => {
                            const Icon = kpi.icon;
                            return (
                                <div key={kpi.label} className="p-5 rounded-2xl bg-white border border-[#b8891a]/12 hover:border-[#b8891a]/25 hover:shadow-sm transition-all group/kpi">
                                    <div className="flex items-center justify-between mb-4">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover/kpi:scale-110 duration-300"
                                            style={{ background: `${kpi.color}12`, border: `1px solid ${kpi.color}25` }}
                                        >
                                            <Icon size={20} style={{ color: kpi.color }} />
                                        </div>
                                         <span className="text-[10px] text-[#856f57] uppercase tracking-wider font-bold text-right max-w-[120px]">{kpi.sub}</span>
                                    </div>
                                    <p className={`font-bold text-[#1a1208] transition-all leading-tight ${kpi.value.length > 12 ? "text-xl md:text-2xl" : "text-2xl"}`}>
                                        {kpi.value}
                                    </p>
                                     <p className="text-xs text-[#7a6d5a] uppercase font-bold mt-1 tracking-tight">{kpi.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
