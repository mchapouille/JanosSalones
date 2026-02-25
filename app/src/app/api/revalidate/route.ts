import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (!REVALIDATE_SECRET || secret !== REVALIDATE_SECRET) {
        return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    revalidateTag("salon-data");
    console.log("Cache revalidated for tag: salon-data");

    return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}
