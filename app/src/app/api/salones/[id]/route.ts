import { NextResponse } from "next/server";
import { getSalonesData } from "@/lib/sample-data";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const salones = getSalonesData();
        const salon = salones.find((s) => s.id_salon === parseInt(id));

        if (!salon) {
            return NextResponse.json({ error: "Salon not found" }, { status: 404 });
        }

        return NextResponse.json(salon);
    } catch (error) {
        console.error("Error fetching salon:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
