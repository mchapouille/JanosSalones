"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import JanosLogo from "@/components/JanosLogo";
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
    HelpCircle,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import HelpModal from "./HelpModal";

const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Mapa & KPIs" },
    { href: "/dashboard/performance", label: "Performance", icon: TrendingUp, description: "Revenue vs Alquiler" },
    { href: "/dashboard/benchmarking", label: "Benchmarking", icon: BarChart3, description: "Comparación $m²" },
    { href: "/dashboard/efficiency", label: "Eficiencia", icon: Gauge, description: "Índice Global PAX" },
    { href: "/dashboard/contracts", label: "Contratos", icon: FileCheck, description: "Auditoría Desvíos" },
];

type RefreshStatus = 'idle' | 'loading' | 'success' | 'async' | 'error';


export default function DashboardShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { conversionRate, setConversionRate, setIsHelpOpen, reloadSalones, salonesError } = useDashboard();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle');
    const [refreshMsg, setRefreshMsg] = useState('');

    const handleRefresh = async () => {
        if (refreshStatus === 'loading') return;
        setRefreshStatus('loading');
        setRefreshMsg('');

        try {
            const res = await fetch('/api/refresh-data', { method: 'POST' });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setRefreshStatus('error');
                const detail = data.error ? ` — ${data.error}` : '';
                setRefreshMsg((data.message || 'Error al refrescar') + detail);
                setTimeout(() => { setRefreshStatus('idle'); setRefreshMsg(''); }, 12000);
                return;
            }

            if (!data.async) {
                // LOCAL: done immediately
                await reloadSalones();
                setRefreshStatus('success');
                setTimeout(() => { setRefreshStatus('idle'); setRefreshMsg(''); }, 5000);
                return;
            }

            // PRODUCTION: show info toast, then success after 1 min
            setRefreshStatus('async');
            setRefreshMsg('Los datos serán actualizados en los próximos 2 minutos');
            setTimeout(() => {
                setRefreshStatus('success');
                reloadSalones();
                setTimeout(() => { setRefreshStatus('idle'); setRefreshMsg(''); }, 5000);
            }, 60000); // 1 min

        } catch {
            setRefreshStatus('error');
            setRefreshMsg('Error de conexión');
            setTimeout(() => { setRefreshStatus('idle'); setRefreshMsg(''); }, 6000);
        }
    };


    return (
        <div className="min-h-screen flex bg-[#faf8f4]">
            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 bg-black/30 z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed md:static z-50 top-0 left-0 h-full flex flex-col bg-[#f3ede3] border-r border-[#b8891a]/20 transition-all duration-300 ${collapsed ? "w-20" : "w-72"
                    } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
            >
                {/* Logo */}
                <div className="p-5 border-b border-[#b8891a]/15 flex items-center justify-between">
                    <JanosLogo size="sm" />
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-[#7a1515]/10 text-[#7a6d5a] hover:text-[#b8891a] transition-colors"
                    >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>


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
                                    ? "bg-[#7a1515]/10 border border-[#b8891a]/30 text-[#1a1208]"
                                    : "text-[#7a6d5a] hover:text-[#1a1208] hover:bg-[#7a1515]/6 border border-transparent"
                                    }`}
                            >
                                <Icon
                                    size={20}
                                    className={`flex-shrink-0 ${isActive ? "text-[#b8891a]" : "text-[#856f57] group-hover:text-[#b8891a]"
                                        }`}
                                />
                                {!collapsed && (
                                    <div>
                                        <p className="text-sm font-medium">{item.label}</p>
                                        <p className="text-[11px] text-[#856f57]">{item.description}</p>
                                    </div>
                                )}
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#b8891a] flex-shrink-0" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-[#b8891a]/15">
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-[#7a6d5a] hover:text-red-600 hover:bg-red-50 transition-all duration-200 ${collapsed ? "justify-center" : ""
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
                <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-sm border-b border-[#b8891a]/15 shadow-sm">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#7a1515]/8 text-[#6b5d4a]"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex items-center gap-6 ml-auto">
                        {/* Manual Conversion Rate Input */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0dfa0]/40 border border-[#b8891a]/20">
                            <DollarSign size={14} className="text-[#b8891a]" />
                            <span className="text-[10px] uppercase tracking-wider text-[#7a6d5a] font-bold">Tasa USD</span>
                            <div className="flex items-center">
                                <span className="text-sm font-bold text-[#b8891a] mr-0.5">$</span>
                                <input
                                    type="number"
                                    value={conversionRate}
                                    onChange={(e) => setConversionRate(Number(e.target.value))}
                                    className="w-16 bg-transparent border-none text-sm font-bold text-[#b8891a] focus:outline-none focus:ring-0 p-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        </div>

                        {/* Refresh Data Button + Toast */}
                        <div className="relative">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshStatus === 'loading'}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors group ${refreshStatus === 'loading'
                                    ? 'bg-[#7a1515]/10 border-[#b8891a]/20 cursor-wait'
                                    : 'bg-[#7a1515]/8 border-[#b8891a]/20 hover:bg-[#7a1515]/15'
                                    }`}
                                title="Refrescar Datos del Excel"
                            >
                                <RefreshCw
                                    size={14}
                                    className={`text-[#b8891a] group-hover:text-[#7a1515] ${refreshStatus === 'loading' ? 'animate-spin' : ''}`}
                                />
                                <span className="hidden sm:inline text-xs font-bold text-[#b8891a] group-hover:text-[#7a1515]">
                                    {refreshStatus === 'loading' ? 'Actualizando datos...' : 'Refrescar'}
                                </span>
                            </button>

                            {/* Toast notification */}
                            <AnimatePresence>
                                {refreshStatus !== 'idle' && refreshStatus !== 'loading' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                        className={`absolute right-0 top-10 z-50 flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg border min-w-[260px] max-w-[340px] ${refreshStatus === 'success'
                                            ? 'bg-green-50 border-green-200 text-green-700'
                                            : refreshStatus === 'async'
                                                ? 'bg-[#fdf9f0] border-[#b8891a]/30 text-[#6b5d4a]'
                                                : 'bg-red-50 border-red-200 text-red-700'
                                            }`}
                                    >
                                        {(refreshStatus === 'success' || refreshStatus === 'async') && <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-green-500" />}
                                        {refreshStatus === 'error' && <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />}
                                        <p className="text-xs font-medium leading-snug break-all">
                                            {refreshStatus === 'error' ? refreshMsg : 'Datos actualizados correctamente'}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Help Button */}
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f3ede3] border border-[#b8891a]/15 hover:bg-[#7a1515]/8 hover:border-[#b8891a]/30 transition-colors group"
                        >
                            <HelpCircle size={14} className="text-[#7a6d5a] group-hover:text-[#b8891a]" />
                            <span className="hidden sm:inline text-xs font-bold text-[#7a6d5a] group-hover:text-[#1a1208]">Ayuda</span>
                        </button>

                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline text-sm text-[#7a6d5a]">Admin</span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7a1515] to-[#b8891a] flex items-center justify-center text-white text-xs font-bold">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Salones error banner */}
                {salonesError && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
                        <AlertCircle size={16} className="flex-shrink-0 text-red-500" />
                        <span className="flex-1">{salonesError}</span>
                        <button
                            onClick={reloadSalones}
                            className="text-xs font-bold text-red-600 hover:text-red-800 underline underline-offset-2 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Page content */}
                <main className="flex-1 p-6 overflow-y-auto">{children}</main>
            </div>
            <HelpModal />
        </div>
    );

}
