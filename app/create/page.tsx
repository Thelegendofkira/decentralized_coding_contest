"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
}

interface Question {
    id: string;
    title: string;
    description: string;
    testCases: TestCase[];
}

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

function makeTestCase(): TestCase {
    return { id: uid(), input: "", expectedOutput: "" };
}

function makeQuestion(): Question {
    return { id: uid(), title: "", description: "", testCases: [makeTestCase()] };
}

export default function CreatePage() {
    const [contestName, setContestName] = useState("");
    const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(60);
    const [questions, setQuestions] = useState<Question[]>([makeQuestion()]);

    const [submitting, setSubmitting] = useState(false);
    const [contestId, setContestId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const addQuestion = () => setQuestions((prev) => [...prev, makeQuestion()]);

    const removeQuestion = (qId: string) =>
        setQuestions((prev) => prev.filter((q) => q.id !== qId));

    const updateQuestion = (qId: string, field: "title" | "description", value: string) =>
        setQuestions((prev) =>
            prev.map((q) => (q.id === qId ? { ...q, [field]: value } : q))
        );

    const addTestCase = (qId: string) =>
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === qId ? { ...q, testCases: [...q.testCases, makeTestCase()] } : q
            )
        );

    const removeTestCase = (qId: string, tcId: string) =>
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === qId
                    ? { ...q, testCases: q.testCases.filter((tc) => tc.id !== tcId) }
                    : q
            )
        );

    const updateTestCase = (
        qId: string,
        tcId: string,
        field: "input" | "expectedOutput",
        value: string
    ) =>
        setQuestions((prev) =>
            prev.map((q) =>
                q.id === qId
                    ? {
                        ...q,
                        testCases: q.testCases.map((tc) =>
                            tc.id === tcId ? { ...tc, [field]: value } : tc
                        ),
                    }
                    : q
            )
        );

    const handleSubmit = async () => {
        setError(null);
        setContestId(null);

        if (!contestName.trim()) {
            setError("Contest name is required.");
            return;
        }
        if (timeLimitMinutes < 1) {
            setError("Time limit must be at least 1 minute.");
            return;
        }
        for (const q of questions) {
            if (!q.title.trim()) {
                setError("All questions must have a title.");
                return;
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/contests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: contestName.trim(),
                    timeLimitMinutes,
                    questions: questions.map(({ title, description, testCases }) => ({
                        title: title.trim(),
                        description: description.trim(),
                        testCases: testCases.map(({ input, expectedOutput }) => ({
                            input,
                            expectedOutput,
                        })),
                    })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Unknown error.");
            } else {
                setContestId(data.id);
            }
        } catch (err) {
            setError(`Network error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white text-black font-mono text-sm">
            <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                <Link
                    href="/dashboard"
                    className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                >
                    ← dashboard
                </Link>
                <span className="text-xs text-gray-400">create contest</span>
            </header>

            <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-8">
                {contestId ? (
                    <div className="border border-gray-300 p-6 space-y-4">
                        <p className="text-xs uppercase tracking-wider text-gray-400">Contest Created</p>
                        <h2 className="text-lg font-bold">Share this Contest ID</h2>
                        <div className="border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-4">
                            <code className="text-sm break-all">{contestId}</code>
                            <button
                                onClick={() => navigator.clipboard.writeText(contestId)}
                                className="shrink-0 text-xs border border-gray-400 px-2 py-1 hover:border-gray-700 transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Participants paste this ID on the dashboard to join.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <Link
                                href="/dashboard"
                                className="text-xs border border-gray-400 px-3 py-1.5 hover:border-gray-700 transition-colors"
                            >
                                ← Back to Dashboard
                            </Link>
                            <button
                                onClick={() => {
                                    setContestId(null);
                                    setContestName("");
                                    setTimeLimitMinutes(60);
                                    setQuestions([makeQuestion()]);
                                }}
                                className="text-xs border border-gray-400 px-3 py-1.5 hover:border-gray-700 transition-colors"
                            >
                                Create Another
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-5">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                                    Contest Settings
                                </p>
                                <div className="border border-gray-200 p-4 space-y-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Contest Name</label>
                                        <input
                                            type="text"
                                            value={contestName}
                                            onChange={(e) => setContestName(e.target.value)}
                                            placeholder="e.g. Weekly Algorithm Challenge"
                                            className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Time Limit (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={timeLimitMinutes}
                                            onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                                            className="w-40 border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs uppercase tracking-wider text-gray-400">
                                        Questions ({questions.length})
                                    </p>
                                    <button
                                        onClick={addQuestion}
                                        className="flex items-center gap-1 text-xs border border-gray-400 px-2 py-1 text-gray-600 hover:border-gray-700 hover:text-black transition-colors"
                                    >
                                        <Plus size={12} /> Add Question
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    {questions.map((q, qi) => (
                                        <div key={q.id} className="border border-gray-200 p-4 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    Q{qi + 1}
                                                </span>
                                                {questions.length > 1 && (
                                                    <button
                                                        onClick={() => removeQuestion(q.id)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Remove question"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Title</label>
                                                <input
                                                    type="text"
                                                    value={q.title}
                                                    onChange={(e) => updateQuestion(q.id, "title", e.target.value)}
                                                    placeholder="e.g. Two Sum"
                                                    className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-600"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={q.description}
                                                    onChange={(e) =>
                                                        updateQuestion(q.id, "description", e.target.value)
                                                    }
                                                    rows={3}
                                                    placeholder="Describe the problem, constraints, and expected format..."
                                                    className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-600 resize-none"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-xs text-gray-500">
                                                        Test Cases ({q.testCases.length})
                                                    </label>
                                                    <button
                                                        onClick={() => addTestCase(q.id)}
                                                        className="flex items-center gap-1 text-xs border border-gray-300 px-2 py-0.5 text-gray-500 hover:border-gray-600 hover:text-black transition-colors"
                                                    >
                                                        <Plus size={11} /> Add Test
                                                    </button>
                                                </div>

                                                <div className="space-y-2">
                                                    {q.testCases.map((tc, tci) => (
                                                        <div
                                                            key={tc.id}
                                                            className="border border-gray-100 bg-gray-50 p-3 space-y-2"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs text-gray-400">Test #{tci + 1}</span>
                                                                {q.testCases.length > 1 && (
                                                                    <button
                                                                        onClick={() => removeTestCase(q.id, tc.id)}
                                                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                                                        title="Remove test"
                                                                    >
                                                                        <Trash2 size={11} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="block text-xs text-gray-400 mb-0.5">
                                                                        stdin
                                                                    </label>
                                                                    <textarea
                                                                        value={tc.input}
                                                                        onChange={(e) =>
                                                                            updateTestCase(q.id, tc.id, "input", e.target.value)
                                                                        }
                                                                        rows={2}
                                                                        placeholder={"e.g. 2 7 11 15\n9"}
                                                                        className="w-full border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:border-gray-400 resize-none"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-gray-400 mb-0.5">
                                                                        expected output
                                                                    </label>
                                                                    <textarea
                                                                        value={tc.expectedOutput}
                                                                        onChange={(e) =>
                                                                            updateTestCase(
                                                                                q.id,
                                                                                tc.id,
                                                                                "expectedOutput",
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        rows={2}
                                                                        placeholder="e.g. 0 1"
                                                                        className="w-full border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:border-gray-400 resize-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
                                ✗ {error}
                            </div>
                        )}

                        <div className="flex items-center gap-4 pt-2">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center gap-1.5 px-5 py-2 border border-gray-800 bg-gray-800 text-white text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" /> Saving...
                                    </>
                                ) : (
                                    "Save & Get Contest ID →"
                                )}
                            </button>
                            <Link
                                href="/dashboard"
                                className="text-xs text-gray-400 hover:text-black transition-colors"
                            >
                                Cancel
                            </Link>
                        </div>
                    </>
                )}
            </main>

            <footer className="px-6 py-3 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
                <span>cp-arena</span>
                <span>built on ethereum · sepolia</span>
            </footer>
        </div>
    );
}
