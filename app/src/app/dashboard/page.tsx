"use client";

import { useState, useMemo, useEffect } from "react";
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
    X,
    HelpCircle,
    AlertCircle,
    Sliders
} from "lucide-react";
import { getSemaphoreColor, TIER_DEFINITIONS, get_color_from_incidence } from "@/lib/calculations";
import { formatARS, formatNumber, formatPercentage, formatMultiplier } from "@/lib/formatters";
import { getSalonesData, type SalonIntegral } from "@/lib/sample-data";
import GoogleMapView from "@/components/GoogleMapView";
import { useDashboard } from "@/components/DashboardContext";

function interpolate(val: number, x0: number, x1: number, y0: number, y1: number) {
    if (val <= x0) return y0;
    if (val >= x1) return y1;
    return y0 + ((val - x0) / (x1 - x0)) * (y1 - y0);
}

export default function DashboardPage() {
    const { } = useDashboard();
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
    const salones = useMemo(() => getSalonesData(), []);
    const [selectedTier, setSelectedTier] = useState<number | null>(null);
    const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
    const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
    const [ipWeights, setIpWeights] = useState({
        margen: 40,
        incidencia: 30,
        ticketEvento: 15,
        ticketInvitado: 15
    });
    const [showWeights, setShowWeights] = useState(true);
    const [rentReduction, setRentReduction] = useState<number>(0);

    const municipios = useMemo(
        () => [...new Set(salones.map((s) => s.municipio_salon).filter(Boolean))] as string[],
        [salones]
    );

    const filtered = useMemo(() => {
        let list = salones.filter((s) => {
            if (selectedTier && s.tier !== selectedTier) return false;
            if (selectedEstado && s.estado_salon !== selectedEstado) return false;
            if (selectedMunicipio && s.municipio_salon !== selectedMunicipio) return false;
            return true;
        });
        return list;
    }, [salones, selectedTier, selectedEstado, selectedMunicipio]);

    // Get selected salon based on ID
    const selectedSalon = useMemo(() => {
        if (!selectedSalonId) return null;
        return salones.find(s => s.id_salon === selectedSalonId) || null;
    }, [selectedSalonId, salones]);

    const handleSelectSalon = (salon: SalonIntegral | null) => {
        if (salon) {
            setSelectedSalonId(salon.id_salon);
        } else {
            setSelectedSalonId(null);
        }
    };

    const activeSalones = filtered.filter((s) => s.estado_salon === "ACTIVO");
    const obraSalones = filtered.filter((s) => s.estado_salon === "OBRA");
    const devueltosSalones = filtered.filter((s) => s.estado_salon === "DEVUELTOS");

    const totalRevenue = activeSalones.reduce((s, x) => s + (x.ventas_totales_salon || 0), 0);
    const totalEvents = activeSalones.reduce((s, x) => s + (x.cantidad_eventos_salon || 0), 0);

    const validEff = activeSalones.filter(s => (s.indice_global_desviacion_mediana || 0) > 0);
    const avgEfficiency = validEff.length > 0
        ? validEff.reduce((acc, s) => acc + (s.indice_global_desviacion_mediana || 0), 0) / validEff.length
        : 0;

    const salonsInAlert = activeSalones.filter(s => s.semaforo_indice_global === 'REVISAR').length;

    const dynamicScoreAndCategory = useMemo(() => {
        if (!selectedSalon) return null;

        const incPct = (selectedSalon.incidencia_alquiler_sobre_facturacion_anual || 0) * 100;
        const pts_inc = Math.max(0, Math.min(100, interpolate(incPct, 5, 30, 100, 0)));

        // Use an approximate max margin from the network as the 95th percentile meta
        const maxMargenRed = Math.max(...salones.map(s => s.margen_individual || 0));
        const pts_mar = Math.max(0, Math.min(100, interpolate(selectedSalon.margen_individual || 0, 0, maxMargenRed || 1, 0, 100)));

        const pts_eve = Math.max(0, Math.min(100, interpolate(selectedSalon.ticket_evento_promedio || 0, 10000000, 40000000, 0, 100)));
        const pts_inv = Math.max(0, Math.min(100, interpolate(selectedSalon.ticket_persona_promedio || 0, 150000, 500000, 0, 100)));

        const totalWeight = ipWeights.margen + ipWeights.incidencia + ipWeights.ticketEvento + ipWeights.ticketInvitado;
        if (totalWeight === 0) return { score: 0, categoria: "Sin Peso", color: "gray" };

        const wMargen = ipWeights.margen / totalWeight;
        const wInc = ipWeights.incidencia / totalWeight;
        const wEve = ipWeights.ticketEvento / totalWeight;
        const wInv = ipWeights.ticketInvitado / totalWeight;

        let currentScore = (pts_mar * wMargen) + (pts_inc * wInc) + (pts_eve * wEve) + (pts_inv * wInv);

        if ((selectedSalon.margen_individual || 0) < 0) {
            currentScore = 0;
        }

        // Provide the visual categorization
        let categoria = "muy_baja";
        let color = "critical";
        let label = "Riesgo Crítico";

        if (currentScore >= 60) {
            categoria = "alta";
            color = "green";
            label = "Desempeño Alto";
        } else if (currentScore >= 40) {
            categoria = "media";
            color = "yellow";
            label = "Desempeño Medio";
        } else if (currentScore >= 5) {
            categoria = "baja";
            color = "red";
            label = "Desempeño Bajo";
        }

        return { score: currentScore, categoria, color, label };
    }, [selectedSalon, ipWeights, salones]);

    // What-If Simulator Calcs
    const simulation = useMemo(() => {
        if (!selectedSalon) return null;

        const baseRent = selectedSalon.costos_fijos_salon || 0;
        const reductionDecimal = rentReduction / 100;

        const newCostosFijos = baseRent * (1 - reductionDecimal);
        const avgMonthlySales = selectedSalon.venta_mensual_promedio_meses_activo || 1;

        const newIncidence = (newCostosFijos / avgMonthlySales) * 100;
        const newMargin = (selectedSalon.ventas_totales_salon || 0) - (selectedSalon.costos_variables_salon || 0) - (newCostosFijos * 12);

        return {
            newRent: newCostosFijos,
            newIncidence,
            newMargin,
            marginImprovement: newMargin - (selectedSalon.margen_individual || 0)
        };
    }, [selectedSalon, rentReduction]);

    return (
        <div className="space-y-6">
            {/* PANEL 1: DATOS DEL SALÓN SELECCIONADO */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/5" />
                <div className="glass-card p-6 md:p-8 relative">
                    {/* Header with Filters */}
                    <div className="flex flex-col gap-6 mb-8 pb-6 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <Building2 size={18} className="text-blue-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white tracking-wider">Datos del Salón</h2>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Filter B: Salon Selector */}
                            <select
                                value={selectedSalonId ?? ""}
                                onChange={(e) => {
                                    const id = e.target.value ? parseInt(e.target.value) : null;
                                    setSelectedSalonId(id);
                                }}
                                className="bg-slate-900 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60 min-w-[280px] font-bold"
                            >
                                <option value="">Buscar Salón...</option>
                                {(() => {
                                    // Get unique salons from state
                                    const uniqueSalons = [...salones]
                                        .sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon));

                                    return uniqueSalons.map(s => s && (
                                        <option key={s.id_salon} value={s.id_salon}>
                                            {s.nombre_salon} ({s.id_salon})
                                        </option>
                                    ));
                                })()}
                            </select>
                        </div>

                        {/* Validation Alert */}
                        {selectedSalonId && !selectedSalon && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
                                <AlertCircle size={16} className="text-amber-400" />
                                <span className="text-sm text-amber-400 font-medium">No hay datos para el salon solicitado</span>
                            </div>
                        )}

                        {/* Salon Basic Info */}
                        {selectedSalon && (
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Estado:</span>
                                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${selectedSalon.estado_salon === "ACTIVO" ? "bg-green-500/20 text-green-400" :
                                        selectedSalon.estado_salon === "OBRA" ? "bg-amber-500/20 text-amber-400" :
                                            "bg-slate-500/20 text-slate-400"
                                        }`}>
                                        {selectedSalon.estado_salon}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Tier:</span>
                                    <span className="text-sm font-bold text-white">{selectedSalon.tier}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Municipio:</span>
                                    <span className="text-sm font-bold text-white">{selectedSalon.municipio_salon}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 uppercase font-bold">Superficie:</span>
                                    <span className="text-sm font-bold text-white">{selectedSalon.mt2_salon} m²</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 uppercase font-bold">PAX:</span>
                                    <span className="text-sm font-bold text-white">{selectedSalon.pax_calculado}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Operational Metrics */}
                        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center text-center h-full min-h-[260px]">
                            <div className="flex items-center gap-2 mb-0 w-full justify-center border-b border-white/5 pb-4">
                                <Activity size={16} className="text-blue-400" />
                                <span className="text-[11px] text-slate-500 uppercase font-black tracking-[0.2em]">Operación</span>
                            </div>
                            <div className="flex-1 flex flex-col pt-8 space-y-10 w-full">
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-blue-400 tracking-widest leading-tight h-4 flex items-center justify-center">Cantidad Eventos</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-2xl font-bold text-white tracking-tight">{selectedSalon ? formatNumber(selectedSalon.cantidad_eventos_salon || 0) : '—'}</p>
                                    </div>
                                </div>
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-blue-400 tracking-widest leading-tight h-4 flex items-center justify-center">Cantidad Invitados</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-2xl font-bold text-white tracking-tight">{selectedSalon ? formatNumber(selectedSalon.total_invitados_salon || 0) : '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Data */}
                        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center text-center h-full min-h-[260px]">
                            <div className="flex items-center gap-2 mb-0 w-full justify-center border-b border-white/5 pb-4">
                                <DollarSign size={16} className="text-green-400" />
                                <span className="text-[11px] text-slate-500 uppercase font-black tracking-[0.2em]">Financiero</span>
                            </div>
                            <div className="flex-1 flex flex-col pt-8 space-y-10 w-full">
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-green-400 tracking-widest leading-tight h-4 flex items-center justify-center">Ventas Totales</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-xl font-bold text-green-400 tracking-tight leading-none">{selectedSalon ? formatARS(selectedSalon.ventas_totales_salon || 0) : '—'}</p>
                                    </div>
                                </div>
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-red-400 tracking-widest leading-tight h-4 flex items-center justify-center">Costos Totales</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-xl font-bold text-red-400 tracking-tight leading-none">{selectedSalon ? formatARS(selectedSalon.costos_totales_salon || 0) : '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profitability */}
                        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center text-center h-full min-h-[260px]">
                            <div className="flex items-center gap-2 mb-0 w-full justify-center border-b border-white/5 pb-4">
                                <TrendingUp size={16} className="text-emerald-400" />
                                <span className="text-[11px] text-slate-500 uppercase font-black tracking-[0.2em]">Rentabilidad</span>
                            </div>
                            <div className="flex-1 flex flex-col pt-8 space-y-10 w-full">
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-emerald-400 tracking-widest leading-tight h-4 flex items-center justify-center">Rentabilidad (%)</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-2xl font-bold text-emerald-400 tracking-tight">
                                            {selectedSalon
                                                ? formatPercentage((selectedSalon.rentabilidad_salon || 0) * 100, 2)
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-emerald-400 tracking-widest leading-tight h-4 flex items-center justify-center">Retorno s/ Alquiler</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-2xl font-bold text-white tracking-tight">{selectedSalon ? formatMultiplier(selectedSalon.retorno_sobre_alquiler || 0) : '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Ratios */}
                        <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center text-center h-full min-h-[260px]">
                            <div className="flex items-center gap-2 mb-0 w-full justify-center border-b border-white/5 pb-4">
                                <BrainCircuit size={16} className="text-purple-400" />
                                <span className="text-[11px] text-slate-500 uppercase font-black tracking-[0.2em]">Indicadores</span>
                            </div>
                            <div className="flex-1 flex flex-col pt-8 space-y-10 w-full">
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-purple-400 tracking-widest leading-tight h-4 flex items-center justify-center">Incidencia Alquiler</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-2xl font-bold tracking-tight" style={{ color: selectedSalon ? get_color_from_incidence(selectedSalon.incidencia_alquiler_sobre_facturacion_anual || 0) : 'white' }}>
                                            {selectedSalon ? formatPercentage((selectedSalon.incidencia_alquiler_sobre_facturacion_anual || 0) * 100) : '—'}
                                        </p>
                                    </div>
                                </div>
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-purple-400 tracking-widest leading-tight h-4 flex items-center justify-center">Participación Margen</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-2xl font-bold text-white tracking-tight">
                                            {selectedSalon
                                                ? formatPercentage((selectedSalon.participacion_margen || 0) * 100)
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* PANEL 2: MOTOR IP_SCORE Y SIMULADOR INTERACTIVO */}
            {selectedSalon && dynamicScoreAndCategory && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT PANEL: Motor IP Score & Categorization */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative overflow-hidden group pt-2 h-full"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/5" />
                        <div className="glass-card p-6 md:p-8 relative h-full flex flex-col">

                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-white/5 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <BrainCircuit size={18} className="text-blue-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Motor IP_SCORE</h3>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
                                <div className="flex flex-col items-center justify-center">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4 font-bold text-center">Score Principal</span>
                                    <div
                                        className="w-32 h-32 rounded-full flex items-center justify-center relative shadow-2xl"
                                        style={{ background: `${getSemaphoreColor(dynamicScoreAndCategory.color)}15`, border: `4px solid ${getSemaphoreColor(dynamicScoreAndCategory.color)}50` }}
                                    >
                                        <div
                                            className="absolute inset-0 rounded-full animate-pulse z-0"
                                            style={{ background: getSemaphoreColor(dynamicScoreAndCategory.color), opacity: 0.1 }}
                                        />
                                        <h3 className="text-4xl font-black text-white relative z-10">{dynamicScoreAndCategory.score.toFixed(0)}</h3>
                                        <span className="absolute bottom-2 text-[10px] font-bold" style={{ color: getSemaphoreColor(dynamicScoreAndCategory.color) }}>
                                            PTS
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-center">
                                    <h4 className="text-xl font-bold text-white mb-2">{dynamicScoreAndCategory.label}</h4>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Categorización actual ajustada a ponderaciones personalizadas. La categoría base original del sistema es <span className="text-white font-bold uppercase">{selectedSalon.categoria_ip}</span>.
                                    </p>

                                    <div className="flex gap-2">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800/80 text-white uppercase tracking-wider">
                                            {dynamicScoreAndCategory.categoria}
                                        </span>
                                        <div
                                            className="w-6 h-6 rounded-full"
                                            style={{ background: getSemaphoreColor(dynamicScoreAndCategory.color), boxShadow: `0 0 10px ${getSemaphoreColor(dynamicScoreAndCategory.color)}` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/5">
                                <h4 className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
                                    <Sliders size={14} /> Ponderación Dinámica de Score
                                </h4>

                                <div className="space-y-5">
                                    {[
                                        { id: 'margen', label: 'Margen Individual', value: ipWeights.margen, color: 'bg-emerald-500' },
                                        { id: 'incidencia', label: 'Incidencia Alquiler', value: ipWeights.incidencia, color: 'bg-purple-500' },
                                        { id: 'ticketEvento', label: 'Ticket Evento', value: ipWeights.ticketEvento, color: 'bg-blue-500' },
                                        { id: 'ticketInvitado', label: 'Ticket Invitado', value: ipWeights.ticketInvitado, color: 'bg-cyan-500' }
                                    ].map((w) => (
                                        <div key={w.id} className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{w.label}</span>
                                                <span className={`text-xs font-mono font-bold text-white`}>{w.value} pts</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={w.value}
                                                onChange={(e) => setIpWeights({ ...ipWeights, [w.id]: parseInt(e.target.value) })}
                                                className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:${w.color} transition-all`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT PANEL: Simulador What-If */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="relative overflow-hidden group pt-2 h-full"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-transparent to-blue-600/5 rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/5" />
                        <div className="glass-card p-6 md:p-8 relative h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/5">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                    <TrendingUp size={18} className="text-cyan-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Simulador "What-If"</h3>
                            </div>

                            <div className="mb-8">
                                <label className="text-xs text-slate-400 uppercase font-bold tracking-widest block mb-4">
                                    Reducción de Alquiler / Costos Fijos
                                </label>
                                <div className="flex items-center gap-4 mb-2">
                                    <input
                                        type="range"
                                        min="0" max="50" step="1"
                                        value={rentReduction}
                                        onChange={(e) => setRentReduction(parseInt(e.target.value))}
                                        className="flex-1 h-3 rounded-full appearance-none bg-slate-800 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 hover:[&::-webkit-slider-thumb]:scale-110 transition-all shadow-inner"
                                    />
                                    <span className="text-2xl font-black text-cyan-400 min-w-[3rem] text-right">{rentReduction}%</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-6">Proyecta la mejora de eficiencia aplicando un descuento porcentual sobre el costo de alquiler mensual actual.</p>
                            </div>

                            {simulation && (
                                <div className="grid grid-cols-2 gap-4 mt-auto">
                                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-center">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Nuevo Alquiler</p>
                                        <p className="text-xl font-bold text-white">{formatARS(simulation.newRent)}</p>
                                        <p className="text-[9px] text-slate-500 mt-1 line-through">{formatARS(selectedSalon.costos_fijos_salon || 0)}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-center relative overflow-hidden group/kpi">
                                        <div className={`absolute inset-0 opacity-10 transition-opacity group-hover/kpi:opacity-20`} style={{ background: simulation.newIncidence > 25 ? "red" : simulation.newIncidence > 15 ? "yellow" : "green" }} />
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1 relative z-10">Nueva Incid.</p>
                                        <p className="text-2xl font-black relative z-10" style={{ color: simulation.newIncidence > 25 ? "#ef4444" : simulation.newIncidence > 15 ? "#eab308" : "#22c55e" }}>
                                            {formatPercentage(simulation.newIncidence)}
                                        </p>
                                        <p className="text-[9px] text-slate-500 mt-1 relative z-10">
                                            Origen: {formatPercentage((selectedSalon.incidencia_alquiler_sobre_facturacion_anual || 0) * 100)}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-center">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Nuevo Margen</p>
                                        <p className="text-xl font-bold text-white">{formatARS(simulation.newMargin)}</p>
                                        <p className="text-[9px] text-slate-500 mt-1">Beneficio absoluto tras costos</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-center shadow-inner shadow-emerald-500/10">
                                        <p className="text-[10px] text-emerald-500/80 uppercase tracking-widest font-bold mb-1">Mejora Margen</p>
                                        <p className="text-2xl font-black text-emerald-400">+{formatARS(simulation.marginImprovement)}</p>
                                        <p className="text-[9px] text-emerald-500/60 mt-1">Impacto extra generado</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* PANEL 3: VISTA GENERAL DE SALONES */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 via-transparent to-blue-950/10 rounded-2xl border border-white/5 shadow-2xl" />
                <div className="glass-card p-6 md:p-8 relative">
                    {/* Header with Title and Global Filters */}
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <LayoutGrid size={18} className="text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-wider">Vista General de Salones</h2>
                            </div>
                        </div>

                        {/* General Filters Section */}
                        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-900/40 border border-white/5">

                            <select
                                value={selectedEstado ?? ""}
                                onChange={(e) => setSelectedEstado(e.target.value || null)}
                                className="bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[180px]"
                            >
                                <option value="">Estado (Todos)</option>
                                <option value="ACTIVO">ACTIVO</option>
                                <option value="OBRA">EN OBRA</option>
                                <option value="DEVUELTOS">DEVUELTOS</option>
                            </select>

                            <select
                                value={selectedTier ?? ""}
                                onChange={(e) => setSelectedTier(e.target.value ? parseInt(e.target.value) : null)}
                                className="bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[180px]"
                            >
                                <option value="">Tipo Salon (Todos)</option>
                                {[1, 2, 3, 4, 5].map((t) => (
                                    <option key={t} value={t}>Tier {t}: {TIER_DEFINITIONS[t]?.name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedMunicipio ?? ""}
                                onChange={(e) => setSelectedMunicipio(e.target.value || null)}
                                className="bg-slate-900 border border-slate-700/60 rounded-lg px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50 min-w-[200px]"
                            >
                                <option value="">Municipio (Todos)</option>
                                {municipios.sort().map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>

                            {(selectedTier || selectedEstado || selectedMunicipio) && (
                                <button
                                    onClick={() => { setSelectedTier(null); setSelectedEstado(null); setSelectedMunicipio(null); }}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 ml-2 font-medium bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10 transition-colors"
                                >
                                    <X size={12} /> Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            {
                                label: selectedEstado ? (selectedEstado === "ACTIVO" ? "Salones Activos" : selectedEstado === "OBRA" ? "Salones en Obra" : "Salones Devueltos") : "Red de Salones",
                                value: filtered.length.toString(),
                                icon: Building2,
                                color: "#2563eb",
                                sub: selectedEstado ? `Filtrado por ${selectedEstado}` : `${salones.filter(s => s.estado_salon === "ACTIVO").length} activos en red`
                            },
                            {
                                label: "Facturación Total",
                                value: formatARS(totalRevenue),
                                icon: DollarSign,
                                color: "#22c55e",
                                sub: "periodo analizado"
                            },
                            {
                                label: "Eventos Totales",
                                value: formatNumber(totalEvents),
                                icon: Users,
                                color: "#8b5cf6",
                                sub: "acumulado"
                            },
                            {
                                label: "Eficiencia Promedio",
                                value: avgEfficiency.toFixed(2),
                                icon: TrendingUp,
                                color: avgEfficiency > 1.25 ? "#ef4444" : avgEfficiency < 0.85 ? "#22c55e" : "#eab308",
                                sub: `${salonsInAlert} en alerta (REVISAR)`
                            },
                        ].map((kpi, idx) => {
                            const Icon = kpi.icon;
                            return (
                                <div
                                    key={kpi.label}
                                    className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all group/kpi"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors group-hover/kpi:scale-110 duration-300"
                                            style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}
                                        >
                                            <Icon size={20} style={{ color: kpi.color }} />
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{kpi.sub}</span>
                                    </div>
                                    <p className={`font-bold text-white transition-all leading-tight ${kpi.value.length > 12 ? "text-xl md:text-2xl" : "text-2xl"
                                        }`}>
                                        {kpi.value}
                                    </p>
                                    <p className="text-xs text-slate-500 uppercase font-bold mt-1 tracking-tight">{kpi.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {/* Map + Salon List (Part of Panel 3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 min-h-[400px]">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-blue-400" />
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

                {/* Simplified List */}
                <div className="glass-card p-6 max-h-[460px] overflow-y-auto">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-cyan-400" />
                        Listado General ({filtered.length})
                    </h2>
                    <div className="space-y-1">
                        {filtered.map((salon) => (
                            <button
                                key={`${salon.id_salon}`}
                                onClick={() => handleSelectSalon(salon)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all border ${selectedSalon?.id_salon === salon.id_salon
                                    ? "border-blue-500/40 bg-blue-500/10"
                                    : "border-transparent hover:bg-white/5"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className={`text-xs ${selectedSalon?.id_salon === salon.id_salon ? "text-white font-medium" : "text-slate-400"}`}>{salon.nombre_salon}</span>
                                        {salon.estado_salon !== "ACTIVO" && (
                                            <span className={`text-[8px] font-bold uppercase ${salon.estado_salon === "OBRA" ? "text-amber-500" : "text-slate-500"}`}>
                                                {salon.estado_salon}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        {[salon.performance?.color, salon.efficiency?.color].map((c, i) => (
                                            c && <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSemaphoreColor(c) }} />
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
