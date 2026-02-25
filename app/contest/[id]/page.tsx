"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { Loader2 } from "lucide-react";

interface TestCase { input: string; expectedOutput: string; }
interface Question { _id: string; title: string; description: string; testCases: TestCase[]; }
interface Contest { _id: string; name: string; timeLimitMinutes: number; questions: Question[]; }

type WalletState =
    | { status: "disconnected" }
    | { status: "connecting" }
    | { status: "connected"; address: string };

type AccessState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "granted" }
    | { status: "denied"; reason: string }
    | { status: "error"; reason: string };

function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h > 0 ? String(h).padStart(2, "0") : null, String(m).padStart(2, "0"), String(s).padStart(2, "0")]
        .filter(Boolean)
        .join(":");
}

export default function ContestLobbyPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [contest, setContest] = useState<Contest | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [wallet, setWallet] = useState<WalletState>({ status: "disconnected" });
    const [access, setAccess] = useState<AccessState>({ status: "idle" });

    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [timerExpired, setTimerExpired] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const participationPosted = useRef(false);

    // Auto-reconnect silently on mount
    useEffect(() => {
        if (typeof window === "undefined" || !window.ethereum) return;
        (window.ethereum.request({ method: "eth_accounts" }) as Promise<string[]>)
            .then(async (accounts) => {
                if (accounts.length > 0) {
                    const provider = new ethers.BrowserProvider(window.ethereum!);
                    const signer = await provider.getSigner();
                    const address = await signer.getAddress();
                    setWallet({ status: "connected", address });
                    checkAndGrant(address);
                }
            })
            .catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetch(`/api/contests/${id}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) setLoadError(data.error);
                else setContest(data.contest);
            })
            .catch(() => setLoadError("Failed to load contest."))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!contest) return;

        const storageKey = `cp-arena-start-${id}`;
        let startTime = Number(localStorage.getItem(storageKey));
        if (!startTime) {
            startTime = Date.now();
            localStorage.setItem(storageKey, String(startTime));
        }

        const totalSeconds = contest.timeLimitMinutes * 60;

        const tick = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = totalSeconds - elapsed;
            if (remaining <= 0) {
                setSecondsLeft(0);
                setTimerExpired(true);
            } else {
                setSecondsLeft(remaining);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [contest, id]);

    // Only check eligibility on join — do NOT record yet
    const checkAndGrant = useCallback(async (address: string) => {
        setAccess({ status: "checking" });
        try {
            const res = await fetch(
                `/api/participation?contestId=${id}&walletAddress=${address.toLowerCase()}`
            );
            const data = await res.json();

            if (!res.ok) {
                setAccess({ status: "error", reason: data.error || "Failed to verify participation." });
                return;
            }

            if (data.participated) {
                setAccess({ status: "denied", reason: "This wallet has already participated in this contest." });
                return;
            }

            // Eligibility confirmed — record will happen on Finish
            setAccess({ status: "granted" });
        } catch {
            setAccess({ status: "error", reason: "Network error during participation check." });
        }
    }, [id]);

    // Record participation once (called on Finish Contest or auto on timer expiry)
    const recordParticipation = useCallback(async (address: string) => {
        if (participationPosted.current) return;
        participationPosted.current = true;
        try {
            await fetch("/api/participation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contestId: id, walletAddress: address }),
            });
        } catch { /* best-effort */ }
    }, [id]);

    // Auto-record when timer runs out (if wallet connected and access granted)
    useEffect(() => {
        if (timerExpired && access.status === "granted" && wallet.status === "connected") {
            recordParticipation(wallet.address);
        }
    }, [timerExpired, access.status, wallet, recordParticipation]);

    const handleFinish = async () => {
        setFinishing(true);
        if (wallet.status === "connected") {
            await recordParticipation(wallet.address);
        }
        router.push("/dashboard");
    };

    const connectWallet = async () => {
        if (typeof window === "undefined" || !window.ethereum) {
            alert("MetaMask not detected. Please install it to continue.");
            return;
        }
        setWallet({ status: "connecting" });
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setWallet({ status: "connected", address });
            await checkAndGrant(address);
        } catch {
            setWallet({ status: "disconnected" });
        }
    };

    const disconnectWallet = () => {
        setWallet({ status: "disconnected" });
        setAccess({ status: "idle" });
    };

    const walletLabel =
        wallet.status === "connecting" ? "Connecting..." :
            wallet.status === "connected" ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` :
                "Connect Wallet";

    const timerColor =
        secondsLeft === null ? "text-gray-400" :
            secondsLeft < 60 ? "text-red-600" :
                secondsLeft < 300 ? "text-yellow-600" :
                    "text-gray-800";

    return (
        <div className="flex flex-col min-h-screen bg-white text-black font-mono text-sm">
            <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                <Link href="/dashboard" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
                    ← dashboard
                </Link>

                <div className="flex items-center gap-3">
                    {wallet.status === "connected" ? (
                        <button onClick={disconnectWallet} title="Click to disconnect"
                            className="text-xs border border-gray-400 px-2 py-1 text-gray-600 hover:border-gray-700 hover:text-black transition-colors">
                            ⬡ {walletLabel}
                        </button>
                    ) : (
                        <button onClick={connectWallet} disabled={wallet.status === "connecting"}
                            className="text-xs border border-gray-600 px-2 py-1 text-gray-700 hover:border-gray-900 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            ⬡ {walletLabel}
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-10 space-y-8">
                {loading && (
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <Loader2 size={13} className="animate-spin" /> Loading contest...
                    </div>
                )}

                {loadError && (
                    <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                        ✗ {loadError}
                    </div>
                )}

                {contest && (
                    <>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Contest</p>
                            <h1 className="text-xl font-bold">{contest.name}</h1>
                            <p className="text-xs text-gray-400 mt-1">
                                ID: <span className="text-gray-600">{id}</span>
                            </p>
                        </div>

                        <div className="border border-gray-200 p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Time Remaining</p>
                                {timerExpired ? (
                                    <p className="text-lg font-bold text-red-600">Time&apos;s up!</p>
                                ) : (
                                    <p className={`text-3xl font-bold tabular-nums ${timerColor}`}>
                                        {secondsLeft !== null ? formatTime(secondsLeft) : "--:--"}
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Limit</p>
                                <p className="text-sm font-semibold">{contest.timeLimitMinutes} min</p>
                            </div>
                        </div>

                        {access.status === "idle" && wallet.status === "disconnected" && (
                            <div className="border border-gray-200 px-4 py-3 text-xs text-gray-500">
                                → Connect your wallet above to unlock questions and begin the contest.
                            </div>
                        )}

                        {access.status === "checking" && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Loader2 size={12} className="animate-spin" /> Verifying participation eligibility...
                            </div>
                        )}

                        {access.status === "denied" && (
                            <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                                ✗ Access denied: {access.reason}
                            </div>
                        )}

                        {access.status === "error" && (
                            <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                                ✗ Error: {access.reason}
                            </div>
                        )}

                        {access.status === "granted" && !timerExpired && (
                            <div className="border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-700">
                                ✓ Wallet verified. Timer is running — good luck!
                            </div>
                        )}

                        {timerExpired && access.status === "granted" && (
                            <div className="border border-gray-800 bg-gray-800 p-4 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs text-gray-300 mb-0.5">Contest complete</p>
                                    <p className="text-sm font-bold text-white">Time&apos;s up — your attempt has been recorded.</p>
                                </div>
                                <button
                                    onClick={handleFinish}
                                    disabled={finishing}
                                    className="shrink-0 flex items-center gap-1.5 text-xs border border-white text-white px-4 py-2 hover:bg-white hover:text-gray-900 disabled:opacity-50 transition-colors"
                                >
                                    {finishing ? <><Loader2 size={11} className="animate-spin" /> Finishing...</> : "Finish Contest →"}
                                </button>
                            </div>
                        )}

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs uppercase tracking-wider text-gray-400">
                                    Questions ({contest.questions.length})
                                </p>
                            </div>

                            <div className="space-y-2">
                                {contest.questions.map((q, i) => (
                                    <div key={q._id ?? i} className="border border-gray-200 p-4 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <span className="text-xs text-gray-400 mr-2">Q{i + 1}</span>
                                            <span className="font-semibold">{q.title}</span>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{q.description}</p>
                                        </div>

                                        {access.status === "granted" && !timerExpired ? (
                                            <Link
                                                href={`/contest/${id}/problem/${i}`}
                                                className="shrink-0 text-xs border border-gray-700 px-3 py-1 hover:bg-gray-800 hover:text-white transition-colors"
                                            >
                                                Open →
                                            </Link>
                                        ) : (
                                            <span className="shrink-0 text-xs border border-gray-200 px-3 py-1 text-gray-300 cursor-not-allowed">
                                                {timerExpired ? "Expired" : "Locked"}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
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
