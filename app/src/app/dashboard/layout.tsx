"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import SerendipLogo from "@/components/SerendipLogo";
import { useDashboard } from "@/components/DashboardContext";
import {
    LayoutDashboard,
    TrendingUp,
    BarChart3,
    Gauge,
    FileCheck,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    DollarSign,
} from "lucide-react";

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Mapa & KPIs" },
    { href: "/dashboard/performance", label: "Performance", icon: TrendingUp, description: "Revenue vs Alquiler" },
    { href: "/dashboard/benchmarking", label: "Benchmarking", icon: BarChart3, description: "Comparación $m²" },
    { href: "/dashboard/efficiency", label: "Eficiencia", icon: Gauge, description: "Índice Global PAX" },
    { href: "/dashboard/contracts", label: "Contratos", icon: FileCheck, description: "Auditoría Desvíos" },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { conversionRate, setConversionRate } = useDashboard();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen flex">
            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed md:static z-50 top-0 left-0 h-full flex flex-col bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/50 transition-all duration-300 ${collapsed ? "w-20" : "w-72"
                    } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
            >
                {/* Logo */}
                <div className="p-5 border-b border-slate-800/50 flex items-center justify-between">
                    {collapsed ? (
                        <SerendipLogo size="sm" showText={false} />
                    ) : (
                        <SerendipLogo size="sm" showText={true} />
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                {/* Client label */}
                {!collapsed && (
                    <div className="px-5 py-3 border-b border-slate-800/30">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-medium">
                            Cliente
                        </span>
                        <p className="text-sm font-semibold text-blue-400 mt-0.5">Jano&apos;s Eventos</p>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? "bg-blue-500/15 border border-blue-500/30 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent"
                                    }`}
                            >
                                <Icon
                                    size={20}
                                    className={`flex-shrink-0 ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400"
                                        }`}
                                />
                                {!collapsed && (
                                    <div>
                                        <p className="text-sm font-medium">{item.label}</p>
                                        <p className="text-[11px] text-slate-500">{item.description}</p>
                                    </div>
                                )}
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-slate-800/50">
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ${collapsed ? "justify-center" : ""
                            }`}
                    >
                        <LogOut size={20} />
                        {!collapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/40">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-800/50 text-slate-400"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex items-center gap-6 ml-auto">
                        {/* Manual Conversion Rate Input */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                            <DollarSign size={14} className="text-blue-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tasa USD</span>
                            <div className="flex items-center">
                                <span className="text-sm font-bold text-blue-300/60 mr-0.5">$</span>
                                <input
                                    type="number"
                                    value={conversionRate}
                                    onChange={(e) => setConversionRate(Number(e.target.value))}
                                    className="w-16 bg-transparent border-none text-sm font-bold text-blue-300 focus:outline-none focus:ring-0 p-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">Admin</span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
}
