"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { UNIQUE_IDENTITY_ADDRESS } from "../lib/contracts/addresses";
import { UniqueIdentityABI } from "../lib/contracts/abis";

/**
 * Custom hook for interacting with the UniqueIdentity (KYC) contract.
 */
export function useUniqueIdentity() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
    const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

    // ID Type 1 is usually Non-US Individual in Goldfinch
    const NON_US_ID_TYPE = BigInt(1);

    // Read: Check if user has UID (KYC)
    const { data: balance, refetch: refetchBalance } = useReadContract({
        address: UNIQUE_IDENTITY_ADDRESS as `0x${string}`,
        abi: UniqueIdentityABI,
        functionName: "balanceOf",
        args: address ? [address, NON_US_ID_TYPE] : undefined,
        query: {
            enabled: !!address,
        }
    });

    // Read: Get nonce for signature
    const { data: nonce, refetch: refetchNonce } = useReadContract({
        address: UNIQUE_IDENTITY_ADDRESS as `0x${string}`,
        abi: UniqueIdentityABI,
        functionName: "nonces",
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        }
    });

    // Write: Mint UID (Mocked for now since it needs a backend signature)
    const mintUid = async (id: bigint, expiresAt: bigint, signature: `0x${string}`) => {
        console.log("Minting UID with:", { id, expiresAt, signature });
        // Use alert to see the parameters in UI during testing if console is hard to reach
        // alert(`Minting with ID: ${id}, Signature: ${signature.slice(0, 10)}...`);
        return writeContract({
            address: UNIQUE_IDENTITY_ADDRESS as `0x${string}`,
            abi: UniqueIdentityABI,
            functionName: "mint",
            args: [id, expiresAt, signature],
        });
    };

    // Helper: Call Python Mock Server to get signature and then mint
    const verifyKyc = async () => {
        if (!address) return;

        try {
            console.log("Requesting signature for:", address);
            const response = await fetch("http://127.0.0.1:5001/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_address: address,
                    id_type: Number(NON_US_ID_TYPE)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to get signature from mock server");
            }

            const { signature, expiresAt: expires_at } = await response.json();

            if (!signature || !signature.startsWith('0x')) {
                throw new Error("Invalid signature received from server.");
            }

            // Trigger the contract write
            await mintUid(NON_US_ID_TYPE, BigInt(expires_at), signature as `0x${string}`);
        } catch (err: any) {
            console.error("KYC Verification Error:", err);
            throw err;
        }
    };

    return {
        isKycVerified: balance ? (balance as bigint) > BigInt(0) : false,
        nonce: nonce as bigint | undefined,
        mintUid,
        verifyKyc,
        isPending: isPending || isWaiting,
        isSuccess,
        writeError,
        hash,
        reset,
        refetch: () => {
            refetchBalance();
            refetchNonce();
        }
    };
}
