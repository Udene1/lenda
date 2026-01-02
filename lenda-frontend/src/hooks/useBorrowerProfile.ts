"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BORROWER_PROFILE_ADDRESS } from "../lib/contracts/addresses";
import { BorrowerProfileABI } from "../lib/contracts/abis";

/**
 * Custom hook for interacting with the BorrowerProfile contract.
 */
export function useBorrowerProfile() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
    const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Read: Check if profile exists
    const { data: hasProfile, refetch: refetchHasProfile } = useReadContract({
        address: BORROWER_PROFILE_ADDRESS as `0x${string}`,
        abi: BorrowerProfileABI,
        functionName: "hasProfile",
        args: [address],
        query: {
            enabled: !!address,
        }
    });

    // Read: Get profile data
    const { data: profile, refetch: refetchProfile } = useReadContract({
        address: BORROWER_PROFILE_ADDRESS as `0x${string}`,
        abi: BorrowerProfileABI,
        functionName: "getProfile",
        args: [address],
        query: {
            enabled: !!address && !!hasProfile,
        }
    });

    // Read: Get documents
    const { data: documents, refetch: refetchDocs } = useReadContract({
        address: BORROWER_PROFILE_ADDRESS as `0x${string}`,
        abi: BorrowerProfileABI,
        functionName: "getDocuments",
        args: [address],
        query: {
            enabled: !!address && !!hasProfile,
        }
    });

    // Write: Create Profile
    const createProfile = (name: string, description: string, website: string, email: string) => {
        writeContract({
            address: BORROWER_PROFILE_ADDRESS as `0x${string}`,
            abi: BorrowerProfileABI,
            functionName: "createProfile",
            args: [name, description, website, email],
        });
    };

    // Write: Upload Document
    const uploadDocument = (ipfsCid: string, docType: number, description: string) => {
        writeContract({
            address: BORROWER_PROFILE_ADDRESS as `0x${string}`,
            abi: BorrowerProfileABI,
            functionName: "uploadDocument",
            args: [ipfsCid, docType, description],
        });
    };

    return {
        address,
        hasProfile: hasProfile as boolean,
        profile: profile as any,
        documents: documents as any[],
        createProfile,
        uploadDocument,
        isPending: isPending || isWaiting,
        isSuccess,
        writeError,
        reset,
        refetch: () => {
            refetchHasProfile();
            refetchProfile();
            refetchDocs();
        }
    };
}
