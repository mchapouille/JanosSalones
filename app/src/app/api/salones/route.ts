import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mapRawToSalon, type SalonIntegral } from "@/lib/sample-data";

const GITHUB_API_URL =
    "https://api.github.com/repos/mchapouille/JanosSalones/contents/app/src/lib/salones_data.json";

// Module-level TTL cache — key is always "default" (unfiltered)
// Filtering happens in-memory after cache retrieval
interface SalonesCache {
    data: SalonIntegral[];
    timestamp: number;
}

const cache = new Map<string, SalonesCache>();
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 5 * 60 * 1000); // Default: 5 minutes
const CACHE_KEY = "default";

async function fetchSalonesFromGitHub(): Promise<SalonIntegral[]> {
    const headers: Record<string, string> = {
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
        // PAT prevents rate-limit issues and ensures fresh data
        ...(process.env.GITHUB_PAT ? { Authorization: `Bearer ${process.env.GITHUB_PAT}` } : {}),
    };

    const res = await fetch(GITHUB_API_URL, {
        headers,
        cache: "no-store", // Always get the latest from GitHub on cache miss
    });

    if (!res.ok) {
        throw new Error(`GitHub API returned ${res.status}`);
    }

    const raw = await res.json();
    return raw.map(mapRawToSalon);
}

async function getSalones(): Promise<SalonIntegral[]> {
    const cached = cache.get(CACHE_KEY);
    const now = Date.now();

    // Cache hit: return cached data if still within TTL
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }

    // Cache miss or expired: fetch fresh data and store in cache
    const data = await fetchSalonesFromGitHub();
    cache.set(CACHE_KEY, { data, timestamp: now });
    return data;
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

        // Always load unfiltered data from cache; filter in memory
        let salones = await getSalones();

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
