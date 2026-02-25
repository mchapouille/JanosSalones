"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Circle,
    Search,
    Receipt,
} from "lucide-react";
import { getSemaphoreColor, TIER_DEFINITIONS, get_color_from_incidence } from "@/lib/calculations";
import { formatARS, formatNumber, formatPercentage, formatMultiplier } from "@/lib/formatters";
import { getSalonesData, type SalonIntegral } from "@/lib/sample-data";
import GoogleMapView from "@/components/GoogleMapView";
import { useDashboard } from "@/components/DashboardContext";

function getSemaforoLabel(color: string): string {
    switch (color) {
        case "green": return "Alta";
        case "yellow": return "Media";
        case "red": return "Baja";
        case "critical": return "Crítico";
        default: return "—";
    }
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
    const { } = useDashboard();
    const [selectedSalonId, setSelectedSalonId] = useState<number | null>(null);
    const salones = useMemo(() => getSalonesData(), []);
    const [selectedEstado, setSelectedEstado] = useState<string | null>(null);

    // Predictive search state
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Close suggestions on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Suggestions: filter by name match, max 8
    const suggestions = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return [...salones]
            .filter(s => s.nombre_salon.toLowerCase().includes(q))
            .sort((a, b) => {
                // Prioritize starts-with matches
                const aStarts = a.nombre_salon.toLowerCase().startsWith(q);
                const bStarts = b.nombre_salon.toLowerCase().startsWith(q);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.nombre_salon.localeCompare(b.nombre_salon);
            })
            .slice(0, 8);
    }, [searchQuery, salones]);

    const handleSelectSuggestion = (salon: SalonIntegral) => {
        setSelectedSalonId(salon.id_salon);
        setSearchQuery("");
        setShowSuggestions(false);
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

    // Semaphore cards for selected salon
    const semaforos = selectedSalon ? [
        {
            label: "Rentabilidad",
            color: selectedSalon.performance?.color || "gray",
            value: `${(selectedSalon.ip_score || 0).toFixed(0)} pts`,
            sublabel: getSemaforoLabel(selectedSalon.performance?.color || "gray"),
        },
        {
            label: "Benchmarking",
            color: selectedSalon.benchmark?.color || "gray",
            value: selectedSalon.benchmark?.deviation != null
                ? `${selectedSalon.benchmark.deviation > 0 ? "+" : ""}${selectedSalon.benchmark.deviation.toFixed(0)}%`
                : "—",
            sublabel: getSemaforoLabel(selectedSalon.benchmark?.color || "gray"),
        },
        {
            label: "Eficiencia",
            color: selectedSalon.efficiency?.color || "gray",
            value: (selectedSalon.efficiency?.globalIndex || 0) > 0
                ? `${(selectedSalon.efficiency.globalIndex).toFixed(2)}x`
                : "—",
            sublabel: getSemaforoLabel(selectedSalon.efficiency?.color || "gray"),
        },
        {
            label: "Contratos",
            color: selectedSalon.contractAudit?.color || "green",
            value: "—",
            sublabel: getSemaforoLabel(selectedSalon.contractAudit?.color || "green"),
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
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/5 rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/5" />
                <div className="glass-card p-6 md:p-8 relative">

                    {/* Header */}
                    <div className="flex flex-col gap-6 mb-8 pb-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Building2 size={18} className="text-blue-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white tracking-wider">Datos del Salón</h2>
                        </div>

                        {/* Salon Selectors */}
                        <div className="flex flex-wrap items-start gap-4">

                            {/* Predictive search input */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest pl-1">Buscar por nombre</label>
                                <div className="relative" ref={searchRef}>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => searchQuery && setShowSuggestions(true)}
                                            placeholder="Escribir nombre del salón..."
                                            className="bg-slate-900 border border-blue-500/30 rounded-lg pl-8 pr-4 py-2 text-sm text-blue-100 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 w-[260px] transition-colors"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full min-w-[300px] bg-slate-900 border border-blue-500/25 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
                                            {suggestions.map((s, idx) => {
                                                const semColor = s.performance?.color
                                                    ? getSemaphoreColor(s.performance.color)
                                                    : "#64748b";
                                                return (
                                                    <button
                                                        key={s.id_salon}
                                                        onMouseDown={() => handleSelectSuggestion(s)}
                                                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors ${idx !== 0 ? "border-t border-white/5" : ""}`}
                                                    >
                                                        <span
                                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: semColor }}
                                                        />
                                                        <span className="text-sm text-slate-200 font-medium flex-1 truncate">
                                                            {s.nombre_salon}
                                                        </span>
                                                        <span className="text-[10px] text-slate-600 font-mono flex-shrink-0">
                                                            #{s.id_salon}
                                                        </span>
                                                        {s.estado_salon !== "ACTIVO" && (
                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${s.estado_salon === "OBRA" ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-400"}`}>
                                                                {s.estado_salon}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {showSuggestions && searchQuery.trim() && suggestions.length === 0 && (
                                        <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full bg-slate-900 border border-white/10 rounded-xl shadow-xl px-4 py-3">
                                            <span className="text-sm text-slate-500">Sin resultados para &quot;{searchQuery}&quot;</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-end pb-2 text-slate-700 text-xs font-bold select-none">ó</div>

                            {/* Select dropdown */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest pl-1">Seleccionar de lista</label>
                                <select
                                    value={selectedSalonId ?? ""}
                                    onChange={(e) => setSelectedSalonId(e.target.value ? parseInt(e.target.value) : null)}
                                    className="bg-slate-900 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500/60 min-w-[260px] font-bold"
                                >
                                    <option value="">Buscar Salón...</option>
                                    {[...salones]
                                        .sort((a, b) => a.nombre_salon.localeCompare(b.nombre_salon))
                                        .map(s => (
                                            <option key={s.id_salon} value={s.id_salon}>
                                                {s.nombre_salon} ({s.id_salon})
                                            </option>
                                        ))}
                                </select>
                            </div>
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

                    {selectedSalon && semaforos ? (
                        <div className="space-y-6">
                            {/* ── SEMAPHORE PANEL ── */}
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-4">Semáforos</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {semaforos.map((sem) => {
                                        const hex = getSemaphoreColor(sem.color);
                                        return (
                                            <div
                                                key={sem.label}
                                                className="relative p-5 rounded-2xl border flex flex-col items-center text-center gap-3 overflow-hidden"
                                                style={{ background: `${hex}08`, borderColor: `${hex}25` }}
                                            >
                                                <div className="absolute inset-0 opacity-5 pointer-events-none"
                                                    style={{ background: `radial-gradient(circle at 50% 0%, ${hex}, transparent 70%)` }} />
                                                <div className="w-11 h-11 rounded-full flex items-center justify-center relative z-10"
                                                    style={{ background: `${hex}15`, border: `2px solid ${hex}40` }}>
                                                    <SemaforoIcon color={sem.color} size={20} />
                                                </div>
                                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-[0.18em] relative z-10">{sem.label}</span>
                                                <span className="text-sm font-black uppercase tracking-wider relative z-10" style={{ color: hex }}>{sem.sublabel}</span>
                                                {sem.value !== "—" && (
                                                    <span className="text-xs text-slate-500 font-mono relative z-10">{sem.value}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── 4 DETAIL PANELS ── */}
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-4">Indicadores Detallados</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Operación */}
                                    <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center text-center">
                                        <div className="flex items-center gap-2 w-full justify-center border-b border-white/5 pb-4 mb-6">
                                            <Activity size={16} className="text-blue-400" />
                                            <span className="text-[11px] text-slate-500 uppercase font-black tracking-[0.2em]">Operación</span>
                                        </div>
                                        <div className="flex flex-col space-y-8 w-full">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Cantidad Eventos</p>
                                                <p className="text-2xl font-bold text-white">{formatNumber(selectedSalon.cantidad_eventos_salon || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Cantidad Invitados</p>
                                                <p className="text-2xl font-bold text-white">{formatNumber(selectedSalon.total_invitados_salon || 0)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financiero */}
                                    <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center text-center">
                                        <div className="flex items-center gap-2 w-full justify-center border-b border-white/5 pb-4 mb-6">
                                            <DollarSign size={16} className="text-green-400" />
                                            <span className="text-[11px] text-slate-500 uppercase font-black tracking-[0.2em]">Financiero</span>
                                        </div>
                                        <div className="flex flex-col space-y-8 w-full">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest text-green-400/70">Ventas Totales</p>
                                                <p className="text-xl font-bold text-green-400">{formatARS(selectedSalon.ventas_totales_salon || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest text-red-400/70">Costos Totales</p>
                                                <p className="text-xl font-bold text-red-400">{formatARS(selectedSalon.costos_totales_salon || 0)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rentabilidad */}
                                    <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center text-center">
                                        <div className="flex items-center gap-2 w-full justify-center border-b border-white/5 pb-4 mb-6">
                                            <TrendingUp size={16} className="text-emerald-400" />
                                            <span className="text-[11px] text-slate-500 uppercase font-black tracking-[0.2em]">Rentabilidad</span>
                                        </div>
                                        <div className="flex flex-col space-y-8 w-full">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Rentabilidad (%)</p>
                                                <p className={`text-2xl font-bold ${(selectedSalon.rentabilidad_salon || 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {formatPercentage((selectedSalon.rentabilidad_salon || 0) * 100, 2)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Retorno s/ Alquiler</p>
                                                <p className="text-2xl font-bold text-white">{formatMultiplier(selectedSalon.retorno_sobre_alquiler || 0)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Indicadores */}
                                    <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col items-center text-center">
                                        <div className="flex items-center gap-2 w-full justify-center border-b border-white/5 pb-4 mb-6">
                                            <BrainCircuit size={16} className="text-purple-400" />
                                            <span className="text-[11px] text-slate-500 uppercase font-black tracking-[0.2em]">Indicadores</span>
                                        </div>
                                        <div className="flex flex-col space-y-8 w-full">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Incidencia Alquiler</p>
                                                <p className="text-2xl font-bold"
                                                    style={{ color: get_color_from_incidence(selectedSalon.incidencia_alquiler_sobre_facturacion_anual || 0) }}>
                                                    {formatPercentage((selectedSalon.incidencia_alquiler_sobre_facturacion_anual || 0) * 100)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Participación Margen</p>
                                                <p className="text-2xl font-bold text-white">
                                                    {formatPercentage((selectedSalon.participacion_margen || 0) * 100)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Building2 size={40} className="text-slate-700 mb-4" />
                            <p className="text-slate-500 text-sm font-medium">Seleccioná un salón para ver el resumen de semáforos e indicadores</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* MAP + SALON LIST — positioned between Datos del Salón and Vista General */}
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

                {/* Salon List */}
                <div className="glass-card p-6 max-h-[460px] overflow-y-auto">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-cyan-400" />
                        Listado General ({filtered.length})
                    </h2>
                    <div className="space-y-1">
                        {filtered.map((salon) => (
                            <button
                                key={salon.id_salon}
                                onClick={() => handleSelectSalon(salon)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all border ${selectedSalon?.id_salon === salon.id_salon
                                    ? "border-blue-500/40 bg-blue-500/10"
                                    : "border-transparent hover:bg-white/5"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className={`text-xs ${selectedSalon?.id_salon === salon.id_salon ? "text-white font-medium" : "text-slate-400"}`}>
                                            {salon.nombre_salon}
                                        </span>
                                        {salon.estado_salon !== "ACTIVO" && (
                                            <span className={`text-[8px] font-bold uppercase ${salon.estado_salon === "OBRA" ? "text-amber-500" : "text-slate-500"}`}>
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
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 via-transparent to-blue-950/10 rounded-2xl border border-white/5 shadow-2xl" />
                <div className="glass-card p-6 md:p-8 relative">
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <LayoutGrid size={18} className="text-blue-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white tracking-wider">Vista General de Salones</h2>
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
                                                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                                                : "bg-slate-900/40 border-white/8 text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
                                color: "#2563eb",
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
                                color: "#8b5cf6",
                                sub: `${formatNumber(totalEvents)} eventos · acumulado`
                            },
                            {
                                label: "Ticket Prom. / Evento",
                                value: avgTicket > 0 ? formatARS(avgTicket) : "—",
                                icon: TrendingUp,
                                color: "#06b6d4",
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
                                <div key={kpi.label} className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all group/kpi">
                                    <div className="flex items-center justify-between mb-4">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover/kpi:scale-110 duration-300"
                                            style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}
                                        >
                                            <Icon size={20} style={{ color: kpi.color }} />
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold text-right max-w-[120px]">{kpi.sub}</span>
                                    </div>
                                    <p className={`font-bold text-white transition-all leading-tight ${kpi.value.length > 12 ? "text-xl md:text-2xl" : "text-2xl"}`}>
                                        {kpi.value}
                                    </p>
                                    <p className="text-xs text-slate-500 uppercase font-bold mt-1 tracking-tight">{kpi.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
