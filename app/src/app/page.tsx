import Link from "next/link";
import SerendipLogo from "@/components/SerendipLogo";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.15),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.1),_transparent_50%)]" />

      <div className="relative z-10 flex flex-col items-center gap-12 max-w-2xl text-center">
        <SerendipLogo size="xl" />

        <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
          Plataforma de Auditoría Inteligente & Business Intelligence para la gestión
          de rentabilidad y eficiencia de activos.
        </p>

        <div className="flex gap-4">
          <Link href="/login" className="btn-primary text-center">
            Acceder al Dashboard
          </Link>
          <Link
            href="/solution"
            className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:border-blue-500/50 hover:text-white transition-all duration-300"
          >
            Ver Metodología
          </Link>
        </div>
      </div>
    </main>
  );
}
