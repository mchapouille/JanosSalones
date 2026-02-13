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
    AlertCircle
} from "lucide-react";
import { getSemaphoreColor, TIER_DEFINITIONS, calcGlobalStatus, type StrategicWeights, DEFAULT_WEIGHTS, TIER_MEDIANS, get_color_from_incidence } from "@/lib/calculations";
import { formatARS, formatNumber, formatPercentage, formatMultiplier } from "@/lib/formatters";
import { getSalonesData, type SalonIntegral } from "@/lib/sample-data";
import GoogleMapView from "@/components/GoogleMapView";
import { useDashboard } from "@/components/DashboardContext";

export default function DashboardPage() {
    const { selectedYear, setSelectedYear, availableYears } = useDashboard();
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
    const [selectedSalonYear, setSelectedSalonYear] = useState<number | null>(null);
    const salones = useMemo(() => getSalonesData(selectedYear), [selectedYear]);
    const [selectedTier, setSelectedTier] = useState<number | null>(null);
    const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
    const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);
    const [weights, setWeights] = useState<StrategicWeights>(DEFAULT_WEIGHTS);
    const [showWeights, setShowWeights] = useState(true);

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

        if (selectedYear === null) {
            const uniqueSalons: Record<number, SalonIntegral> = {};
            list.forEach(s => {
                if (!uniqueSalons[s.id_salon] || s.year > uniqueSalons[s.id_salon].year) {
                    uniqueSalons[s.id_salon] = s;
                }
            });
            return Object.values(uniqueSalons).sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon));
        }
        return list;
    }, [salones, selectedTier, selectedEstado, selectedMunicipio, selectedYear]);

    // Get selected salon based on ID and Year
    const selectedSalon = useMemo(() => {
        if (!selectedSalonId || !selectedSalonYear) return null;
        return getSalonesData(null).find(s => s.id_salon === selectedSalonId && s.year === selectedSalonYear) || null;
    }, [selectedSalonId, selectedSalonYear]);

    const handleSelectSalon = (salon: SalonIntegral | null) => {
        if (salon) {
            setSelectedSalonId(salon.id_salon);
            setSelectedSalonYear(salon.year);
        } else {
            setSelectedSalonId(null);
            setSelectedSalonYear(null);
        }
    };

    const activeSalones = filtered.filter((s) => s.estado_salon === "ACTIVO");
    const obraSalones = filtered.filter((s) => s.estado_salon === "OBRA");
    const devueltosSalones = filtered.filter((s) => s.estado_salon === "DEVUELTOS");

    const totalRevenue = activeSalones.reduce((s, x) => s + (x.ventas_totales_salon || 0), 0);
    const totalEvents = activeSalones.reduce((s, x) => s + (x.cantidad_eventos_salon || 0), 0);
    const avgIncidence = activeSalones.length > 0
        ? (activeSalones.reduce((s, x) => s + (x.performance?.rentIncidence || 0), 0) / activeSalones.length) * 100
        : 0;

    const strategicStatus = useMemo(() => {
        if (!selectedSalon) return null;
        return calcGlobalStatus(
            selectedSalon.performance ?? undefined,
            selectedSalon.benchmark,
            selectedSalon.efficiency,
            weights
        );
    }, [selectedSalon, weights]);

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
                            {/* Filter A: Year Selector */}
                            <select
                                value={selectedSalonYear ?? ""}
                                onChange={(e) => {
                                    const year = e.target.value ? parseInt(e.target.value) : null;
                                    setSelectedSalonYear(year);
                                    // Reset salon selection when year changes
                                    if (year && selectedSalonId) {
                                        const exists = getSalonesData(null).find(s => s.id_salon === selectedSalonId && s.year === year);
                                        if (!exists) {
                                            setSelectedSalonId(null);
                                        }
                                    }
                                }}
                                className="bg-slate-900 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60 min-w-[140px] font-bold"
                            >
                                <option value="">Año...</option>
                                {availableYears.map((y) => (
                                    <option key={y} value={y}>Año {y}</option>
                                ))}
                            </select>

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
                                    // Get unique salons
                                    const uniqueSalons = Array.from(new Set(getSalonesData(null).map(s => s.id_salon)))
                                        .map(id => {
                                            const salon = getSalonesData(null).find(s => s.id_salon === id);
                                            return salon;
                                        })
                                        .filter(Boolean)
                                        .sort((a, b) => a!.nombre_salon.localeCompare(b!.nombre_salon));

                                    return uniqueSalons.map(s => s && (
                                        <option key={s.id_salon} value={s.id_salon}>
                                            {s.nombre_salon} ({s.id_salon})
                                        </option>
                                    ));
                                })()}
                            </select>
                        </div>

                        {/* Validation Alert */}
                        {selectedSalonId && selectedSalonYear && !selectedSalon && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
                                <AlertCircle size={16} className="text-amber-400" />
                                <span className="text-sm text-amber-400 font-medium">No hay datos para el periodo solicitado</span>
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
                                        <p className="text-2xl font-bold text-white tracking-tight">{selectedSalon?.performance ? formatMultiplier(selectedSalon.performance.multiplier) : '—'}</p>
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
                                        <p className="text-2xl font-bold tracking-tight" style={{ color: selectedSalon?.performance ? get_color_from_incidence(selectedSalon.performance.rentIncidence) : 'white' }}>
                                            {selectedSalon?.performance ? formatPercentage(selectedSalon.performance.rentIncidence * 100) : '—'}
                                        </p>
                                    </div>
                                </div>
                                <div className="group/metric">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 transition-colors group-hover/metric:text-purple-400 tracking-widest leading-tight h-4 flex items-center justify-center">Participación Margen</p>
                                    <div className="h-10 flex items-center justify-center">
                                        <p className="text-2xl font-bold text-white tracking-tight">
                                            {selectedSalon?.performance
                                                ? formatPercentage(selectedSalon.performance.marginContribution * 100)
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* PANEL 2: ANÁLISIS DE DECISIÓN ESTRATÉGICA */}
            {selectedSalon && strategicStatus && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden group pt-2"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/5" />
                    <div className="glass-card p-6 md:p-8 relative">
                        {/* Header: Global Status & Salon Name */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-white/5 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <BrainCircuit size={18} className="text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Análisis de Decisión Estratégica</h3>
                            </div>

                            <div className="flex flex-col md:items-end text-left md:text-right flex-1 min-w-0">
                                <h4 className="text-xl font-bold text-white tracking-tight break-words">{selectedSalon.nombre_salon}</h4>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">
                                    Tier {selectedSalon.tier} • {selectedSalon.municipio_salon}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Left: Global Indicator */}
                            <div className="lg:w-1/4 flex flex-col justify-center items-center text-center p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-inner min-h-[300px]">
                                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-6 font-bold">Estatus Estratégico Global</span>
                                <div
                                    className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative"
                                    style={{ background: `${getSemaphoreColor(strategicStatus.color)}15`, border: `2px solid ${getSemaphoreColor(strategicStatus.color)}40` }}
                                >
                                    <div
                                        className="w-14 h-14 rounded-full animate-pulse"
                                        style={{ background: getSemaphoreColor(strategicStatus.color), opacity: 0.2 }}
                                    />
                                    <div
                                        className="absolute w-5 h-5 rounded-full"
                                        style={{ background: getSemaphoreColor(strategicStatus.color), boxShadow: `0 0 20px ${getSemaphoreColor(strategicStatus.color)}` }}
                                    />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">{strategicStatus.label}</h3>
                                <p className="text-slate-400 text-xs leading-relaxed max-w-[200px] mx-auto">
                                    {strategicStatus.description}
                                </p>
                            </div>

                            {/* Right: The 3 Strategic Pillars */}
                            <div className="lg:w-3/4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* 1. PERFORMANCE */}
                                <div className="flex flex-col bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden group/pillar hover:border-blue-500/30 transition-colors">
                                    <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Performance</span>
                                        <div
                                            className="w-2 h-2 rounded-full cursor-help"
                                            style={{ background: getSemaphoreColor(selectedSalon.performance?.color || 'gray') }}
                                            title="Calculado sobre rentabilidad operativa e incidencia de alquiler"
                                        />
                                    </div>
                                    <div className="p-5 flex flex-col gap-4">
                                        {[
                                            { label: 'Score Rentabilidad', value: `${formatNumber(selectedSalon.performance?.score || 0)} pts`, highlight: true },
                                            { label: 'Cant. Eventos', value: formatNumber(selectedSalon.cantidad_eventos_salon || 0) },
                                            { label: 'Cant. Invitados', value: formatNumber(selectedSalon.total_invitados_salon || 0) },
                                            { label: 'Costos Var.', value: formatARS(selectedSalon.costos_variables_salon || 0) },
                                            { label: 'Costos Totales', value: formatARS(selectedSalon.costos_totales_salon || 0) }
                                        ].map((row, idx) => (
                                            <div key={idx} className="flex flex-col border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">{row.label}</span>
                                                <span className={`text-sm font-bold ${row.highlight ? 'text-blue-400' : 'text-white'}`}>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-5 pb-3">
                                        <p className="text-[9px] text-slate-500 italic">* Costos son anuales</p>
                                    </div>
                                </div>

                                {/* 2. BENCHMARKING */}
                                <div className="flex flex-col bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden group/pillar hover:border-cyan-500/30 transition-colors">
                                    <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Benchmarking</span>
                                        <div
                                            className="w-2 h-2 rounded-full cursor-help"
                                            style={{ background: getSemaphoreColor(selectedSalon.benchmark?.color || 'gray') }}
                                            title="Calculado comparando precios y costos vs mercado"
                                        />
                                    </div>
                                    <div className="p-5 flex flex-col gap-4">
                                        {[
                                            { label: 'm² Salón', value: `${formatNumber(selectedSalon.mt2_salon || 0)} m²` },
                                            { label: 'm² Mercado', value: `${formatNumber(selectedSalon.benchmark?.marketMt2 || 0)} m²` },
                                            { label: 'Precio Alquiler', value: formatARS(selectedSalon.contractAudit?.contractAmount || selectedSalon.costos_fijos_salon || 0) },
                                            { label: 'Semaforo Tipo', value: `Tier ${selectedSalon.tier}` },
                                            { label: 'Desvío Mercado', value: formatPercentage(selectedSalon.benchmark?.marketDeviation || 0), highlight: true },
                                            { label: 'Precio m²', value: formatARS(selectedSalon.benchmark?.rentPerMt2 || 0) }
                                        ].map((row, idx) => (
                                            <div key={idx} className="flex flex-col border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">{row.label}</span>
                                                <span className={`text-sm font-bold ${row.highlight ? 'text-cyan-400' : 'text-white'}`}>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. EFICIENCIA */}
                                <div className="flex flex-col bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden group/pillar hover:border-emerald-500/30 transition-colors">
                                    <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Eficiencia</span>
                                        <div
                                            className="w-2 h-2 rounded-full cursor-help"
                                            style={{ background: getSemaphoreColor(selectedSalon.efficiency?.color || 'gray') }}
                                            title="Calculado sobre índice global de desviación de la media"
                                        />
                                    </div>
                                    <div className="p-5 flex flex-col flex-1 justify-between">
                                        <div className="flex flex-col gap-4">
                                            {[
                                                { label: 'PAX Calculado', value: formatNumber(selectedSalon.pax_calculado || 0) },
                                                { label: 'm² Salón', value: `${formatNumber(selectedSalon.mt2_salon || 0)} m²` },
                                                { label: 'Precio Alquiler', value: formatARS(selectedSalon.contractAudit?.contractAmount || selectedSalon.costos_fijos_salon || 0) },
                                                { label: 'Desvío Mediana', value: formatPercentage(selectedSalon.efficiency?.medianDeviation || 0) }
                                            ].map((row, idx) => (
                                                <div key={idx} className="flex flex-col border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">{row.label}</span>
                                                    <span className="text-sm font-bold text-white">{row.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-emerald-500/20 text-center">
                                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Dictamen</span>
                                            <p className={`text-lg font-black mt-1 ${selectedSalon.efficiency?.color === 'red' || selectedSalon.efficiency?.color === 'yellow'
                                                ? 'text-red-400'
                                                : 'text-emerald-400'
                                                }`}>
                                                {selectedSalon.efficiency?.color === 'green' ? 'ESTABILIZADO' : 'BAJO RENDIMIENTO'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weight sliders section (Simplified for 3 pillars) */}
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <button
                                onClick={() => setShowWeights(!showWeights)}
                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-400 transition-colors mb-4 font-bold uppercase tracking-wider"
                            >
                                <BrainCircuit size={14} />
                                {showWeights ? "Ocultar Ponderación" : "Ajustar Ponderación del Estatus Global"}
                            </button>

                            {showWeights && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {[
                                        { id: 'performance', label: 'Performance', color: 'bg-blue-500', text: 'text-blue-400' },
                                        { id: 'benchmarking', label: 'Benchmarking', color: 'bg-cyan-500', text: 'text-cyan-400' },
                                        { id: 'efficiency', label: 'Eficiencia', color: 'bg-emerald-500', text: 'text-emerald-400' }
                                    ].map((w) => (
                                        <div key={w.id} className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{w.label}</span>
                                                <span className={`text-sm font-mono font-bold ${w.text}`}>{(weights as any)[w.id]}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={(weights as any)[w.id]}
                                                onChange={(e) => setWeights({ ...weights, [w.id]: parseInt(e.target.value) })}
                                                className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-${w.color.split('-')[1]}-500`}
                                            />
                                        </div>
                                    ))}
                                    <div className="md:col-span-3 pt-2">
                                        <p className="text-[9px] text-slate-600 text-center">
                                            * La suma de pesos afecta el cálculo del índice global. El módulo Contratos ya no impacta en esta decisión.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
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
                            {/* Year Filter */}
                            <select
                                value={selectedYear ?? ""}
                                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                                className="bg-slate-900 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60 min-w-[140px] font-bold"
                            >
                                <option value="">Año (Todos)</option>
                                {availableYears.map((y) => (
                                    <option key={y} value={y}>Año {y}</option>
                                ))}
                            </select>

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
                                value: selectedYear ? filtered.length.toString() : "0",
                                icon: Building2,
                                color: "#2563eb",
                                sub: selectedYear ? (selectedEstado ? `Filtrado por ${selectedEstado}` : `${salones.filter(s => s.estado_salon === "ACTIVO").length} activos en red`) : "Seleccione año..."
                            },
                            {
                                label: "Facturación Total",
                                value: selectedYear ? formatARS(totalRevenue) : "$ 0",
                                icon: DollarSign,
                                color: "#22c55e",
                                sub: selectedYear ? "periodo analizado" : "—"
                            },
                            {
                                label: "Eventos Totales",
                                value: selectedYear ? formatNumber(totalEvents) : "0",
                                icon: Users,
                                color: "#8b5cf6",
                                sub: selectedYear ? "acumulado" : "—"
                            },
                            {
                                label: "Incidencia Promedio",
                                value: selectedYear ? formatPercentage(avgIncidence) : "0%",
                                icon: TrendingUp,
                                color: !selectedYear ? "#64748b" : (avgIncidence > 25 ? "#ef4444" : avgIncidence > 15 ? "#eab308" : "#22c55e"),
                                sub: selectedYear ? (avgIncidence > 25 ? "⚠ Alerta" : "normal") : "—"
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
                                key={`${salon.id_salon}-${salon.year}`}
                                onClick={() => handleSelectSalon(salon)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all border ${selectedSalon?.id_salon === salon.id_salon && selectedSalon?.year === salon.year
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
