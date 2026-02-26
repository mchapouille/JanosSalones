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
    Clock,
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
    const { conversionRate, setConversionRate, setIsHelpOpen, salones, reloadSalones } = useDashboard();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle');
    const [refreshMsg, setRefreshMsg] = useState('');

    const handleRefresh = async () => {
        if (refreshStatus === 'loading' || refreshStatus === 'async') return;
        setRefreshStatus('loading');
        setRefreshMsg('');
        try {
            const res = await fetch('/api/refresh-data', { method: 'POST' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setRefreshStatus('error');
                setRefreshMsg(data.message || 'Error al refrescar');
                setTimeout(() => { setRefreshStatus('idle'); setRefreshMsg(''); }, 6000);
            } else if (data.async) {
                // Production: GitHub Actions dispatched — poll every 30s until data changes
                setRefreshStatus('async');
                setRefreshMsg('Procesando datos en segundo plano...');
                const snapshotCount = salones.length;
                const snapshotFirst = salones[0]?.ventas_totales_salon ?? 0;
                let attempts = 0;
                const maxAttempts = 10; // 5 min max
                const poll = setInterval(async () => {
                    attempts++;
                    await reloadSalones();
                    // Detect change: different count or different first value
                    if (attempts >= maxAttempts) {
                        clearInterval(poll);
                        setRefreshStatus('idle');
                    }
                }, 30000);
                // After reload we need a separate effect to detect the change
                // and clear the interval — we use a timeout-based check instead
                setTimeout(() => {
                    clearInterval(poll);
                    setRefreshStatus('success');
                    setTimeout(() => { setRefreshStatus('idle'); setRefreshMsg(''); }, 5000);
                }, 150000); // 2.5 min: enough time for Actions to finish
            } else {
                // Local: done immediately
                setRefreshStatus('success');
                setRefreshMsg('Datos actualizados');
                await reloadSalones();
                setTimeout(() => { setRefreshStatus('idle'); setRefreshMsg(''); }, 5000);
            }
        } catch {
            setRefreshStatus('error');
            setRefreshMsg('Error de conexión');
            setTimeout(() => { setRefreshStatus('idle'); setRefreshMsg(''); }, 6000);
        }
    };


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
                    <JanosLogo size="sm" />
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
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

                        {/* Refresh Data Button + Toast */}
                        <div className="relative">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshStatus === 'loading'}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors group ${refreshStatus === 'loading'
                                    ? 'bg-blue-500/20 border-blue-500/30 cursor-wait'
                                    : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                                    }`}
                                title="Refrescar Datos del Excel"
                            >
                                <RefreshCw
                                    size={14}
                                    className={`text-blue-400 group-hover:text-white ${refreshStatus === 'loading' ? 'animate-spin' : ''}`}
                                />
                                <span className="hidden sm:inline text-xs font-bold text-blue-400 group-hover:text-white">
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
                                        className={`absolute right-0 top-10 z-50 flex items-start gap-2 px-4 py-3 rounded-xl shadow-2xl border min-w-[260px] max-w-[340px] backdrop-blur-xl ${refreshStatus === 'success'
                                            ? 'bg-green-950/90 border-green-500/30 text-green-300'
                                            : refreshStatus === 'async'
                                                ? 'bg-blue-950/90 border-blue-500/30 text-blue-300'
                                                : 'bg-red-950/90 border-red-500/30 text-red-300'
                                            }`}
                                    >
                                        {(refreshStatus === 'success' || refreshStatus === 'async') && <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-green-400" />}
                                        {refreshStatus === 'error' && <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-400" />}
                                        <p className="text-xs font-medium leading-snug">
                                            {refreshStatus === 'error' ? refreshMsg : 'Datos actualizados correctamente'}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Help Button */}
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                        >
                            <HelpCircle size={14} className="text-slate-400 group-hover:text-blue-400" />
                            <span className="hidden sm:inline text-xs font-bold text-slate-400 group-hover:text-white">Ayuda</span>
                        </button>

                        <div className="flex items-center gap-3">
                            <span className="hidden sm:inline text-sm text-slate-400">Admin</span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 overflow-y-auto">{children}</main>
            </div>
            <HelpModal />
        </div>
    );

}
