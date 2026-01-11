"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useSeniorPool } from "@/hooks/useSeniorPool";
import { useERC20 } from "@/hooks/useERC20";
import { useUniqueIdentity } from "@/hooks/useUniqueIdentity";
import { USDC_ADDRESS, SENIOR_POOL_ADDRESS } from "@/lib/contracts/addresses";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import {
    TrendingUp,
    ShieldCheck,
    Zap,
    ArrowUpRight,
    ArrowDownLeft,
    Info,
    Wallet,
    Timer,
    CheckCircle2,
    Loader2,
    Droplets,
    UserCheck
} from "lucide-react";
import { toast } from "sonner";

export default function EarnPage() {
    const { address } = useAccount();
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

    const {
        assets,
        sharePrice,
        fiduBalance,
        withdrawalTokenCount,
        withdrawalRequests,
        currentEpoch,
        deposit,
        requestWithdrawal,
        claimWithdrawal,
        isPending,
        isSuccess,
        writeError,
        refetch
    } = useSeniorPool();

    const {
        balance: usdcBalance,
        allowance: usdcAllowance,
        approve: approveUsdc,
        mint: mintUsdc,
        isPending: isUsdcLoading,
        isSuccess: isUsdcSuccess,
        refetch: refetchUsdc
    } = useERC20(USDC_ADDRESS as `0x${string}`, SENIOR_POOL_ADDRESS as `0x${string}`);

    const {
        isKycVerified,
        verifyKyc,
        isPending: isUidLoading,
        isSuccess: isUidSuccess,
        refetch: refetchUid
    } = useUniqueIdentity();

    const isApproving = isUsdcLoading && !!depositAmount;
    const isMinting = isUsdcLoading && !depositAmount;

    // Refetch data when transactions succeed
    useEffect(() => {
        if (isUsdcSuccess) {
            refetchUsdc();
            refetch(); // Refetch pool data too just in case
        }
    }, [isUsdcSuccess, refetchUsdc, refetch]);

    // Refetch UID when success
    useEffect(() => {
        if (isUidSuccess) {
            refetchUid();
            toast.success("Identity verified successfully!");
        }
    }, [isUidSuccess, refetchUid]);

    const tvl = assets ? Number(formatUnits(assets, 6)) : 0;
    const price = sharePrice ? Number(formatUnits(sharePrice, 18)) : 1;
    const userFidu = fiduBalance ? Number(formatUnits(fiduBalance, 18)) : 0;
    const userUsdcValue = userFidu * price;

    const epochEnd = currentEpoch?.endsAt ? Number(currentEpoch.endsAt) * 1000 : null;
    const timeLeft = epochEnd ? Math.max(0, epochEnd - Date.now()) : 0;
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    const handleApprove = async () => {
        if (!depositAmount) return;
        try {
            approveUsdc(SENIOR_POOL_ADDRESS as `0x${string}`, parseUnits(depositAmount, 6));
            toast.success("Approval transaction sent!");
        } catch (err) {
            toast.error("Approval failed");
        }
    };

    const handleDeposit = async () => {
        if (!depositAmount) return;
        try {
            deposit(depositAmount);
            toast.success("Deposit transaction sent!");
        } catch (err) {
            toast.error("Deposit failed");
        }
    };

    const handleRequestWithdrawal = async () => {
        if (!withdrawAmount) return;
        try {
            requestWithdrawal(withdrawAmount);
            toast.success("Withdrawal request sent!");
        } catch (err) {
            toast.error("Withdrawal request failed");
        }
    };

    const handleClaim = async (tokenId: bigint) => {
        try {
            claimWithdrawal(tokenId);
            toast.success("Claiming funds...");
        } catch (err) {
            toast.error("Claim failed");
        }
    };

    const handleFaucet = async () => {
        try {
            if (!address) {
                toast.error("Please connect your wallet first");
                return;
            }
            mintUsdc(address as `0x${string}`, parseUnits("1000", 6));
            toast.success("Minting 1,000 test USDC...");
        } catch (err) {
            toast.error("Faucet failed");
        }
    };

    const handleJoinProtocol = async () => {
        if (!address) {
            toast.error("Please connect wallet first");
            return;
        }

        try {
            toast.loading("Verifying identity with server...", { id: "kyc-toast" });
            await verifyKyc();
            toast.dismiss("kyc-toast");
            toast.success("Identity verification transaction sent!");
        } catch (err: any) {
            console.error(err);
            toast.dismiss("kyc-toast");
            toast.error(err.message || "Failed to verify identity");
        }
    };

    const needsApproval = usdcAllowance !== undefined && depositAmount && parseUnits(depositAmount, 6) > usdcAllowance;

    return (
        <main className="min-h-screen bg-slate-950 text-white pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 pt-32">
                <header className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                    >
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-[0.2em] text-xs mb-3">
                                <TrendingUp className="w-4 h-4" />
                                Automated Strategy
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">
                                Senior <span className="text-blue-500">Pool</span>
                            </h1>
                            <div className="flex items-center gap-4 mt-4">
                                <p className="text-slate-400 max-w-xl font-medium leading-relaxed">
                                    Diversified exposure across all Lenda lending pools.
                                </p>
                                <button
                                    onClick={handleFaucet}
                                    disabled={isMinting}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600/20 transition-all"
                                >
                                    {isMinting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Droplets className="w-3 h-3" />}
                                    Get Test USDC
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="glass p-6 rounded-3xl border border-white/5 min-w-[200px]">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Value Locked</div>
                                <div className="text-3xl font-black italic">${tvl.toLocaleString()}</div>
                            </div>
                            <div className="glass p-6 rounded-3xl border border-white/5 min-w-[200px] relative overflow-hidden">
                                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Target APY</div>
                                <div className="text-3xl font-black italic text-green-400">8.4%</div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500/20">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="h-full bg-green-500/40"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </header>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Interaction Card */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="card overflow-hidden !p-0">
                            <div className="flex border-b border-white/5">
                                <button
                                    onClick={() => setActiveTab("deposit")}
                                    className={`flex-1 py-6 font-black uppercase tracking-widest text-sm transition-all ${activeTab === 'deposit' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    Deposit USDC
                                </button>
                                <button
                                    onClick={() => setActiveTab("withdraw")}
                                    className={`flex-1 py-6 font-black uppercase tracking-widest text-sm transition-all ${activeTab === 'withdraw' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    Withdraw
                                </button>
                            </div>

                            <div className="p-8">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'deposit' ? (
                                        <motion.div
                                            key="deposit"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Amount to Deposit</label>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        Wallet: {usdcBalance ? formatUnits(usdcBalance, 6) : "0"} USDC
                                                    </span>
                                                </div>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        value={depositAmount}
                                                        onChange={(e) => setDepositAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full bg-slate-900 border-2 border-white/5 rounded-2xl px-6 py-5 text-2xl font-black italic focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-800"
                                                    />
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black italic text-slate-500 group-focus-within:text-blue-500">USDC</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expected FIDU</div>
                                                    <div className="text-lg font-black italic">
                                                        {depositAmount ? (Number(depositAmount) / price).toFixed(2) : "0.00"}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Price</div>
                                                    <div className="text-lg font-black italic">1 FIDU = {price.toFixed(4)} USDC</div>
                                                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Info className="w-3 h-3 text-slate-600" />
                                                    </div>
                                                </div>
                                            </div>

                                            {!isKycVerified ? (
                                                <div className="space-y-4">
                                                    <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-600/20 flex gap-4">
                                                        <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0" />
                                                        <div>
                                                            <div className="text-xs font-black uppercase tracking-widest text-blue-400 mb-1">KYC Required</div>
                                                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                                                To ensure protocol security and regulatory compliance, we require a one-time identity verification.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleJoinProtocol}
                                                        disabled={isUidLoading}
                                                        className="w-full py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-[0.2em] italic hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                                                    >
                                                        {isUidLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                                                        {isUidLoading ? "Verifying..." : "Verify Identity"}
                                                    </button>
                                                </div>
                                            ) : needsApproval ? (
                                                <button
                                                    onClick={handleApprove}
                                                    disabled={isApproving}
                                                    className="w-full py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-[0.2em] italic hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                                                >
                                                    {isApproving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                                    {isApproving ? "Approving USDC..." : "Approve USDC"}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleDeposit}
                                                    disabled={isPending || !depositAmount}
                                                    className="w-full py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-[0.2em] italic hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                                >
                                                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
                                                    {isPending ? "Processing..." : "Supply Liquidity"}
                                                </button>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="withdraw"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Amount to Withdraw (FIDU)</label>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        Balance: {userFidu.toFixed(2)} FIDU
                                                    </span>
                                                </div>
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        value={withdrawAmount}
                                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full bg-slate-900 border-2 border-white/5 rounded-2xl px-6 py-5 text-2xl font-black italic focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-800"
                                                    />
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black italic text-slate-500 group-focus-within:text-blue-500">FIDU</div>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4">
                                                <Timer className="w-6 h-6 text-amber-500 shrink-0" />
                                                <div>
                                                    <div className="text-xs font-black uppercase tracking-widest text-amber-500 mb-1">Epoch Cycle</div>
                                                    <p className="text-[10px] text-amber-500/80 font-medium leading-relaxed">
                                                        Senior Pool withdrawals follow a 2-week cycle. Funds requested now will be claimable in
                                                        <span className="text-amber-400 font-black"> {daysLeft}d {hoursLeft}h</span>.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleRequestWithdrawal}
                                                disabled={isPending || !withdrawAmount}
                                                className="w-full py-5 bg-white/5 border-2 border-white/10 rounded-2xl font-black uppercase tracking-[0.2em] italic hover:bg-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Timer className="w-5 h-5" />}
                                                {isPending ? "Requesting..." : "Request Withdrawal"}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Withdrawal Requests List */}
                        {withdrawalRequests && withdrawalRequests.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Pending Withdrawals</h3>
                                {withdrawalRequests.map((req: any) => (
                                    <div key={req.tokenId.toString()} className="card flex items-center justify-between group hover:border-blue-500/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black italic uppercase tracking-tight">Request #{req.tokenId.toString()}</div>
                                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                                    {formatUnits(req.fiduRequested, 18)} FIDU requested
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Status</div>
                                                <div className="text-sm font-bold text-green-400 uppercase tracking-widest">
                                                    {Number(req.usdcWithdrawable) > 0 ? "Ready to Claim" : "Processing"}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleClaim(req.tokenId)}
                                                disabled={Number(req.usdcWithdrawable) === 0 || isPending}
                                                className="px-6 py-3 bg-blue-600 rounded-xl font-black uppercase tracking-widest text-[10px] italic hover:bg-blue-500 transition-all disabled:opacity-20 shadow-lg shadow-blue-600/20"
                                            >
                                                Claim {formatUnits(req.usdcWithdrawable, 6)} USDC
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stats & Portfolio */}
                    <div className="space-y-8">
                        <div className="card space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Wallet className="w-5 h-5 text-blue-500" />
                                <h2 className="text-lg font-black italic uppercase tracking-tight">Your Portfolio</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Portfolio Balance</div>
                                    <div className="text-3xl font-black italic">${userUsdcValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                    <div className="text-xs text-slate-500 font-bold mt-1 uppercase leading-none">{userFidu.toFixed(2)} FIDU</div>

                                    <div className="mt-4 flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isKycVerified ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {isKycVerified ? 'System Verified' : 'Verification Offline'}
                                        </div>
                                    </div>

                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <TrendingUp className="w-24 h-24" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Lifetime Yield</div>
                                        <div className="text-green-400 font-black italic text-lg">+$0.00</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Leverage Ratio</div>
                                        <div className="text-blue-400 font-black italic text-lg">4.0x</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-5 h-5 text-yellow-500" />
                                <h2 className="text-lg font-black italic uppercase tracking-tight">How it works</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                        Supply USDC to the Senior Pool to receive FIDU tokens.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                        Capital is automatically allocated to borrower pools via leverage.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                        Earn interest as borrowers repay their loans.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
