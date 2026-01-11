"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useLendaRewards } from "@/hooks/useLendaRewards";
import { useSeniorPool } from "@/hooks/useSeniorPool";
import {
    Wallet,
    Coins,
    ArrowUpRight,
    PieChart,
    History,
    TrendingUp,
    Download,
    AlertCircle,
    SquareChartGantt
} from "lucide-react";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import Link from "next/link";

export default function PortfolioPage() {
    const { address } = useAccount();
    const { tokenBalance, totalClaimed } = useLendaRewards();
    const { fiduBalance, sharePrice, assets } = useSeniorPool();

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

    // Calculations
    const userFidu = fiduBalance ? Number(formatUnits(fiduBalance, 18)) : 0;
    const price = sharePrice ? Number(formatUnits(sharePrice, 18)) : 1;
    const seniorPoolValue = userFidu * price;

    // Total NAV (Senior Pool + Lenda Token Value if we had a price for it)
    const totalNav = seniorPoolValue;

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
                        <div className="text-3xl font-bold text-white mb-1">${totalNav.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                            <TrendingUp className="w-3 h-3 text-green-400" /> +0.00% this month
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
                            Verified Protocol Holder
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
                            disabled={true}
                            className="w-full py-2 rounded-xl bg-emerald-600/20 text-emerald-500 text-xs font-bold uppercase tracking-widest border border-emerald-500/20 cursor-not-allowed opacity-60"
                        >
                            No Rewards Available
                        </button>
                        <div className="mt-2 text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">
                            Total Claimed: {totalClaimed.toLocaleString()} LENDA
                        </div>
                    </motion.div>
                </div>

                {/* Active Investments Table */}
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
                                    <th className="pb-4">Balance / Value</th>
                                    <th className="pb-4">Est. APY</th>
                                    <th className="pb-4">Status</th>
                                    <th className="pb-4 pr-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-medium">
                                {userFidu > 0 && (
                                    <tr className="border-b border-white/5 group hover:bg-white/[0.02] transition-all">
                                        <td className="py-6 pl-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <div>
                                                    <div className="font-black italic uppercase tracking-tight">Senior Pool</div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Automated Diversified Pool</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6">
                                            <div className="font-black italic text-lg">${seniorPoolValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{userFidu.toFixed(2)} FIDU</div>
                                        </td>
                                        <td className="py-6">
                                            <div className="text-green-400 font-black italic text-lg">8.4%</div>
                                        </td>
                                        <td className="py-6">
                                            <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                                                Active
                                            </span>
                                        </td>
                                        <td className="py-6 pr-4 text-right">
                                            <Link
                                                href="/earn"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest italic hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                                            >
                                                Manage <ArrowUpRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                )}

                                {userFidu === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-4">
                                                <SquareChartGantt className="w-12 h-12 opacity-20" />
                                                <p className="text-sm font-medium">No active investments found.</p>
                                                <Link href="/earn" className="text-xs font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300">
                                                    Visit Earn to Start Investing
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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

