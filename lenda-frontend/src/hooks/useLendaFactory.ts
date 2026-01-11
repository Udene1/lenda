import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import {
    LENDA_FACTORY_ADDRESS,
    DEFAULT_SCHEDULE_ADDRESS,
    METADATA_REGISTRY_ADDRESS
} from "@/lib/contracts/addresses";
import { LendaFactoryABI, MetadataRegistryABI } from "@/lib/contracts/abis";
import { parseUnits } from "viem";
import { useState, useEffect } from "react";

export function useLendaFactory() {
    const { address } = useAccount();
    const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
    const { data: receipt, isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Check if user is borrower
    const { data: isBorrower } = useReadContract({
        address: LENDA_FACTORY_ADDRESS as `0x${string}`,
        abi: LendaFactoryABI,
        functionName: "isBorrower",
        account: address as `0x${string}`,
    });

    // Check if user is admin
    const { data: isAdmin } = useReadContract({
        address: LENDA_FACTORY_ADDRESS as `0x${string}`,
        abi: LendaFactoryABI,
        functionName: "isAdmin",
        account: address as `0x${string}`,
    });

    /**
     * Propose a new Tranched Pool
     */
    const proposePool = async (
        limitUsdc: string,
        interestAprPercent: string,
        juniorFeePercent: string = "20",
        facilityName: string = ""
    ) => {
        if (!address) return;

        const limitRaw = parseUnits(limitUsdc, 6); // USDC 6 decimals
        const juniorFeeRaw = BigInt(juniorFeePercent);
        // Lenda uses 18 decimals for APR. 10% = 1e17.
        const aprRaw = parseUnits(interestAprPercent, 16);

        const lateFeeAprRaw = parseUnits("5", 16);
        const fundableAt = BigInt(Math.floor(Date.now() / 1000));

        writeContract({
            address: LENDA_FACTORY_ADDRESS as `0x${string}`,
            abi: LendaFactoryABI,
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

    /**
     * Set a custom name for a pool
     */
    const setPoolName = async (poolAddress: string, name: string) => {
        if (!address) return;

        writeContract({
            address: METADATA_REGISTRY_ADDRESS as `0x${string}`,
            abi: MetadataRegistryABI,
            functionName: "setPoolName",
            args: [poolAddress as `0x${string}`, name]
        });
    };

    return {
        isBorrower: !!(isBorrower || isAdmin),
        proposePool,
        setPoolName,
        isPending: isPending || isWaiting,
        isSuccess,
        writeError,
        hash,
        receipt
    };
}
