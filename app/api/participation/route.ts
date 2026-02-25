import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Participation from "@/models/Participation";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const contestId = searchParams.get("contestId");
        const walletAddress = searchParams.get("walletAddress");

        if (!contestId || !walletAddress) {
            return NextResponse.json(
                { error: "contestId and walletAddress are required." },
                { status: 400 }
            );
        }

        await connectDB();

        const existing = await Participation.findOne({
            contestId,
            walletAddress: walletAddress.toLowerCase(),
        }).lean();

        return NextResponse.json({ participated: !!existing });
    } catch (err) {
        return NextResponse.json(
            { error: `Check failed: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { contestId, walletAddress } = await req.json();

        if (!contestId || !walletAddress) {
            return NextResponse.json(
                { error: "contestId and walletAddress are required." },
                { status: 400 }
            );
        }

        await connectDB();

        try {
            await Participation.create({
                contestId,
                walletAddress: walletAddress.toLowerCase(),
            });
        } catch (err: unknown) {
            const mongoErr = err as { code?: number };
            if (mongoErr.code === 11000) {
                return NextResponse.json(
                    { error: "This wallet has already participated in this contest." },
                    { status: 409 }
                );
            }
            throw err;
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: `Failed to record participation: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}
