"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface DashboardContextType {
    selectedYear: number | null;
    setSelectedYear: (year: number | null) => void;
    availableYears: number[];
    conversionRate: number;
    setConversionRate: (rate: number) => void;
    isHelpOpen: boolean;
    setIsHelpOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const availableYears = [2024, 2025, 2026];
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [conversionRate, setConversionRate] = useState<number>(1470);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    return (
        <DashboardContext.Provider value={{
            selectedYear,
            setSelectedYear,
            availableYears,
            conversionRate,
            setConversionRate,
            isHelpOpen,
            setIsHelpOpen
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

// Keep the old name for backward compatibility during transition or if preferred
export const useYearFilter = useDashboard;
