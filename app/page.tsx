import Link from "next/link";

export default function HeroPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white text-black font-mono">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
          cp-arena
        </span>
        <span className="text-xs text-gray-400">v0.1.0 · sepolia testnet</span>
      </header>

      <div className="flex flex-col flex-1 items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">
          competitive programming · web3
        </p>

        <h1 className="text-4xl font-bold leading-tight mb-6 max-w-2xl">
          Decentralizing problem solving and submission for full transparency and trust.
        </h1>

        <p className="text-sm text-gray-500 max-w-xl mb-2">
          No third-party contest platform.
        </p>
        <p className="text-sm font-semibold text-gray-700 mb-10">
          Fully on-chain. Fully yours.
        </p>

        <Link
          href="/dashboard"
          className="px-5 py-2 border border-gray-800 bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors"
        >
          Go to Dashboard →
        </Link>
      </div>

      <footer className="px-6 py-3 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
        <span>cp-arena</span>
        <span>built on ethereum · sepolia</span>
      </footer>
    </main>
  );
}
