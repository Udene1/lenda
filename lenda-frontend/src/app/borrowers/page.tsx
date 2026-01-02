"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useBorrowerProfile } from "@/hooks/useBorrowerProfile";
import { useUniqueIdentity } from "@/hooks/useUniqueIdentity";
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
    Fingerprint
} from "lucide-react";
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

    const isPending = isProfilePending || isKycPending;
    const isSuccess = isProfileSuccess || isKycSuccess;
    const writeError = profileError || kycError;
    const refetch = () => { refetchProfile(); refetchKyc(); };

    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [web, setWeb] = useState("");
    const [email, setEmail] = useState("");

    const [ipfsCid, setIpfsCid] = useState("");
    const [docType, setDocType] = useState(0);
    const [docDesc, setDocDesc] = useState("");

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


    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        createProfile(name, desc, web, email);
    };

    const handleUploadDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        uploadDocument(ipfsCid, docType, docDesc);
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

            <div className="pt-32 px-6 max-w-5xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold italic uppercase tracking-tight">
                            Borrower <span className="text-blue-500 text-3xl font-light tracking-widest lowercase">.dashboard</span>
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Manage your institutional profile and financial disclosures.</p>
                    </div>
                    {hasProfile && profile?.isVerified && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold uppercase text-xs tracking-widest">
                            <CheckCircle2 className="w-4 h-4" /> Verified Protocol Partner
                        </div>
                    )}
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
                            <p className="mb-4">Verification on Lenda usually involves institutional KYC/KYB disclosures.</p>
                            <p className="text-sm text-slate-400 italic">Testing Note: In this environment, we use a Mock KYC provider that signs your verification request instantly via our local Python server.</p>
                        </div>

                        <button
                            onClick={() => verifyKyc()}
                            disabled={isPending}
                            className="w-full btn-primary bg-amber-500 hover:bg-amber-600 border-amber-500/20 py-4 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isKycPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                            {isKycPending ? "Verifying..." : "Verify via Mock KYC Provider"}
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
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Profile Overview */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="card border-blue-500/10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg leading-tight">{profile?.name}</h2>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-40">
                                            {address}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">{profile?.description}</p>
                                <div className="space-y-3 pt-6 border-t border-white/5 font-medium">
                                    {profile?.contactEmail && (
                                        <div className="flex items-center gap-3 text-sm text-slate-300">
                                            <Mail className="w-4 h-4 text-slate-500" /> {profile.contactEmail}
                                        </div>
                                    )}
                                    {profile?.website && (
                                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                            <Globe className="w-4 h-4 text-slate-500" /> {profile.website.replace("https://", "")}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Action Box */}
                            <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10">
                                <div className="flex items-center gap-2 text-blue-400 mb-2">
                                    <Info className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Transparency Note</span>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                    All uploaded documents are stored as IPFS CIDs on-chain and are publicly viewable by prospective lenders.
                                </p>
                            </div>
                        </div>

                        {/* Document Management */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="card">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <FileUp className="w-6 h-6 text-blue-500" />
                                        <h2 className="text-xl font-bold uppercase italic">Upload Financials</h2>
                                    </div>
                                </div>

                                <form onSubmit={handleUploadDoc} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Document Type</label>
                                            <select
                                                value={docType}
                                                onChange={(e) => setDocType(Number(e.target.value))}
                                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-200"
                                            >
                                                {DOC_TYPES.map((type, i) => (
                                                    <option key={type} value={i}>{type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2 text-wrap">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 uppercase">IPFS CID</label>
                                            <input
                                                type="text"
                                                value={ipfsCid}
                                                onChange={(e) => setIpfsCid(e.target.value)}
                                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-medium text-xs truncate"
                                                placeholder="QmXyZ..."
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Brief Description</label>
                                        <input
                                            type="text"
                                            value={docDesc}
                                            onChange={(e) => setDocDesc(e.target.value)}
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                            placeholder="e.g. Q4 2024 Audit Report"
                                            required
                                        />
                                    </div>
                                    <button
                                        disabled={isPending}
                                        className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
                                        {isPending ? "Uploading to Chain..." : "Encrypt & Upload to Protocol"}
                                    </button>
                                </form>
                            </div>

                            {/* Document List */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Public Disclosures ({documents?.length || 0})</h3>
                                <div className="grid gap-4">
                                    {documents && documents.length > 0 ? (
                                        documents.map((doc, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="glass p-5 rounded-2xl flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                                                        <FileUp className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-0.5">{DOC_TYPES[Number(doc.docType)]}</div>
                                                        <div className="font-medium text-white">{doc.description}</div>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`https://ipfs.io/ipfs/${doc.ipfsCid}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-slate-400" />
                                                </a>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="card text-center py-12 text-slate-500 border-dashed">
                                            No documents uploaded yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
