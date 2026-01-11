"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Globe, BarChart3, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useSeniorPool } from "@/hooks/useSeniorPool";
import { formatUnits } from "viem";

export default function LandingPage() {
  const { assets } = useSeniorPool();

  const tvl = assets ? `$${Number(formatUnits(assets, 6)).toLocaleString()}` : "$0";

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Navbar />
      <div className="mesh-gradient opacity-50" />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Live on Base Sepolia
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight mb-6">
            Institutional-Grade <br />
            <span className="gradient-text tracking-normal">DeFi Lending</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Borrow against real-world credit with unprecedented transparency.
            Lenda empowers institutional borrowers and retail lenders on the world&apos;s most scalable L2.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/pools" className="btn-primary flex items-center gap-2 text-lg px-8 py-3">
              Browse Pools <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/borrowers" className="px-8 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-lg font-medium">
              For Borrowers
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-24 w-full">
          {[
            { label: "Total Value Locked", value: tvl, icon: ShieldCheck },
            { label: "Active Loans", value: "0", icon: Zap },
            { label: "Protocol APR", value: "8.4%", icon: TrendingUp },
            { label: "Total Borrowers", value: "0", icon: Users },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="card group hover:scale-[1.02]"
            >
              <stat.icon className="w-6 h-6 text-blue-500 mb-3" />
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 italic uppercase">Built for the <span className="text-blue-500">Professional</span></h2>
          <p className="text-slate-400 max-w-xl mx-auto italic uppercase tracking-wider text-sm">Engineered with safety and transparency at the core.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Transparent Credit",
              description: "Borrowers can optionally upload financial documents publicly. Trust, but verify.",
              icon: Globe
            },
            {
              title: "Base Native",
              description: "Leveraging the security of Ethereum with the speed and cost-efficiency of Base.",
              icon: Zap
            },
            {
              title: "Governance Driven",
              description: "Lenda holders control protocol parameters and treasury allocation.",
              icon: BarChart3
            }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center mb-6 group-hover:bg-blue-600/20 transition-all">
                <feature.icon className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed font-medium">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer-like simple banner */}
      <section className="py-20 px-6 text-center border-t border-white/5">
        <div className="italic uppercase text-slate-500 text-xs tracking-[0.3em]">
          Designed for the future of finance
        </div>
      </section>
    </main>
  );
}
