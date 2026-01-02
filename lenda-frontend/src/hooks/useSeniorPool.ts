"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SENIOR_POOL_ADDRESS } from "../lib/contracts/addresses";
import { SeniorPoolABI } from "../lib/contracts/abis";
import { parseUnits } from "viem";

/**
 * Custom hook for interacting with the SeniorPool contract.
 */
export function useSeniorPool() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
    const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Read: Total Assets (TVL in Senior Pool)
    const { data: assets, refetch: refetchAssets } = useReadContract({
        address: SENIOR_POOL_ADDRESS as `0x${string}`,
        abi: SeniorPoolABI,
        functionName: "assets",
    });

    // Read: Share Price (FIDU price in USDC)
    const { data: sharePrice, refetch: refetchSharePrice } = useReadContract({
        address: SENIOR_POOL_ADDRESS as `0x${string}`,
        abi: SeniorPoolABI,
        functionName: "sharePrice",
    });

    // Write: Deposit USDC
    const deposit = (amount: string) => {
        // Assuming 6 decimals for USDC
        const usdcAmount = parseUnits(amount, 6);
        writeContract({
            address: SENIOR_POOL_ADDRESS as `0x${string}`,
            abi: SeniorPoolABI,
            functionName: "deposit",
            args: [usdcAmount],
        });
    };

    return {
        assets: assets as bigint | undefined,
        sharePrice: sharePrice as bigint | undefined,
        deposit,
        isPending: isPending || isWaiting,
        isSuccess,
        writeError,
        hash,
        reset,
        refetch: () => {
            refetchAssets();
            refetchSharePrice();
        }
    };
}
