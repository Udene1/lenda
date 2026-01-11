"use client";

import { useState, use } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import {
    ArrowLeft,
    ShieldCheck,
    TrendingUp,
    Clock,
    Users,
    FileText,
    AlertCircle,
    ChevronRight,
    Wallet,
    Info
} from "lucide-react";
import Link from "next/link";
import { usePools } from "@/hooks/usePools";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";

export default function PoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { isConnected } = useAccount();
    const [amount, setAmount] = useState("");
    const { pools, isLoading } = usePools();

    // Find the specific pool
    const pool = pools.find(p => p.id.toLowerCase() === (id as string).toLowerCase());

    if (isLoading) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="mesh-gradient opacity-30" />
                <div className="pt-40 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <h2 className="text-xl font-bold italic uppercase">Loading Pool Details...</h2>
                </div>
            </main>
        );
    }

    if (!pool) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="mesh-gradient opacity-30" />
                <div className="pt-40 flex flex-col items-center justify-center px-6">
                    <div className="card max-w-md w-full text-center">
                        <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold mb-4 italic uppercase">Pool Not Found</h1>
                        <p className="text-slate-400 mb-8">The lending pool you are looking for does not exist or has been removed.</p>
                        <Link href="/pools" className="btn-primary inline-block px-8 py-3">
                            Back to Pools
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const progress = pool.progress || 0;

    return (
        <main className="min-h-screen pb-20">
            <Navbar />
            <div className="mesh-gradient opacity-30" />

            <div className="pt-32 px-6 max-w-7xl mx-auto relative z-10">
                {/* Back Link */}
                <Link href="/pools" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 font-medium text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back to Pools
                </Link>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card mb-8"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        {pool.verified && (
                                            <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" /> Lenda Verified
                                            </div>
                                        )}
                                        <div className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${pool.status === 'Active'
                                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                            }`}>
                                            {pool.status}
                                        </div>
                                    </div>
                                    <h1 className="text-3xl font-bold text-white mb-2">{pool.name}</h1>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                                        <Users className="w-4 h-4" />
                                        Borrower: <span className="text-white">{pool.borrower}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-slate-300 leading-relaxed mb-8 border-b border-white/5 pb-8">
                                {pool.description}
                            </p>

                            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target APY</div>
                                    <div className="text-2xl font-bold text-emerald-400">{pool.apy}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Payment Term</div>
                                    <div className="text-2xl font-bold text-white">{pool.term}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Liquidity Class</div>
                                    <div className="text-2xl font-bold text-white">{pool.type.split(" ")[0]}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk Rating</div>
                                    <div className="text-2xl font-bold text-blue-400">{pool.riskRating}</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Stats & Progress */}
                        <div className="grid md:grid-cols-2 gap-8 mb-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="card"
                            >
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Pool Liquidity</h3>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm font-medium mb-2">
                                            <span className="text-white">Total Filled</span>
                                            <span className="text-slate-400">${pool.filled.toLocaleString()}</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div style={{ width: `${progress}%` }} className="h-full bg-blue-600 rounded-full" />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mt-2 text-slate-500">
                                            <span>0%</span>
                                            <span>Cap: ${pool.capacity.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Min Investment</div>
                                            <div className="text-lg font-bold text-white">{pool.minInvestment}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Backers</div>
                                            <div className="text-lg font-bold text-white">42</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="card"
                            >
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Due Diligence</h3>
                                <div className="space-y-3">
                                    {pool.documents.map((doc: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{doc.name}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-600" />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Sidebar Action Panel */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-blue-600 rounded-3xl p-1 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

                            <div className="bg-slate-900/90 backdrop-blur-xl rounded-[1.3rem] p-6 relative">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-blue-500" /> Supply Capital
                                </h3>

                                {!isConnected ? (
                                    <div className="text-center py-8">
                                        <p className="text-slate-400 text-sm mb-6">Connect your wallet to participate in this lending pool.</p>
                                        <div className="flex justify-center">
                                            <ConnectKitButton />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                                                <label>Amount (USDC)</label>
                                                <span>Bal: 0.00</span>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 transition-all font-bold text-lg"
                                                    placeholder="0.00"
                                                />
                                                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white px-2 py-1 rounded transition-colors">
                                                    Max
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Est. Monthly Return</span>
                                                <span className="font-bold text-emerald-400">
                                                    ${amount ? ((Number(amount) * (parseFloat(pool.apy) / 100)) / 12).toFixed(2) : "0.00"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Protocol Fee</span>
                                                <span className="font-bold text-white">0.00%</span>
                                            </div>
                                        </div>

                                        <button className="btn-primary w-full py-4 text-base font-bold uppercase tracking-wide">
                                            Deposit & Earn {pool.apy}
                                        </button>

                                        <p className="text-[10px] text-center text-slate-500 font-medium">
                                            By depositing, you agree to the Terms of Service.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        <div className="mt-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            <p className="text-xs text-slate-400 leading-relaxed">
                                <span className="font-bold text-blue-300 block mb-1">Senior Tranche Security</span>
                                Use of funds is monitored on-chain. Senior tranche backers are first to be repaid in the event of default recovery.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
