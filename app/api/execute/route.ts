import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Contest from "@/models/Contest";

interface TestResult {
    index: number;
    passed: boolean;
    error?: string;
}

async function runOnJDoodle(
    code: string,
    stdin: string,
    clientId: string,
    clientSecret: string
): Promise<{ output: string; statusCode: number }> {
    const res = await fetch("https://api.jdoodle.com/v1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            clientId,
            clientSecret,
            script: code,
            stdin,
            language: "nodejs",
            versionIndex: "4",
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`JDoodle HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    return { output: data.output ?? "", statusCode: data.statusCode ?? 200 };
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { code, contestId, problemIndex } = body as {
            code: string;
            contestId: string;
            problemIndex: number;
        };

        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "Missing or invalid 'code' field." }, { status: 400 });
        }
        if (!contestId || typeof contestId !== "string") {
            return NextResponse.json({ error: "Missing 'contestId'." }, { status: 400 });
        }
        if (typeof problemIndex !== "number" || problemIndex < 0) {
            return NextResponse.json({ error: "Missing or invalid 'problemIndex'." }, { status: 400 });
        }

        const clientId = process.env.JDOODLE_CLIENT_ID;
        const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { error: "Server misconfiguration: JDoodle credentials not set." },
                { status: 500 }
            );
        }

        await connectDB();
        const contest = await Contest.findById(contestId).lean() as {
            questions: { testCases: { input: string; expectedOutput: string }[] }[];
        } | null;

        if (!contest) {
            return NextResponse.json({ error: "Contest not found." }, { status: 404 });
        }

        const question = contest.questions[problemIndex];
        if (!question) {
            return NextResponse.json({ error: "Problem not found." }, { status: 404 });
        }

        const { testCases } = question;

        if (!testCases || testCases.length === 0) {
            return NextResponse.json({ error: "No test cases found for this problem." }, { status: 400 });
        }

        const results: TestResult[] = [];

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            try {
                const { output, statusCode } = await runOnJDoodle(code, tc.input, clientId, clientSecret);

                if (statusCode !== 200) {
                    results.push({ index: i, passed: false, error: "Runtime error" });
                    continue;
                }

                const actual = output.trimEnd();
                const expected = tc.expectedOutput.trimEnd();
                results.push({ index: i, passed: actual === expected });
            } catch (err) {
                results.push({
                    index: i,
                    passed: false,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        const allPassed = results.every((r) => r.passed);
        const passedCount = results.filter((r) => r.passed).length;

        return NextResponse.json({ results, allPassed, passedCount, total: testCases.length });
    } catch (err) {
        return NextResponse.json(
            { error: `Internal server error: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}
