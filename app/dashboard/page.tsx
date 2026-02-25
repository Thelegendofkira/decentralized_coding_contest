"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";

type WalletState =
    | { status: "disconnected" }
    | { status: "connecting" }
    | { status: "connected"; address: string };

export default function DashboardPage() {
    const router = useRouter();
    const [wallet, setWallet] = useState<WalletState>({ status: "disconnected" });
    const [contestId, setContestId] = useState("");

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
        } catch {
            setWallet({ status: "disconnected" });
        }
    };

    const disconnectWallet = () => setWallet({ status: "disconnected" });

    const handleJoin = () => {
        if (wallet.status !== "connected") {
            alert("Please connect your wallet before joining a contest.");
            return;
        }
        if (!contestId.trim()) {
            alert("Please enter a Contest ID.");
            return;
        }
        router.push(`/contest/${contestId.trim()}`);
    };

    const walletLabel =
        wallet.status === "connecting"
            ? "Connecting..."
            : wallet.status === "connected"
                ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
                : "Connect Wallet";

    return (
        <div className="flex flex-col min-h-screen bg-white text-black font-mono text-sm">
            <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
                <Link href="/" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors">
                    ← cp-arena
                </Link>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">dashboard</span>
                    {wallet.status === "connected" ? (
                        <button
                            onClick={disconnectWallet}
                            title="Click to disconnect"
                            className="text-xs border border-gray-400 px-2 py-1 text-gray-600 hover:border-gray-700 hover:text-black transition-colors"
                        >
                            ⬡ {walletLabel}
                        </button>
                    ) : (
                        <button
                            onClick={connectWallet}
                            disabled={wallet.status === "connecting"}
                            className="text-xs border border-gray-600 px-2 py-1 text-gray-700 hover:border-gray-900 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ⬡ {walletLabel}
                        </button>
                    )}
                </div>
            </header>

            <main className="flex flex-col flex-1 max-w-2xl w-full mx-auto px-6 py-12 gap-10">
                {wallet.status !== "connected" && (
                    <div className="border border-gray-200 px-4 py-3 text-xs text-gray-500">
                        → Connect your wallet above to join or create contests.
                    </div>
                )}

                <section className="border border-gray-200 p-6">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Create</p>
                    <h2 className="text-lg font-bold mb-2">Create a Contest</h2>
                    <p className="text-xs text-gray-500 mb-5">
                        Define your problem set, test cases, and time limit. Get a shareable Contest ID.
                    </p>
                    <Link
                        href="/create"
                        className="inline-block px-4 py-1.5 text-sm border border-gray-800 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                    >
                        Create Contest →
                    </Link>
                </section>

                <section className="border border-gray-200 p-6">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Join</p>
                    <h2 className="text-lg font-bold mb-2">Join a Contest</h2>
                    <p className="text-xs text-gray-500 mb-5">
                        Enter a Contest ID shared by the creator to start competing.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={contestId}
                            onChange={(e) => setContestId(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                            placeholder="Paste Contest ID..."
                            className="flex-1 border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-600"
                        />
                        <button
                            onClick={handleJoin}
                            className="px-4 py-1.5 text-sm border border-gray-800 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                        >
                            Join →
                        </button>
                    </div>
                </section>
            </main>

            <footer className="px-6 py-3 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
                <span>cp-arena</span>
                <span>built on ethereum · sepolia</span>
            </footer>
        </div>
    );
}
