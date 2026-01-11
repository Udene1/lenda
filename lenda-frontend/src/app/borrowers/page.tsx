"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useBorrowerProfile } from "@/hooks/useBorrowerProfile";
import { useUniqueIdentity } from "@/hooks/useUniqueIdentity";
import { useLendaFactory } from "@/hooks/useLendaFactory";
import { usePools } from "@/hooks/usePools";
import { TransactionToast, ToastType } from "@/components/TransactionToast";
import {
    PlusCircle,
    FileUp,
    UserCircle,
    CheckCircle2,
    Loader2,
    ExternalLink,
    Info,
    Building2,
    Mail,
    Globe,
    ShieldCheck,
    Fingerprint,
    Zap,
    TrendingUp,
    ArrowUpRight,
    Tag
} from "lucide-react";
import { decodeEventLog } from "viem";
import { LendaFactoryABI } from "@/lib/contracts/abis";
import { ConnectKitButton } from "connectkit";

const DOC_TYPES = [
    "Income Statement",
    "Bank Statement",
    "Business Registration",
    "Credit Report",
    "Collateral Proof",
    "Other"
];

export default function BorrowersPage() {
    const [activeTab, setActiveTab] = useState<"overview" | "facilities" | "financials">("overview");
    const { pools, isLoading: isPoolsLoading } = usePools();
    const myPools = pools.filter(p => p.borrowerAddress.toLowerCase() === address?.toLowerCase());

    const {
        address,
        hasProfile,
        profile,
        documents,
        createProfile,
        uploadDocument,
        isPending: isProfilePending,
        isSuccess: isProfileSuccess,
        writeError: profileError,
        refetch: refetchProfile
    } = useBorrowerProfile();

    const {
        isKycVerified,
        verifyKyc,
        isPending: isKycPending,
        isSuccess: isKycSuccess,
        writeError: kycError,
        refetch: refetchKyc
    } = useUniqueIdentity();

    const {
        isBorrower,
        proposePool,
        isPending: isPoolPending,
        isSuccess: isPoolSuccess,
        writeError: poolError,
        receipt: poolReceipt,
        setPoolName
    } = useLendaFactory();

    const isPending = isProfilePending || isKycPending || isPoolPending;
    const isSuccess = isProfileSuccess || isKycSuccess || isPoolSuccess;
    const writeError = profileError || kycError || poolError;
    const refetch = () => { refetchProfile(); refetchKyc(); };

    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [web, setWeb] = useState("");
    const [email, setEmail] = useState("");

    const [ipfsCid, setIpfsCid] = useState("");
    const [docType, setDocType] = useState(0);
    const [docDesc, setDocDesc] = useState("");

    // Pool Creation State
    const [poolLimit, setPoolLimit] = useState("");
    const [poolApr, setPoolApr] = useState("");
    const [poolJuniorFee, setPoolJuniorFee] = useState("20");
    const [facilityName, setFacilityName] = useState("");
    const [newPoolAddress, setNewPoolAddress] = useState<string | null>(null);
    const [isNamingStarted, setIsNamingStarted] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ visible: boolean; type: ToastType; title: string; message?: string }>({
        visible: false,
        type: "success",
        title: "",
    });

    // Handle Success/Error Side Effects
    useEffect(() => {
        if (isSuccess) {
            setToast({
                visible: true,
                type: "success",
                title: "Transaction Successful",
                message: "Your changes have been saved to the blockchain."
            });
            // Clear forms
            if (!hasProfile) {
                // Profile creation success - refetch to show dashboard
                refetch();
            } else {
                // Doc upload success
                setIpfsCid("");
                setDocDesc("");
                setDocType(0);
                refetch();
            }
        }
    }, [isSuccess, hasProfile, refetch]);

    useEffect(() => {
        if (writeError) {
            setToast({
                visible: true,
                type: "error",
                title: "Transaction Failed",
                message: writeError.message.split("\n")[0] // detailed error usually first line
            });
        }
    }, [writeError]);

    useEffect(() => {
        if (isPending) {
            setToast({
                visible: true,
                type: "loading",
                title: "Transaction Processing",
                message: "Please wait for confirmation..."
            });
        }
    }, [isPending]);

    // Detect new pool address from receipt and trigger naming
    useEffect(() => {
        if (poolReceipt && facilityName && !newPoolAddress) {
            try {
                // Find PoolCreated event
                for (const log of poolReceipt.logs) {
                    try {
                        const decodedLog = decodeEventLog({
                            abi: LendaFactoryABI,
                            data: log.data,
                            topics: log.topics,
                        });

                        if (decodedLog.eventName === 'PoolCreated') {
                            const poolAddr = (decodedLog.args as any).pool;
                            setNewPoolAddress(poolAddr);
                            console.log("Detected new pool:", poolAddr);
                            break;
                        }
                    } catch (e) {
                        // Not the event we are looking for
                    }
                }
            } catch (err) {
                console.error("Error parsing logs:", err);
            }
        }
    }, [poolReceipt, facilityName, newPoolAddress]);

    // Handle automatic naming step
    useEffect(() => {
        if (newPoolAddress && facilityName && !isNamingStarted) {
            setIsNamingStarted(true);
            setToast({
                visible: true,
                type: "loading",
                title: "Registering Facility Name",
                message: `Finalizing ${facilityName} on the protocol registry...`
            });
            setPoolName(newPoolAddress, facilityName);
        }
    }, [newPoolAddress, facilityName, isNamingStarted, setPoolName]);


    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        createProfile(name, desc, web, email);
    };

    const handleUploadDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        uploadDocument(ipfsCid, docType, docDesc);
    };

    const handleProposePool = async (e: React.FormEvent) => {
        e.preventDefault();
        proposePool(poolLimit, poolApr, poolJuniorFee, facilityName);
    };

    if (!address) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="mesh-gradient opacity-30" />
                <div className="pt-40 flex flex-col items-center justify-center px-6">
                    <div className="card max-w-md w-full text-center">
                        <UserCircle className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold mb-4 italic uppercase">Connect Wallet</h1>
                        <p className="text-slate-400 mb-8">Please connect your wallet to access the borrower dashboard and manage your credit profile.</p>
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

            <TransactionToast
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
                type={toast.type}
                title={toast.title}
                message={toast.message}
            />

            <div className="pt-32 px-6 max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-3">
                            <Building2 className="w-3 h-3" />
                            Institutional Portal
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                            Borrower <span className="text-blue-500">Dashboard</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium max-w-xl">
                            Manage your institutional profile, monitor credit facilities, and handle financial disclosures.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl w-full lg:w-auto">
                        <button
                            onClick={() => setActiveTab("overview")}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab("facilities")}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'facilities' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Facilities
                        </button>
                        <button
                            onClick={() => setActiveTab("financials")}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'financials' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            Financials
                        </button>
                    </div>
                </div>

                {!isKycVerified ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card border-amber-500/20 bg-amber-500/5"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <Fingerprint className="w-8 h-8 text-amber-500" />
                            <div>
                                <h2 className="text-xl font-bold uppercase italic text-amber-500">Verification Required</h2>
                                <p className="text-slate-400 text-sm font-medium">To maintain institutional standards, you must verified your identity before creating a profile.</p>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 mb-8 font-medium text-slate-300 leading-relaxed">
                            <p className="mb-4">Verification on Lenda follows institutional KYC/KYB standards to ensure protocol security and compliance.</p>
                            <p className="text-sm text-slate-400 italic">Note: Verification allows you to access institutional borrowing features and launch lending pools.</p>
                        </div>

                        <button
                            onClick={() => verifyKyc()}
                            disabled={isPending}
                            className="w-full btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500/20 py-4 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isKycPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                            {isKycPending ? "Processing..." : "Complete Verification"}
                        </button>
                    </motion.div>
                ) : !hasProfile ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card border-blue-500/20"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <PlusCircle className="w-6 h-6 text-blue-500" />
                            <h2 className="text-xl font-bold uppercase italic text-blue-500">Create Business Profile</h2>
                        </div>

                        <form onSubmit={handleCreateProfile} className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Business Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    placeholder="e.g. Acme Credit Group"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Contact Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    placeholder="admin@acme.com"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Website URL</label>
                                <input
                                    type="url"
                                    value={web}
                                    onChange={(e) => setWeb(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    placeholder="https://acme.com"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
                                <textarea
                                    value={desc}
                                    onChange={(e) => setDesc(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-medium min-h-[100px]"
                                    placeholder="About your business and lending needs..."
                                    required
                                />
                            </div>
                            <div className="md:col-span-2 pt-4">
                                <button
                                    disabled={isPending}
                                    className="btn-primary w-full py-4 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                                    {isPending ? "Creating Profile..." : "Create Official Profile"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                ) : (
                    <div className="space-y-8">
                        <AnimatePresence mode="wait">
                            {activeTab === 'overview' && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-8"
                                >
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="card !p-6 border-blue-500/10 bg-blue-500/5 relative overflow-hidden group">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Facilities</div>
                                            <div className="text-3xl font-black italic">{myPools.length}</div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Zap className="w-16 h-16" />
                                            </div>
                                        </div>
                                        <div className="card !p-6 border-emerald-500/10 bg-emerald-500/5 relative overflow-hidden group">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Limit</div>
                                            <div className="text-3xl font-black italic">
                                                ${myPools.reduce((acc, p) => acc + Number(p.capacity.replace(/[^0-9.]/g, '')), 0).toLocaleString()}
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <TrendingUp className="w-16 h-16" />
                                            </div>
                                        </div>
                                        <div className="card !p-6 border-amber-500/10 bg-amber-500/5 relative overflow-hidden group">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Avg. APR</div>
                                            <div className="text-3xl font-black italic">
                                                {myPools.length > 0
                                                    ? (myPools.reduce((acc, p) => acc + Number(p.apy.replace(/[^0-9.]/g, '')), 0) / myPools.length).toFixed(2)
                                                    : "0.00"}%
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <ArrowUpRight className="w-16 h-16" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-8">
                                            <div className="card !p-8">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center">
                                                        <Building2 className="w-7 h-7 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h2 className="text-2xl font-black italic uppercase tracking-tight">{profile?.name}</h2>
                                                            {profile?.isVerified && (
                                                                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-400 uppercase tracking-widest">Verified</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 truncate max-w-xs">{address}</p>
                                                    </div>
                                                </div>

                                                <div className="prose prose-invert max-w-none mb-8">
                                                    <p className="text-slate-400 font-medium leading-relaxed">{profile?.description}</p>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4 py-6 border-t border-white/5">
                                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
                                                        <Mail className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                                        <span className="text-sm font-bold text-slate-300">{profile?.contactEmail}</span>
                                                    </div>
                                                    <a href={profile?.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
                                                        <Globe className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                                        <span className="text-sm font-bold text-blue-400">{profile?.website?.replace("https://", "")}</span>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="card !p-6 bg-blue-600/5 border-blue-500/10">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center">
                                                        <Zap className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                    <h3 className="text-sm font-black uppercase tracking-widest italic">Quick Actions</h3>
                                                </div>
                                                <div className="space-y-3">
                                                    <button
                                                        onClick={() => setActiveTab("facilities")}
                                                        className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest italic transition-all shadow-lg shadow-blue-600/10 flex items-center justify-between group"
                                                    >
                                                        Propose New Facility
                                                        <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab("financials")}
                                                        className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest italic transition-all flex items-center justify-between group"
                                                    >
                                                        Upload Disclosures
                                                        <FileUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="card !p-6 border-white/5">
                                                <div className="flex items-center gap-2 text-blue-400 mb-2">
                                                    <Info className="w-4 h-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Protocol Tip</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                                    Keeping your Business Registration and Income Statements updated increases investor confidence in your lending pools.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'facilities' && (
                                <motion.div
                                    key="facilities"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-12"
                                >
                                    {/* Active Facilities List */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Active Credit Facilities ({myPools.length})</h3>
                                            <div className="h-px flex-1 bg-white/5 mx-6" />
                                        </div>

                                        <div className="grid gap-4">
                                            {isPoolsLoading ? (
                                                <div className="card text-center py-20 border-dashed">
                                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing with Protocol...</p>
                                                </div>
                                            ) : myPools.length > 0 ? (
                                                myPools.map((pool, i) => (
                                                    <div key={pool.id} className="card !p-6 flex flex-col md:flex-row items-center justify-between group hover:border-blue-500/30 transition-all">
                                                        <div className="flex items-center gap-6 w-full md:w-auto mb-4 md:mb-0">
                                                            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                <Zap className="w-6 h-6 text-blue-500" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black italic uppercase tracking-tight mb-1">{pool.name}</div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Limit: {pool.capacity}</div>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                                                    <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{pool.apy} APR</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                                            <div className="text-center md:text-right">
                                                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Status</div>
                                                                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 justify-center md:justify-end">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={`https://sepolia.basescan.org/address/${pool.id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center hover:bg-blue-600/10 hover:border-blue-500/30 transition-all group/link"
                                                            >
                                                                <ExternalLink className="w-4 h-4 text-slate-500 group-hover/link:text-blue-500" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="card text-center py-20 border-dashed border-white/5 bg-white/[0.01]">
                                                    <Info className="w-8 h-8 text-slate-700 mx-auto mb-4" />
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No active facilities found</p>
                                                    <p className="text-[10px] text-slate-600 mt-2 uppercase">Propose a new lending pool below to get started.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Proposal Form */}
                                    <div className="card !p-10 border-blue-500/10 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <PlusCircle className="w-32 h-32 text-blue-500" />
                                        </div>

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-4 mb-10">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center">
                                                    <PlusCircle className="w-6 h-6 text-blue-500" />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-black italic uppercase tracking-tight">Propose New Facility</h2>
                                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Submit a new credit line proposal to the protocol.</p>
                                                </div>
                                            </div>

                                            {!isBorrower ? (
                                                <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10 text-center">
                                                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-4 opacity-50" />
                                                    <h3 className="text-lg font-black italic text-amber-500 uppercase tracking-widest mb-2">Whitelist Required</h3>
                                                    <p className="text-slate-400 max-w-md mx-auto mb-8 font-medium leading-relaxed">
                                                        Your address must be whitelisted by protocol governance to propose new pools.
                                                        Request access to the <code className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">BORROWER_ROLE</code> to continue.
                                                    </p>
                                                    <a
                                                        href="https://sepolia.basescan.org/address/0x6AEb4aB1CD812939429e6FBa538332DCCb331f36"
                                                        target="_blank"
                                                        className="px-8 py-4 bg-amber-500 hover:bg-amber-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black transition-all flex items-center justify-center gap-2 w-fit mx-auto"
                                                    >
                                                        Governance Registry <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleProposePool} className="space-y-10">
                                                    <div className="grid md:grid-cols-2 gap-8">
                                                        <div className="md:col-span-2 space-y-3">
                                                            <div className="flex justify-between items-end px-1">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Facility Label</label>
                                                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em]">Required</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={facilityName}
                                                                onChange={(e) => setFacilityName(e.target.value)}
                                                                className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-bold text-lg placeholder:text-slate-800 shadow-inner"
                                                                placeholder="e.g. Q1 Working Capital - Emerging Markets"
                                                                required
                                                            />
                                                        </div>

                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Limit (USDC)</label>
                                                            <div className="relative group">
                                                                <input
                                                                    type="number"
                                                                    value={poolLimit}
                                                                    onChange={(e) => setPoolLimit(e.target.value)}
                                                                    className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-bold text-xl placeholder:text-slate-800"
                                                                    placeholder="50,000"
                                                                    required
                                                                />
                                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 tracking-widest group-focus-within:text-blue-500 transition-colors">USDC</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target APR (%)</label>
                                                            <div className="relative group">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    value={poolApr}
                                                                    onChange={(e) => setPoolApr(e.target.value)}
                                                                    className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-bold text-xl placeholder:text-slate-800"
                                                                    placeholder="12.5"
                                                                    required
                                                                />
                                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 tracking-widest group-focus-within:text-blue-500 transition-colors">%</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Junior Fee (%)</label>
                                                            <select
                                                                value={poolJuniorFee}
                                                                onChange={(e) => setPoolJuniorFee(e.target.value)}
                                                                className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all font-bold text-lg text-slate-200"
                                                            >
                                                                <option value="10">10% (Competitive)</option>
                                                                <option value="20">20% (Standard)</option>
                                                                <option value="25">25% (High Recovery)</option>
                                                            </select>
                                                        </div>

                                                        <div className="flex items-center justify-center p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10 text-center relative overflow-hidden group">
                                                            <div className="relative z-10">
                                                                <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Estimated Interest</div>
                                                                <div className="text-3xl font-black italic text-white">
                                                                    ${poolLimit && poolApr ? ((Number(poolLimit) * (Number(poolApr) / 100)) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
                                                                    <span className="text-xs text-slate-500 not-italic ml-1">/mo</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                                                <Zap className="w-12 h-12" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Standard 12-Month Maturity</h4>
                                                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-tight">
                                                                All facilities default to a 12-month fixed term with bullet principal repayment.
                                                                You can adjust repayment schedules after governance review.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        disabled={isPending}
                                                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-black uppercase tracking-[0.2em] italic transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale group"
                                                    >
                                                        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                                        {isPending ? "Executing Transaction..." : "Submit Proposal"}
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'financials' && (
                                <motion.div
                                    key="financials"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-12"
                                >
                                    <div className="grid lg:grid-cols-3 gap-8">
                                        {/* Upload Section */}
                                        <div className="lg:col-span-1 space-y-6">
                                            <div className="card !p-8 border-blue-500/10">
                                                <div className="flex items-center gap-3 mb-8">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                                                        <FileUp className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <h2 className="text-lg font-black italic uppercase tracking-tight">Upload Financials</h2>
                                                </div>

                                                <form onSubmit={handleUploadDoc} className="space-y-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Document Type</label>
                                                        <select
                                                            value={docType}
                                                            onChange={(e) => setDocType(Number(e.target.value))}
                                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl px-5 py-3 focus:outline-none focus:border-blue-500 transition-all font-bold text-sm text-slate-200"
                                                        >
                                                            {DOC_TYPES.map((type, i) => (
                                                                <option key={type} value={i}>{type}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">IPFS CID</label>
                                                        <input
                                                            type="text"
                                                            value={ipfsCid}
                                                            onChange={(e) => setIpfsCid(e.target.value)}
                                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl px-5 py-3 focus:outline-none focus:border-blue-500 transition-all font-bold text-xs truncate placeholder:text-slate-800"
                                                            placeholder="QmXyZ..."
                                                            required
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Brief Description</label>
                                                        <input
                                                            type="text"
                                                            value={docDesc}
                                                            onChange={(e) => setDocDesc(e.target.value)}
                                                            className="w-full bg-slate-950 border-2 border-white/5 rounded-2xl px-5 py-3 focus:outline-none focus:border-blue-500 transition-all font-bold text-sm placeholder:text-slate-800"
                                                            placeholder="e.g. Q4 2024 Audit"
                                                            required
                                                        />
                                                    </div>

                                                    <button
                                                        disabled={isPending}
                                                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest italic transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                        {isPending ? "Syncing..." : "Submit Disclosure"}
                                                    </button>
                                                </form>
                                            </div>

                                            <div className="card !p-6 bg-white/[0.01] border-white/5">
                                                <div className="flex items-center gap-2 text-slate-400 mb-2">
                                                    <Info className="w-4 h-4" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Visibility Info</span>
                                                </div>
                                                <p className="text-[9px] text-slate-500 font-medium leading-relaxed uppercase tracking-tight">
                                                    Documents are stored on IPFS and indexed on the Base Sepolia blockchain.
                                                    Lenders will use these to assess your credit risk.
                                                </p>
                                            </div>
                                        </div>

                                        {/* List Section */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="flex items-center justify-between px-2">
                                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Public Disclosures ({documents?.length || 0})</h3>
                                                <div className="h-px flex-1 bg-white/5 mx-6" />
                                            </div>

                                            <div className="grid gap-4">
                                                {documents && documents.length > 0 ? (
                                                    documents.map((doc, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            className="card !p-5 flex items-center justify-between group hover:border-blue-500/30 transition-all"
                                                        >
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                                    <FileUp className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] mb-0.5">{DOC_TYPES[Number(doc.docType)]}</div>
                                                                    <div className="text-sm font-bold text-white italic">{doc.description}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest hidden md:block">{doc.ipfsCid.slice(0, 8)}...</div>
                                                                <a
                                                                    href={`https://ipfs.io/ipfs/${doc.ipfsCid}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all hover:scale-105 active:scale-95 shadow-lg"
                                                                >
                                                                    <ExternalLink className="w-4 h-4 text-slate-500" />
                                                                </a>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                ) : (
                                                    <div className="card text-center py-24 border-dashed border-white/5 bg-white/[0.01]">
                                                        <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-6">
                                                            <FileUp className="w-8 h-8 text-slate-800" />
                                                        </div>
                                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No disclosures found</p>
                                                        <p className="text-[10px] text-slate-600 mt-2 uppercase">Upload your first document to build trust with investors.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </main>
    );
}
