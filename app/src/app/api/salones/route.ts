import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mapRawToSalon, type SalonIntegral } from "@/lib/sample-data";

const GITHUB_API_URL =
    "https://api.github.com/repos/mchapouille/JanosSalones/contents/app/src/lib/salones_data.json";

async function fetchSalonesFromGitHub(): Promise<SalonIntegral[]> {
    const headers: Record<string, string> = {
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
        // PAT prevents rate-limit issues and ensures fresh data
        ...(process.env.GITHUB_PAT ? { Authorization: `Bearer ${process.env.GITHUB_PAT}` } : {}),
    };

    const res = await fetch(GITHUB_API_URL, {
        headers,
        cache: "no-store", // Never cache — always get the latest committed JSON
    });

    if (!res.ok) {
        throw new Error(`GitHub API returned ${res.status}`);
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
