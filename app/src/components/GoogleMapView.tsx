"use client";

import { useState } from "react";
import { Map, AdvancedMarker, APIProvider } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { type SalonIntegral } from "@/lib/sample-data";
import { getSemaphoreColor } from "@/lib/calculations";

// Custom dark mode style for Google Maps
const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
    { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#cbd5e1" }] },
    { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
    { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] }
];

interface GoogleMapViewProps {
    salones: SalonIntegral[];
    selectedSalon: SalonIntegral | null;
    onSelectSalon: (salon: SalonIntegral) => void;
}

function MapUnavailablePlaceholder({ salonCount }: { salonCount: number }) {
    return (
        <div className="w-full h-full rounded-xl overflow-hidden border border-slate-700/30 flex flex-col items-center justify-center bg-slate-900/60 gap-4">
            <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700/50">
                    <MapPin size={24} className="text-slate-500" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Mapa no disponible</p>
                <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                    Configurá <code className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en <code className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px]">.env.local</code> para habilitar el mapa.
                </p>
                {salonCount > 0 && (
                    <p className="text-xs text-slate-600">
                        {salonCount} salón{salonCount !== 1 ? "es" : ""} disponible{salonCount !== 1 ? "s" : ""} — usá la lista lateral para navegar.
                    </p>
                )}
            </div>
        </div>
    );
}

export default function GoogleMapView({ salones, selectedSalon, onSelectSalon }: GoogleMapViewProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    if (!apiKey) {
        return <MapUnavailablePlaceholder salonCount={salones.length} />;
    }

    // Center of GBA roughly (San Isidro/Vicente Lopez area)
    const defaultCenter = { lat: -34.58, lng: -58.55 };

    return (
        <div className="w-full h-full rounded-xl overflow-hidden border border-slate-700/30">
            <APIProvider apiKey={apiKey}>
                <Map
                    mapId={"bf51a910020faedc"}
                    defaultCenter={defaultCenter}
                    defaultZoom={11}
                    gestureHandling={'greedy'}
                    disableDefaultUI={false}
                    styles={darkMapStyle}
                    colorScheme={"DARK"}
                >
                    {salones.map((salon) => {
                        if (!salon.lat_salon || !salon.lon_salon) return null;

                        // Color based on: OBRA = amber, DEVUELTOS = gray, ACTIVO = rentabilidad semaphore
                        const markerColor =
                            salon.estado_salon === "OBRA" ? "#f59e0b" :
                                salon.estado_salon === "DEVUELTOS" ? "#94a3b8" :
                                    salon.performance ? getSemaphoreColor(salon.performance.color) : "#3b82f6";

                        const isSelected = selectedSalon?.id_salon === salon.id_salon;
                        const isHovered = hoveredId === salon.id_salon;
                        const showLabel = isSelected || isHovered;

                        return (
                            <AdvancedMarker
                                key={`${salon.id_salon}-${salon.year}`}
                                position={{ lat: salon.lat_salon, lng: salon.lon_salon }}
                                onClick={() => onSelectSalon(salon)}
                                title={salon.nombre_salon}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "3px",
                                        cursor: "pointer",
                                        transform: isSelected ? "scale(1.3)" : isHovered ? "scale(1.15)" : "scale(1)",
                                        transition: "transform 0.15s ease",
                                        zIndex: isSelected ? 100 : isHovered ? 50 : 1,
                                    }}
                                    onMouseEnter={() => setHoveredId(salon.id_salon)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    {/* Pin dot */}
                                    <div
                                        style={{
                                            width: isSelected ? 18 : isHovered ? 16 : 12,
                                            height: isSelected ? 18 : isHovered ? 16 : 12,
                                            borderRadius: "50%",
                                            background: markerColor,
                                            border: isSelected
                                                ? "2.5px solid #fff"
                                                : isHovered
                                                    ? `2px solid #fff`
                                                    : `1.5px solid ${markerColor}99`,
                                            boxShadow: isSelected
                                                ? `0 0 14px ${markerColor}cc, 0 0 4px #fff4`
                                                : isHovered
                                                    ? `0 0 10px ${markerColor}99`
                                                    : `0 0 4px ${markerColor}50`,
                                            transition: "all 0.15s ease",
                                        }}
                                    />

                                    {/* Salon name label — visible on hover or selected */}
                                    {showLabel && (
                                        <div
                                            style={{
                                                background: isSelected
                                                    ? `rgba(15,23,42,0.95)`
                                                    : "rgba(15,23,42,0.88)",
                                                color: isSelected ? "#fff" : "#cbd5e1",
                                                fontSize: "10px",
                                                fontWeight: isSelected ? 700 : 600,
                                                padding: "2px 7px",
                                                borderRadius: "5px",
                                                whiteSpace: "nowrap",
                                                border: isSelected
                                                    ? `1px solid ${markerColor}80`
                                                    : "1px solid rgba(255,255,255,0.15)",
                                                maxWidth: "150px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                backdropFilter: "blur(6px)",
                                                letterSpacing: "0.02em",
                                                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                                                pointerEvents: "none",
                                            }}
                                        >
                                            {salon.nombre_salon}
                                        </div>
                                    )}
                                </div>
                            </AdvancedMarker>
                        );
                    })}
                </Map>
            </APIProvider>
        </div>
    );
}
