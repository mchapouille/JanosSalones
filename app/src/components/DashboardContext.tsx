"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getSalonesData, type SalonIntegral } from "@/lib/sample-data";

interface DashboardContextType {
    conversionRate: number;
    setConversionRate: (rate: number) => void;
    isHelpOpen: boolean;
    setIsHelpOpen: (open: boolean) => void;
    // Salon data — loaded at runtime from API, falls back to static build data
    salones: SalonIntegral[];
    salonesLoading: boolean;
    reloadSalones: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [conversionRate, setConversionRate] = useState<number>(1470);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    // Initialise with static build-time data so the UI is never empty
    const [salones, setSalones] = useState<SalonIntegral[]>(() => getSalonesData());
    const [salonesLoading, setSalonesLoading] = useState(false);

    const reloadSalones = useCallback(async (): Promise<SalonIntegral[]> => {
        setSalonesLoading(true);
        try {
            const res = await fetch("/api/salones");
            if (res.ok) {
                const data: SalonIntegral[] = await res.json();
                if (data.length > 0) {
                    setSalones(data);
                    return data;
                }
            }
        } catch (err) {
            console.error("Failed to reload salones from API:", err);
        } finally {
            setSalonesLoading(false);
        }
        return salones; // fallback: return current
    }, [salones]);

    // Refresh from server on mount to pick up the latest committed JSON
    useEffect(() => {
        reloadSalones();
    }, [reloadSalones]);

    // Auto-fetch live USD Oficial Minorista from BCRA API on mount
    useEffect(() => {
        fetch("/api/dolar-rate")
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (data && typeof data.value === "number" && !data.error) {
                    setConversionRate(data.value);
                }
            })
            .catch(() => { /* keep fallback */ });
    }, []);


    return (
        <DashboardContext.Provider value={{
            conversionRate,
            setConversionRate,
            isHelpOpen,
            setIsHelpOpen,
            salones,
            salonesLoading,
            reloadSalones,
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
