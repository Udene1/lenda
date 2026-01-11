"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import {
    ShieldCheck,
    TrendingUp,
    Clock,
    ArrowUpRight,
    Users,
    Search,
    Filter,
    BarChart2
} from "lucide-react";
import { usePools } from "@/hooks/usePools";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function PoolsPage() {
    const { pools, isLoading } = usePools();

    if (isLoading) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="mesh-gradient opacity-30" />
                <div className="pt-40 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <h2 className="text-xl font-bold italic uppercase">Loading Opportunities...</h2>
                </div>
            </main>
        );
    }
    return (
        <main className="min-h-screen pb-20">
            <Navbar />
            <div className="mesh-gradient opacity-30" />

            <div className="pt-32 px-6 max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold italic uppercase tracking-tighter">
                            Lending <span className="text-blue-500 text-3xl font-light tracking-widest lowercase">.opportunities</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Browse institutional-grade lending pools verified by the Lenda Protocol.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="glass flex items-center px-4 py-2 rounded-xl border border-white/10">
                            <Search className="w-4 h-4 text-slate-500 mr-2" />
                            <input
                                type="text"
                                placeholder="Search pools..."
                                className="bg-transparent border-none text-sm focus:outline-none w-48 text-white font-medium"
                            />
                        </div>
                        <button className="glass p-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-slate-400">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex items-center gap-6 mb-10 overflow-x-auto pb-2 scrollbar-hide">
                    {["All Pools", "Institutional", "Retail Focused", "Emerging Markets", "Filled"].map((cat, i) => (
                        <button
                            key={cat}
                            className={`text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${i === 0 ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Pools Grid */}
                <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {pools.length > 0 ? (
                        pools.map((pool, i) => (
                            <motion.div
                                key={pool.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="card group hover:scale-[1.01] transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${pool.status === 'Active' ? 'bg-emerald-500 animate-pulse' : pool.status === 'Filled' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{pool.status}</span>
                                    </div>
                                    {pool.verified && (
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-1 bg-emerald-500/5 px-2 py-1 rounded-md border border-emerald-500/10">
                                            <ShieldCheck className="w-3 h-3" /> Lenda Verified
                                        </div>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors">{pool.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">
                                    <Users className="w-3.5 h-3.5" /> {pool.borrower}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> Est. APY
                                        </div>
                                        <div className="text-xl font-bold text-emerald-400">{pool.apy}</div>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Term
                                        </div>
                                        <div className="text-xl font-bold text-white">{pool.term}</div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-8">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-slate-500">Progress</span>
                                        <span className="text-white">{pool.filled} / {pool.capacity}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pool.progress}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                                        />
                                    </div>
                                </div>

                                <Link
                                    href={`/pools/${pool.id}`}
                                    className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold uppercase text-xs tracking-[0.2em] transition-all transform active:scale-95 ${pool.status === 'Active'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                                        }`}
                                >
                                    {pool.status === 'Active' ? 'Supply Liquidity' : pool.status === 'Filled' ? 'Pool Filled' : 'View Details'}
                                    {pool.status === 'Active' && <ArrowUpRight className="w-4 h-4" />}
                                </Link>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center glass rounded-3xl border border-white/5">
                            <h3 className="text-xl font-bold text-white mb-2 italic uppercase">No Pools Available</h3>
                            <p className="text-slate-500 text-sm font-medium">There are currently no active lending pools. Please check back later.</p>
                        </div>
                    )}
                </div>

                {/* Global Stats Banner */}
                <div className="mt-20 p-8 rounded-3xl glass border border-blue-500/10 flex flex-col md:flex-row items-center justify-around gap-8 text-center bg-blue-600/[0.02]">
                    <div>
                        <div className="text-3xl font-black text-white mb-1">12.4%</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Avg Target Yield</div>
                    </div>
                    <div className="hidden md:block w-px h-12 bg-white/5" />
                    <div>
                        <div className="text-3xl font-black text-white mb-1">$42.8M</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Value Locked</div>
                    </div>
                    <div className="hidden md:block w-px h-12 bg-white/5" />
                    <div>
                        <div className="text-3xl font-black text-white mb-1">0%</div>
                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Default Rate</div>
                    </div>
                </div>
            </div>
        </main>
    );
}
