"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi } from "viem";

export function useERC20(tokenAddress: `0x${string}`, spenderAddress?: `0x${string}`) {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
    const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

    const { data: balance, refetch: refetchBalance } = useReadContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: address && spenderAddress ? [address, spenderAddress] : undefined,
    });

    const approve = (spender: `0x${string}`, amount: bigint) => {
        writeContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [spender, amount],
        });
    };

    const mint = (to: `0x${string}`, amount: bigint) => {
        writeContract({
            address: tokenAddress,
            abi: [
                ...erc20Abi,
                {
                    "inputs": [
                        { "internalType": "address", "name": "to", "type": "address" },
                        { "internalType": "uint256", "name": "amount", "type": "uint256" }
                    ],
                    "name": "mint",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ],
            functionName: "mint",
            args: [to, amount],
        });
    };

    return {
        balance,
        allowance,
        approve,
        mint,
        isPending: isPending || isWaiting,
        isSuccess,
        writeError,
        hash,
        reset,
        refetch: () => {
            refetchBalance();
            refetchAllowance();
        }
    };
}
