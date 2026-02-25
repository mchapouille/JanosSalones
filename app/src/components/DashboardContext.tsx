"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface DashboardContextType {
    conversionRate: number;
    setConversionRate: (rate: number) => void;
    isHelpOpen: boolean;
    setIsHelpOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [conversionRate, setConversionRate] = useState<number>(1470);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    return (
        <DashboardContext.Provider value={{
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
