"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "loading";

interface TransactionToastProps {
    isVisible: boolean;
    onClose: () => void;
    type: ToastType;
    title: string;
    message?: string;
    txHash?: string;
}

export function TransactionToast({
    isVisible,
    onClose,
    type,
    title,
    message,
    txHash
}: TransactionToastProps) {
    // Auto-dismiss success and error toasts
    useEffect(() => {
        if (isVisible && type !== "loading") {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, type, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
                >
                    <div className={`p-4 rounded-2xl glass border overflow-hidden relative shadow-2xl ${type === "success" ? "border-emerald-500/20 bg-emerald-950/30" :
                            type === "error" ? "border-red-500/20 bg-red-950/30" :
                                "border-blue-500/20 bg-blue-950/30"
                        }`}>
                        {/* Progress bar for auto-dismiss */}
                        {type !== "loading" && (
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 5, ease: "linear" }}
                                className={`absolute bottom-0 left-0 h-1 ${type === "success" ? "bg-emerald-500/50" : "bg-red-500/50"
                                    }`}
                            />
                        )}

                        <div className="flex items-start gap-4">
                            <div className={`mt-0.5 rounded-full p-1 ${type === "success" ? "bg-emerald-500/10 text-emerald-500" :
                                    type === "error" ? "bg-red-500/10 text-red-500" :
                                        "bg-blue-500/10 text-blue-500"
                                }`}>
                                {type === "success" && <CheckCircle2 className="w-5 h-5" />}
                                {type === "error" && <XCircle className="w-5 h-5" />}
                                {type === "loading" && <Loader2 className="w-5 h-5 animate-spin" />}
                            </div>

                            <div className="flex-1">
                                <h3 className={`font-bold text-sm ${type === "success" ? "text-emerald-400" :
                                        type === "error" ? "text-red-400" :
                                            "text-blue-400"
                                    }`}>{title}</h3>

                                {message && (
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{message}</p>
                                )}

                                {txHash && (
                                    <a
                                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors underline decoration-slate-700 underline-offset-2"
                                    >
                                        View on Basescan
                                    </a>
                                )}
                            </div>

                            <button
                                onClick={onClose}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
