import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { GOLDFINCH_FACTORY_ADDRESS, DEFAULT_SCHEDULE_ADDRESS } from "@/lib/contracts/addresses";
import { GoldfinchFactoryABI } from "@/lib/contracts/abis";
import { parseUnits } from "viem";
import { useState, useEffect } from "react";

export function useGoldfinchFactory() {
    const { address } = useAccount();
    const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
    const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Check if user is borrower
    const { data: isBorrower } = useReadContract({
        address: GOLDFINCH_FACTORY_ADDRESS as `0x${string}`,
        abi: GoldfinchFactoryABI,
        functionName: "isBorrower",
        account: address as `0x${string}`,
    });

    // Check if user is admin
    const { data: isAdmin } = useReadContract({
        address: GOLDFINCH_FACTORY_ADDRESS as `0x${string}`,
        abi: GoldfinchFactoryABI,
        functionName: "isAdmin",
        account: address as `0x${string}`,
    });

    /**
     * Propose a new Tranched Pool
     */
    const proposePool = async (
        limitUsdc: string,
        interestAprPercent: string,
        juniorFeePercent: string = "20"
    ) => {
        if (!address) return;

        const limitRaw = parseUnits(limitUsdc, 6); // USDC 6 decimals
        const juniorFeeRaw = BigInt(juniorFeePercent);
        // Goldfinch uses 18 decimals for APR. 10% = 1e17.
        const aprRaw = parseUnits(interestAprPercent, 16);

        const lateFeeAprRaw = parseUnits("5", 16);
        const fundableAt = BigInt(Math.floor(Date.now() / 1000));

        writeContract({
            address: GOLDFINCH_FACTORY_ADDRESS as `0x${string}`,
            abi: GoldfinchFactoryABI,
            functionName: "createPool",
            args: [
                address as `0x${string}`,
                juniorFeeRaw,
                limitRaw,
                aprRaw,
                DEFAULT_SCHEDULE_ADDRESS as `0x${string}`,
                lateFeeAprRaw,
                fundableAt,
                [BigInt(1)], // Allowed UID Type 1 (Individual)
                false // seniorOnly
            ]
        });
    };

    return {
        isBorrower: !!(isBorrower || isAdmin),
        proposePool,
        isPending: isPending || isWaiting,
        isSuccess,
        writeError,
        hash
    };
}
