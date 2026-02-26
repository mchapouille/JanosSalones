import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) {
        return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    // Revalidate the full layout cache so all pages fetch fresh data
    revalidatePath("/", "layout");
    console.log("Cache revalidated via revalidatePath");

    return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}
