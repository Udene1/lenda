import { useState } from "react";
import Link from "next/link";
import { ConnectKitButton } from "connectkit";
import {
    LayoutDashboard,
    Waves,
    UserCircle,
    Briefcase,
    Zap,
    ShieldCheck,
    TrendingUp,
    Menu,
    X
} from "lucide-react";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useUniqueIdentity } from "@/hooks/useUniqueIdentity";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Earn", href: "/earn", icon: TrendingUp },
    { name: "Pools", href: "/pools", icon: Waves },
    { name: "Borrowers", href: "/borrowers", icon: UserCircle },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
];

export function Navbar() {
    const pathname = usePathname();
    const { isConnected } = useAccount();
    const { isKycVerified } = useUniqueIdentity();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4">
            <div className="glass max-w-7xl w-full flex items-center justify-between px-4 md:px-6 py-3 rounded-2xl border border-white/10 shadow-2xl shadow-blue-500/10">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                        <Zap className="w-4 h-4 md:w-5 md:h-5 text-white fill-white" />
                    </div>
                    <span className="text-lg md:text-xl font-bold tracking-tight text-white uppercase italic">
                        Lenda<span className="text-blue-500">.</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 group relative",
                                    isActive
                                        ? "text-blue-400 bg-blue-500/10"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "group-hover:text-blue-400")} />
                                <span className="font-medium text-sm transition-colors">{item.name}</span>
                                {isActive && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full blur-[1px]" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    {isConnected && (
                        <div className={cn(
                            "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                            isKycVerified
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        )}>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {isKycVerified ? "Verified" : "KYC Required"}
                        </div>
                    )}

                    <div className="scale-90 md:scale-100">
                        <ConnectKitButton />
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 md:hidden text-white hover:text-blue-400 transition-colors"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 z-40 mobile-backdrop md:hidden"
                        />

                        {/* Menu Panel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="fixed left-4 right-4 top-24 z-50 md:hidden"
                        >
                            <div className="glass-morphism rounded-3xl border border-white/10 p-4 w-full shadow-2xl shadow-black/40">
                                <div className="flex flex-col gap-1">
                                    {navItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                onClick={() => setIsMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-200 group",
                                                    isActive
                                                        ? "text-blue-400 bg-blue-500/15 border border-blue-500/20"
                                                        : "text-slate-300 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "group-hover:text-blue-400")} />
                                                <span className="font-bold text-base tracking-wide">{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {isConnected && !isKycVerified && (
                                    <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                                        <ShieldCheck className="w-5 h-5 text-amber-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">KYC Verification Required</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
}
