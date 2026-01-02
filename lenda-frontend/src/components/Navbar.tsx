"use client";

import Link from "next/link";
import { ConnectKitButton } from "connectkit";
import { LayoutDashboard, Waves, UserCircle, Briefcase, Zap, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useUniqueIdentity } from "@/hooks/useUniqueIdentity";
import { useAccount } from "wagmi";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Pools", href: "/pools", icon: Waves },
    { name: "Borrowers", href: "/borrowers", icon: UserCircle },
    { name: "Portfolio", href: "/portfolio", icon: Briefcase },
];

export function Navbar() {
    const pathname = usePathname();
    const { isConnected } = useAccount();
    const { isKycVerified } = useUniqueIdentity();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4">
            <div className="glass max-w-7xl w-full flex items-center justify-between px-6 py-3 rounded-2xl border border-white/10 shadow-2xl shadow-blue-500/10">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                        <Zap className="w-5 h-5 text-white fill-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white uppercase italic">
                        Lenda<span className="text-blue-500">.</span>
                    </span>
                </Link>

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

                <div className="flex items-center gap-3">
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
                    <ConnectKitButton />
                </div>
            </div>
        </nav>
    );
}
