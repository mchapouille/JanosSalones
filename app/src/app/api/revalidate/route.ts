import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);

    // Reject any request that attempts to pass the secret via query string
    // Secrets in URLs appear in server logs, proxies, and browser history
    if (searchParams.has("secret")) {
        console.warn("[revalidate] Rejected: secret sent via query parameter (insecure transport)");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read secret from Authorization: Bearer <token> header only
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn("[revalidate] Rejected: missing or malformed Authorization header");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7); // Strip "Bearer " prefix

    if (!REVALIDATE_SECRET || token !== REVALIDATE_SECRET) {
        console.warn("[revalidate] Rejected: invalid token");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Revalidate the full layout cache so all pages fetch fresh data
    revalidatePath("/", "layout");
    console.log("[revalidate] Cache revalidated via revalidatePath");

    return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}
