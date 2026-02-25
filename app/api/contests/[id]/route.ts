import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Contest from "@/models/Contest";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectDB();

        const contest = await Contest.findById(id).lean();

        if (!contest) {
            return NextResponse.json({ error: "Contest not found." }, { status: 404 });
        }

        return NextResponse.json({ contest });
    } catch (err) {
        return NextResponse.json(
            { error: `Failed to fetch contest: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}
