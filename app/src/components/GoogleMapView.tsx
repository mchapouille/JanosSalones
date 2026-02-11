"use client";

import { Map, AdvancedMarker, Pin, APIProvider } from "@vis.gl/react-google-maps";
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
                    mapId={"bf51a910020faedc"} // Need a Map ID for Advanced markers
                    defaultCenter={defaultCenter}
                    defaultZoom={11}
                    gestureHandling={'greedy'}
                    disableDefaultUI={false}
                    styles={darkMapStyle}
                >
                    {salones.map((salon) => {
                        if (!salon.lat_salon || !salon.lon_salon) return null;

                        const effColor = salon.efficiency ? getSemaphoreColor(salon.efficiency.color) : "#6b7280";
                        const isSelected = selectedSalon?.id_salon === salon.id_salon;

                        return (
                            <AdvancedMarker
                                key={salon.id_salon}
                                position={{ lat: salon.lat_salon, lng: salon.lon_salon }}
                                onClick={() => onSelectSalon(salon)}
                                title={salon.nombre_salon}
                            >
                                <Pin
                                    background={effColor}
                                    glyphColor={"#000"}
                                    borderColor={isSelected ? "#fff" : effColor}
                                    scale={isSelected ? 1.4 : 1.0}
                                />
                            </AdvancedMarker>
                        );
                    })}
                </Map>
            </APIProvider>
        </div>
    );
}
