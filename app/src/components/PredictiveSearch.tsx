"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { getSemaphoreColor } from "@/lib/calculations";
import type { SalonIntegral } from "@/lib/sample-data";

interface PredictiveSearchProps {
    salones: SalonIntegral[];
    onSelect: (salon: SalonIntegral) => void;
    placeholder?: string;
    /** Custom renderer for dropdown items. Default: name + "#" + id */
    renderItem?: (salon: SalonIntegral) => ReactNode;
}

export function PredictiveSearch({
    salones,
    onSelect,
    placeholder = "Buscar por nombre...",
    renderItem,
}: PredictiveSearchProps) {
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

    const handleSelect = (salon: SalonIntegral) => {
        onSelect(salon);
        setSearchQuery("");
        setShowSuggestions(false);
    };

    // Default render: simple name + "#" + id
    const defaultRenderItem = (s: SalonIntegral) => (
        <>
            <span className="text-sm text-[#1a1208] font-medium flex-1 truncate">
                {s.nombre_salon}
            </span>
            <span className="text-[10px] text-[#6b5d4a] font-mono flex-shrink-0">
                #{s.id_salon}
            </span>
        </>
    );

    const renderItemFn = renderItem || defaultRenderItem;

    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#6b5d4a] uppercase font-bold tracking-widest pl-1">
                Buscar por nombre
            </label>
            <div className="relative" ref={searchRef}>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b8891a] pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => searchQuery && setShowSuggestions(true)}
                        placeholder={placeholder}
                        className="bg-white border border-[#b8891a]/25 rounded-lg pl-8 pr-4 py-2 text-sm text-[#1a1208] placeholder-[#6b5d4a]/50 focus:outline-none focus:border-[#b8891a]/50 w-[260px] transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b5d4a] hover:text-[#1a1208] transition-colors"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full min-w-[300px] bg-[#faf8f4] border border-[#b8891a]/15 rounded-xl shadow-xl shadow-[#1a1208]/10 overflow-hidden">
                        {suggestions.map((s, idx) => (
                            <button
                                key={s.id_salon}
                                onMouseDown={() => handleSelect(s)}
                                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#b8891a]/5 transition-colors ${idx !== 0 ? "border-t border-[#b8891a]/10" : ""}`}
                            >
                                {renderItemFn(s)}
                            </button>
                        ))}
                    </div>
                )}
                {showSuggestions && searchQuery.trim() && suggestions.length === 0 && (
                    <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full bg-[#faf8f4] border border-[#b8891a]/15 rounded-xl shadow-xl px-4 py-3">
                        <span className="text-sm text-[#6b5d4a]">Sin resultados para &quot;{searchQuery}&quot;</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// Rich render for Dashboard (with semaphore + badge)
export function renderSalonItem(s: SalonIntegral) {
    const semColor = s.performance?.color
        ? getSemaphoreColor(s.performance.color)
        : "#64748b";

    return (
        <>
            <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: semColor }}
            />
            <span className="text-sm text-[#1a1208] font-medium flex-1 truncate">
                {s.nombre_salon}
            </span>
            <span className="text-[10px] text-[#6b5d4a] font-mono flex-shrink-0">
                #{s.id_salon}
            </span>
            {s.estado_salon !== "ACTIVO" && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${s.estado_salon === "OBRA" ? "bg-amber-500/20 text-amber-600" : "bg-[#6b5d4a]/20 text-[#6b5d4a]"}`}>
                    {s.estado_salon}
                </span>
            )}
        </>
    );
}