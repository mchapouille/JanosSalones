"use client";

import { SessionProvider } from "next-auth/react";
import { DashboardProvider } from "./DashboardContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <DashboardProvider>
                {children}
            </DashboardProvider>
        </SessionProvider>
    );
}
