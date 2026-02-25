"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ethers } from "ethers";
import { Loader2 } from "lucide-react";
import { getBadgeContract } from "@/utils/contract";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Question { title: string; description: string; }
interface Contest { _id: string; name: string; timeLimitMinutes: number; questions: Question[]; }

type SubmitState =
    | { status: "idle" }
    | { status: "running" }
    | { status: "done"; allPassed: boolean; passedCount: number; total: number }
    | { status: "error"; message: string };

type MintState =
    | { status: "idle" }
    | { status: "minting" }
    | { status: "minted"; txHash: string }
    | { status: "error"; message: string };

const SEPOLIA_CHAIN_ID = "0xaa36a7";

const STARTER_CODE = `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');
// Write your solution here
`;

export default function ProblemArenaPage() {
    const { id: contestId, problemIndex: problemIndexStr } = useParams<{ id: string; problemIndex: string }>();
    const problemIndex = Number(problemIndexStr);

    const [contest, setContest] = useState<Contest | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [code, setCode] = useState(STARTER_CODE);
    const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
    const [mintState, setMintState] = useState<MintState>({ status: "idle" });

    const [wallet, setWallet] = useState<{ address: string; signer: ethers.JsonRpcSigner } | null>(null);
    const [timerExpired, setTimerExpired] = useState(false);

    const editorRef = useRef<unknown>(null);

    useEffect(() => {
        fetch(`/api/contests/${contestId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) setLoadError(data.error);
                else setContest(data.contest);
            })
            .catch(() => setLoadError("Failed to load contest."))
            .finally(() => setLoading(false));
    }, [contestId]);

    useEffect(() => {
        if (!contest) return;
        const storageKey = `cp-arena-start-${contestId}`;
        const startTime = Number(localStorage.getItem(storageKey));
        if (!startTime) return;
        const totalSeconds = contest.timeLimitMinutes * 60;
        const check = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (elapsed >= totalSeconds) setTimerExpired(true);
        };
        check();
        const interval = setInterval(check, 5000);
        return () => clearInterval(interval);
    }, [contest, contestId]);

    useEffect(() => {
        if (typeof window === "undefined" || !window.ethereum) return;
        // eth_accounts: silent read, no MetaMask popup
        (window.ethereum.request({ method: "eth_accounts" }) as Promise<string[]>)
            .then(async (accounts) => {
                if (accounts.length > 0) {
                    const provider = new ethers.BrowserProvider(window.ethereum!);
                    const signer = await provider.getSigner();
                    const address = await signer.getAddress();
                    setWallet({ address, signer });
                }
            })
            .catch(() => { });
    }, []);

    const connectWallet = async () => {
        if (!window.ethereum) { alert("MetaMask not detected."); return; }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setWallet({ address, signer });
        } catch { /* user rejected */ }
    };

    const mintBadge = async (signer: ethers.JsonRpcSigner, to: string) => {
        setMintState({ status: "minting" });
        try {
            const currentChainId = await window.ethereum!.request({ method: "eth_chainId" }) as string;
            if (currentChainId.toLowerCase() !== SEPOLIA_CHAIN_ID) {
                await window.ethereum!.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: SEPOLIA_CHAIN_ID }],
                });
            }
            const questionHash = `${contestId}-${problemIndex}`;
            const uri = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(questionHash)}&contestId=${encodeURIComponent(contestId)}&problem=${problemIndex}`;
            const contract = getBadgeContract(signer);
            const tx = await contract.safeMint(to, uri, questionHash);
            await tx.wait();
            setMintState({ status: "minted", txHash: tx.hash });
        } catch (err) {
            setMintState({ status: "error", message: err instanceof Error ? err.message : String(err) });
        }
    };

    const handleSubmit = async () => {
        if (timerExpired) return;
        setSubmitState({ status: "running" });
        setMintState({ status: "idle" });
        try {
            const res = await fetch("/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, contestId, problemIndex }),
            });
            const data = await res.json();
            if (!res.ok) {
                setSubmitState({ status: "error", message: data.error || "Execution failed." });
                return;
            }
            setSubmitState({
                status: "done",
                allPassed: data.allPassed,
                passedCount: data.passedCount,
                total: data.total,
            });
            if (data.allPassed && wallet) {
                await mintBadge(wallet.signer, wallet.address);
            }
        } catch (err) {
            setSubmitState({ status: "error", message: err instanceof Error ? err.message : "Network error." });
        }
    };

    const question = contest?.questions[problemIndex];

    return (
        <div className="flex flex-col h-screen bg-white text-black font-mono text-sm overflow-hidden">
            <header className="flex items-center justify-between px-6 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
                <Link href={`/contest/${contestId}`} className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
                    ← contest
                </Link>
                <div className="flex items-center gap-4">
                    {timerExpired && (
                        <span className="text-xs text-red-500 font-semibold">⏱ Time Expired</span>
                    )}
                    {contest && (
                        <span className="text-xs text-gray-400">{contest.name}</span>
                    )}
                    {wallet ? (
                        <span className="text-xs border border-gray-300 px-2 py-0.5 text-gray-600">
                            ⬡ {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                        </span>
                    ) : (
                        <button onClick={connectWallet} className="text-xs border border-gray-600 px-2 py-0.5 text-gray-700 hover:border-gray-900 hover:text-black transition-colors">
                            ⬡ Connect Wallet
                        </button>
                    )}
                </div>
            </header>

            {loading && (
                <div className="flex items-center gap-2 px-6 py-4 text-gray-400 text-xs">
                    <Loader2 size={13} className="animate-spin" /> Loading problem...
                </div>
            )}

            {loadError && (
                <div className="px-6 py-4 text-xs text-red-600">✗ {loadError}</div>
            )}

            {!loading && !loadError && !question && (
                <div className="px-6 py-4 text-xs text-red-600">✗ Problem not found.</div>
            )}

            {question && (
                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT — Problem Description */}
                    <div className="w-[42%] border-r border-gray-200 flex flex-col overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
                            <p className="text-xs text-gray-400 uppercase tracking-wider">
                                Q{problemIndex + 1}
                            </p>
                            <h1 className="font-bold text-base mt-0.5">{question.title}</h1>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {question.description}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT — Editor + Submit */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                            <span className="text-xs text-gray-400">JavaScript (Node.js)</span>
                            <button
                                onClick={handleSubmit}
                                disabled={submitState.status === "running" || timerExpired}
                                className="flex items-center gap-1.5 text-xs border border-gray-800 bg-gray-800 text-white px-3 py-1 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {submitState.status === "running" ? (
                                    <><Loader2 size={11} className="animate-spin" /> Running...</>
                                ) : timerExpired ? "Time Expired" : "Submit Code →"}
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <MonacoEditor
                                height="100%"
                                defaultLanguage="javascript"
                                value={code}
                                onChange={(v) => setCode(v ?? "")}
                                onMount={(editor) => { editorRef.current = editor; }}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    wordWrap: "on",
                                    scrollBeyondLastLine: false,
                                    lineNumbers: "on",
                                    tabSize: 2,
                                    padding: { top: 12 },
                                }}
                            />
                        </div>

                        {/* Result Panel */}
                        <div className="border-t border-gray-200 px-4 py-3 shrink-0 space-y-1.5 max-h-40 overflow-y-auto bg-gray-50">
                            {submitState.status === "idle" && (
                                <p className="text-xs text-gray-400">Submit your code to run against hidden test cases.</p>
                            )}

                            {submitState.status === "done" && (
                                <div className={`text-xs font-semibold ${submitState.allPassed ? "text-green-700" : "text-red-600"}`}>
                                    {submitState.allPassed
                                        ? `✓ All ${submitState.total} test cases passed!`
                                        : `✗ ${submitState.passedCount}/${submitState.total} test cases passed.`}
                                </div>
                            )}

                            {submitState.status === "error" && (
                                <div className="text-xs text-red-600">✗ {submitState.message}</div>
                            )}

                            {submitState.status === "done" && submitState.allPassed && !wallet && (
                                <div className="text-xs text-yellow-700">
                                    ⬡ Connect wallet above to mint your badge.
                                </div>
                            )}

                            {mintState.status === "minting" && (
                                <div className="flex items-center gap-1.5 text-xs text-yellow-700">
                                    <Loader2 size={11} className="animate-spin" /> Minting badge — confirm in MetaMask...
                                </div>
                            )}
                            {mintState.status === "minted" && (
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs text-green-700">
                                        ✓ Badge minted!{" "}
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${mintState.txHash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline"
                                        >
                                            View tx ↗
                                        </a>
                                    </div>
                                    <Link
                                        href="/dashboard"
                                        className="text-xs border border-gray-800 bg-gray-800 text-white px-3 py-1 hover:bg-gray-700 transition-colors shrink-0"
                                    >
                                        Finish Contest →
                                    </Link>
                                </div>
                            )}
                            {mintState.status === "error" && (
                                <div className="text-xs text-red-600">✗ Mint failed: {mintState.message}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
