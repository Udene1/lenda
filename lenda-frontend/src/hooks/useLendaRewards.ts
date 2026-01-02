"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LENDA_REWARDS_ADDRESS, LENDA_TOKEN_ADDRESS } from "../lib/contracts/addresses";
import { LendaRewardsABI, LendaTokenABI } from "../lib/contracts/abis";

/**
 * Custom hook for interacting with the LendaRewards and LendaToken contracts.
 */
export function useLendaRewards() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Read: Get Lenda Token Balance
    const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
        address: LENDA_TOKEN_ADDRESS as `0x${string}`,
        abi: LendaTokenABI,
        functionName: "balanceOf",
        args: [address],
        query: {
            enabled: !!address,
        }
    });

    // Read: Get Total Claimed
    const { data: totalClaimed, refetch: refetchClaimed } = useReadContract({
        address: LENDA_REWARDS_ADDRESS as `0x${string}`,
        abi: LendaRewardsABI,
        functionName: "totalClaimed",
        args: [address],
        query: {
            enabled: !!address,
        }
    });

    // Write: Claim Rewards
    // Note: For a real app, you would need to fetch the merkle proof from an API
    // Here we will use a dummy proof placeholder for UI demonstration if backend isn't ready
    const claimRewards = (amount: bigint, proof: `0x${string}`[]) => {
        writeContract({
            address: LENDA_REWARDS_ADDRESS as `0x${string}`,
            abi: LendaRewardsABI,
            functionName: "claim",
            args: [amount, proof],
        });
    };

    return {
        tokenBalance: tokenBalance ? Number(tokenBalance) / 1e18 : 0,
        totalClaimed: totalClaimed ? Number(totalClaimed) / 1e18 : 0,
        claimRewards,
        isPending: isPending || isWaiting,
        isSuccess,
        writeError,
        refetch: () => {
            refetchBalance();
            refetchClaimed();
        }
    };
}
