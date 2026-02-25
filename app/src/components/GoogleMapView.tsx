"use client";

import { Map, AdvancedMarker, APIProvider } from "@vis.gl/react-google-maps";
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

export default function GoogleMapView({ salones, selectedSalon, onSelectSalon }: GoogleMapViewProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

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

                        return (
                            <AdvancedMarker
                                key={`${salon.id_salon}-${salon.year}`}
                                position={{ lat: salon.lat_salon, lng: salon.lon_salon }}
                                onClick={() => onSelectSalon(salon)}
                                title={salon.nombre_salon}
                            >
                                {/* Custom marker with pin + name label */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "2px",
                                        cursor: "pointer",
                                        transform: isSelected ? "scale(1.25)" : "scale(1)",
                                        transition: "transform 0.15s ease",
                                    }}
                                >
                                    {/* Pin dot */}
                                    <div
                                        style={{
                                            width: isSelected ? 18 : 14,
                                            height: isSelected ? 18 : 14,
                                            borderRadius: "50%",
                                            background: markerColor,
                                            border: isSelected ? "2.5px solid #fff" : `2px solid ${markerColor}`,
                                            boxShadow: `0 0 ${isSelected ? 10 : 6}px ${markerColor}80`,
                                            transition: "all 0.15s ease",
                                        }}
                                    />
                                    {/* Salon name label */}
                                    <div
                                        style={{
                                            background: "rgba(15,23,42,0.88)",
                                            color: isSelected ? "#fff" : "#94a3b8",
                                            fontSize: "9px",
                                            fontWeight: isSelected ? 700 : 500,
                                            padding: "1px 5px",
                                            borderRadius: "4px",
                                            whiteSpace: "nowrap",
                                            border: isSelected ? `1px solid ${markerColor}60` : "1px solid rgba(255,255,255,0.08)",
                                            maxWidth: "120px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            backdropFilter: "blur(4px)",
                                            letterSpacing: "0.02em",
                                        }}
                                    >
                                        {salon.nombre_salon}
                                    </div>
                                </div>
                            </AdvancedMarker>
                        );
                    })}
                </Map>
            </APIProvider>
        </div>
    );
}
