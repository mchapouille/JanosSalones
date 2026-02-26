import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mapRawToSalon, type SalonIntegral } from "@/lib/sample-data";

const GITHUB_RAW_URL =
    "https://raw.githubusercontent.com/mchapouille/JanosSalones/main/app/src/lib/salones_data.json";

async function fetchSalonesFromGitHub(): Promise<SalonIntegral[]> {
    const res = await fetch(GITHUB_RAW_URL, {
        // Next.js will cache this fetch; revalidatePath('/','layout') busts it
        next: { revalidate: 3600 },
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch salon data: ${res.status}`);
    }
    const raw = await res.json();
    return raw.map(mapRawToSalon);
}

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const estado = searchParams.get("estado");
        const municipio = searchParams.get("municipio");
        const tier = searchParams.get("tier");

        let salones = await fetchSalonesFromGitHub();

        if (estado) {
            salones = salones.filter((s) => s.estado_salon === estado.toUpperCase());
        }
        if (municipio) {
            salones = salones.filter((s) =>
                s.municipio_salon?.toLowerCase().includes(municipio.toLowerCase())
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
