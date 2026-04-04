"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { getSalonesData, type SalonIntegral } from "@/lib/sample-data";

interface DashboardContextType {
    conversionRate: number;
    setConversionRate: (rate: number) => void;
    isHelpOpen: boolean;
    setIsHelpOpen: (open: boolean) => void;
    // Salon data — loaded at runtime from API, falls back to static build data
    salones: SalonIntegral[];
    salonesLoading: boolean;
    salonesError: string | null;
    reloadSalones: () => void;
    // Shared selection — lifted from pages; resets to null on section navigation
    selectedSalonId: number | null;
    setSelectedSalonId: (id: number | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const CONVERSION_RATE_KEY = "janos:conversionRate";
const DEFAULT_CONVERSION_RATE = 1470;

function getInitialConversionRate(): number {
    if (typeof window === "undefined") return DEFAULT_CONVERSION_RATE;
    try {
        const stored = localStorage.getItem(CONVERSION_RATE_KEY);
        if (stored !== null) {
            const parsed = Number(stored);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
    } catch {
        // localStorage not available (e.g., private browsing restrictions)
    }
    return DEFAULT_CONVERSION_RATE;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [conversionRate, setConversionRateState] = useState<number>(DEFAULT_CONVERSION_RATE);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Initialise with static build-time data so the UI is never empty
    const [salones, setSalones] = useState<SalonIntegral[]>(() => getSalonesData());
    const [salonesLoading, setSalonesLoading] = useState(false);
    const [salonesError, setSalonesError] = useState<string | null>(null);

    // Shared selection lifted from pages; null = no selection
    const [selectedSalonId, setSelectedSalonIdState] = useState<number | null>(null);

    // Gate flag — ensures initial fetch runs exactly once regardless of re-renders
    const hasFetched = useRef(false);

    // Hydrate conversionRate from localStorage after mount (SSR-safe)
    useEffect(() => {
        setConversionRateState(getInitialConversionRate());
    }, []);

    // Persist conversionRate to localStorage whenever it changes
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(CONVERSION_RATE_KEY, String(conversionRate));
        } catch {
            // Ignore write errors
        }
    }, [conversionRate]);

    const setConversionRate = useCallback((rate: number) => {
        setConversionRateState(rate);
    }, []);

    // reloadSalones does NOT depend on `salones` — keeps current data on failure
    const reloadSalones = useCallback(async (): Promise<void> => {
        setSalonesLoading(true);
        setSalonesError(null);
        try {
            const res = await fetch("/api/salones");
            if (res.ok) {
                const data: SalonIntegral[] = await res.json();
                if (data.length > 0) {
                    setSalones(data);
                    // Clear invalid selection if the selected salon no longer exists in new data
                    setSelectedSalonIdState((prev) => {
                        if (prev !== null && !data.find((s) => s.id_salon === prev)) {
                            return null;
                        }
                        return prev;
                    });
                }
            } else {
                setSalonesError(`Error al cargar salones: ${res.status}`);
            }
        } catch (err) {
            console.error("Failed to reload salones from API:", err);
            setSalonesError("No se pudo conectar con el servidor. Se muestran datos anteriores.");
        } finally {
            setSalonesLoading(false);
        }
    }, []); // No dependency on `salones` — avoids infinite loop

    // Refresh from server on mount — exactly once via hasFetched ref
    // Only fetch if user is authenticated
    const { status } = useSession();
    useEffect(() => {
        if (status !== "authenticated") return;
        if (hasFetched.current) return;
        hasFetched.current = true;
        reloadSalones();
    }, [status]);

    const setSelectedSalonId = useCallback((id: number | null) => {
        setSelectedSalonIdState(id);
    }, []);

    return (
        <DashboardContext.Provider value={{
            conversionRate,
            setConversionRate,
            isHelpOpen,
            setIsHelpOpen,
            salones,
            salonesLoading,
            salonesError,
            reloadSalones,
            selectedSalonId,
            setSelectedSalonId,
        }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }
    return context;
}
