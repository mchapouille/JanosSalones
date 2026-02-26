import { NextResponse } from "next/server";

// BCRA API for USD Oficial Minorista: https://api.estadisticasbcra.com/usd_of_minorista
// Returns [{d: "YYYY-MM-DD", v: number}, ...] newest last.
// 100 requests/day limit — we cache for 1 hour server-side.

const BCRA_URL = "https://api.estadisticasbcra.com/usd_of_minorista";
const BCRA_TOKEN = process.env.BCRA_TOKEN ||
    "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDM2MTQ4MzksInJlc" +
    "5cGUiOiJleHeRlcm5hbCIsInZzZXliOiJjaGFwb3VpbGxlQGdtYWlsLmNvbSJ9.sHC" +
    "N0T6rYCFKM8QpfmNhJd3qfV35zKPy-Vz7kkiJhRunn_e0Pn4QjRjGXgyaprAP_Ge0J" +
    "-m83WyG4ImUq3P94A";

export async function GET() {
    try {
        const res = await fetch(BCRA_URL, {
            headers: { Authorization: `BEARER ${BCRA_TOKEN}` },
            // Cache the response for 1 hour to avoid exceeding the 100 req/day limit
            next: { revalidate: 3600 },
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("[dolar-rate] BCRA error:", res.status, text);
            return NextResponse.json({ value: 1470, date: null, error: true });
        }

        const data: Array<{ d: string; v: number }> = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ value: 1470, date: null, error: true });
        }

        const latest = data[data.length - 1];
        return NextResponse.json({ value: latest.v, date: latest.d });
    } catch (err) {
        console.error("[dolar-rate] fetch error:", err);
        return NextResponse.json({ value: 1470, date: null, error: true });
    }
}
