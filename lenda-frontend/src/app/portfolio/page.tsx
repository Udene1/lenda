"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useLendaRewards } from "@/hooks/useLendaRewards";
import {
    Wallet,
    Coins,
    ArrowUpRight,
    PieChart,
    History,
    TrendingUp,
    Download,
    AlertCircle
} from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import Link from "next/link";

export default function PortfolioPage() {
    const { address } = useAccount();
    const { tokenBalance, totalClaimed, claimRewards, isPending } = useLendaRewards();

    if (!address) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="mesh-gradient opacity-30" />
                <div className="pt-40 flex flex-col items-center justify-center px-6">
                    <div className="card max-w-md w-full text-center">
                        <Wallet className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold mb-4 italic uppercase">Connect Wallet</h1>
                        <p className="text-slate-400 mb-8">Connect your wallet to view your investment portfolio and claim rewards.</p>
                        <div className="flex justify-center">
                            <ConnectKitButton />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-20">
            <Navbar />
            <div className="mesh-gradient opacity-30" />

            <div className="pt-32 px-6 max-w-7xl mx-auto relative z-10">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold italic uppercase tracking-tight">
                        Lender <span className="text-blue-500 text-3xl font-light tracking-widest lowercase">.portfolio</span>
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Track your active positions and managing your protocol rewards.</p>
                </div>

                {/* Portfolio Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card bg-gradient-to-br from-blue-900/40 to-slate-900/60 border-blue-500/20"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-600/20 p-2 rounded-lg">
                                <PieChart className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-xs font-black text-blue-300 uppercase tracking-widest">Net Asset Value</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">$0.00</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                            <TrendingUp className="w-3 h-3" /> --% this month
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="card"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-purple-600/20 p-2 rounded-lg">
                                <Coins className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-xs font-black text-purple-300 uppercase tracking-widest">Lenda Token Balance</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{tokenBalance.toLocaleString()} <span className="text-sm font-normal text-slate-400">LENDA</span></div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                            Verified Holder
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="card"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-600/20 p-2 rounded-lg">
                                    <Download className="w-5 h-5 text-emerald-400" />
                                </div>
                                <span className="text-xs font-black text-emerald-300 uppercase tracking-widest">Unclaimed Rewards</span>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-4">0 <span className="text-sm font-normal text-slate-400">LENDA</span></div>
                        <button
                            disabled={true} // Disabled for MVP as no merkle proof backend
                            className="w-full py-2 rounded-xl bg-emerald-600/20 text-emerald-500 text-xs font-bold uppercase tracking-widest border border-emerald-500/20 cursor-not-allowed opacity-60"
                        >
                            No Rewards Available
                        </button>
                        <div className="mt-2 text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">
                            Total Claimed: {totalClaimed.toLocaleString()} LENDA
                        </div>
                    </motion.div>
                </div>

                {/* Active Investments Mock Table */}
                <div className="card">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold uppercase italic">Active Positions</h2>
                        <button className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1 hover:text-blue-300">
                            <History className="w-4 h-4" /> View History
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 text-xs font-black text-slate-500 uppercase tracking-widest">
                                    <th className="pb-4 pl-4">Pool Name</th>
                                    <th className="pb-4">Invested</th>
                                    <th className="pb-4">Est. APY</th>
                                    <th className="pb-4">Maturity</th>
                                    <th className="pb-4 pr-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium">
                                {/* Empty State */}
                            </tbody>
                        </table>
                        <div className="py-12 text-center border-b border-white/5">
                            <p className="text-slate-500 text-sm font-medium">No active investments found.</p>
                            <Link href="/pools" className="inline-block mt-4 text-xs font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300">
                                Browse Pools to Invest
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-blue-400/80">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="text-xs leading-relaxed font-medium">
                        <span className="font-bold uppercase tracking-widest block mb-1">Risk Warning</span>
                        Digital asset investments are subject to market risk. Past performance is not indicative of future results. Please conduct your own due diligence before investing in any lending pool.
                    </div>
                </div>
            </div>
        </main>
    );
}
