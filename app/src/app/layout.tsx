import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", style: ["italic", "normal"] });

export const metadata: Metadata = {
  title: {
    default: "Serendip.IA — Plataforma de Auditoría & BI",
    template: "%s | Serendip.IA",
  },
  description:
    "Plataforma de auditoría inteligente para la gestión de rentabilidad y eficiencia de activos inmobiliarios.",
  keywords: ["auditoría", "BI", "rentabilidad", "salones", "eventos", "control interno"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
