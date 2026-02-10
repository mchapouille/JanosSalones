import { NextResponse } from "next/server";
import { getSalonesData } from "@/lib/sample-data";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const estado = searchParams.get("estado");
        const municipio = searchParams.get("municipio");
        const tier = searchParams.get("tier");

        let salones = getSalonesData();

        if (estado) {
            salones = salones.filter((s) => s.estado_salon === estado.toUpperCase());
        }
        if (municipio) {
            salones = salones.filter(
                (s) => s.municipio_salon?.toLowerCase().includes(municipio.toLowerCase())
            );
        }
        if (tier) {
            salones = salones.filter((s) => s.tier === parseInt(tier));
        }

        return NextResponse.json(salones);
    } catch (error) {
        console.error("Error fetching salones:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
