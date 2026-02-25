import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Contest from "@/models/Contest";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, timeLimitMinutes, questions } = body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json({ error: "Contest name is required." }, { status: 400 });
        }

        if (!timeLimitMinutes || typeof timeLimitMinutes !== "number" || timeLimitMinutes < 1) {
            return NextResponse.json({ error: "A valid time limit (minutes) is required." }, { status: 400 });
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ error: "At least one question is required." }, { status: 400 });
        }

        await connectDB();

        const contest = await Contest.create({ name: name.trim(), timeLimitMinutes, questions });

        return NextResponse.json({ id: contest._id.toString() }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: `Failed to save contest: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}
