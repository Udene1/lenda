import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import {
    LENDA_FACTORY_ADDRESS,
    BORROWER_PROFILE_ADDRESS,
    METADATA_REGISTRY_ADDRESS
} from "@/lib/contracts/addresses";
import {
    LendaFactoryABI,
    TranchedPoolABI,
    CreditLineABI,
    BorrowerProfileABI,
    MetadataRegistryABI
} from "@/lib/contracts/abis";
import { formatUnits } from "viem";

export interface PoolData {
    id: string;
    name: string;
    borrower: string;
    borrowerAddress: string;
    apy: string;
    capacity: string;
    filled: string;
    progress: number;
    term: string;
    status: string;
    verified: boolean;
    description: string;
    type: string;
    riskRating: string;
    minInvestment: string;
    documents: any[];
}

export function usePools() {
    const [pools, setPools] = useState<PoolData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const publicClient = usePublicClient();

    useEffect(() => {
        async function fetchPools() {
            if (!publicClient) return;

            try {
                setIsLoading(true);

                // 1. Fetch PoolCreated events from Factory
                // Paginate across 100,000 blocks in 9,900-block chunks to stay within RPC limits
                const currentBlock = await publicClient.getBlockNumber();
                const scanRange = 100000n;
                const chunkSize = 9900n;
                const startBlock = currentBlock > scanRange ? currentBlock - scanRange : 0n;

                console.log("Fetching pools from block:", startBlock.toString(), "to", currentBlock.toString());

                const poolEvent = {
                    type: 'event' as const,
                    name: 'PoolCreated' as const,
                    inputs: [
                        { type: 'address' as const, name: 'pool' as const, indexed: true },
                        { type: 'address' as const, name: 'borrower' as const, indexed: true }
                    ],
                };

                let logs: any[] = [];
                let cursor = startBlock;
                while (cursor < currentBlock) {
                    let end = cursor + chunkSize;
                    if (end > currentBlock) end = currentBlock;
                    try {
                        const batch = await publicClient.getLogs({
                            address: LENDA_FACTORY_ADDRESS,
                            event: poolEvent,
                            fromBlock: cursor,
                            toBlock: end
                        });
                        logs = logs.concat(batch);
                    } catch (e) {
                        console.warn("getLogs chunk failed for", cursor.toString(), "-", end.toString(), e);
                    }
                    cursor = end + 1n;
                }

                console.log(`Found ${logs.length} pools across ${((currentBlock - startBlock) / chunkSize).toString()} chunks.`);

                const poolAddresses = logs.map(log => log.args.pool as string);
                const borrowerAddresses = logs.map(log => log.args.borrower as string);

                const poolDataPromises = poolAddresses.map(async (poolAddr, index) => {
                    const borrowerAddr = borrowerAddresses[index];

                    // 2. Fetch Pool Details
                    const [creditLineAddr, createdAt, juniorFee] = await Promise.all([
                        publicClient.readContract({
                            address: poolAddr as `0x${string}`,
                            abi: TranchedPoolABI,
                            functionName: 'creditLine'
                        }),
                        publicClient.readContract({
                            address: poolAddr as `0x${string}`,
                            abi: TranchedPoolABI,
                            functionName: 'createdAt'
                        }),
                        publicClient.readContract({
                            address: poolAddr as `0x${string}`,
                            abi: TranchedPoolABI,
                            functionName: 'juniorFeePercent'
                        })
                    ]);

                    // 3. Fetch CreditLine Details
                    const [limit, interestApr, balance, termEndTime] = await Promise.all([
                        publicClient.readContract({
                            address: creditLineAddr as `0x${string}`,
                            abi: CreditLineABI,
                            functionName: 'limit'
                        }),
                        publicClient.readContract({
                            address: creditLineAddr as `0x${string}`,
                            abi: CreditLineABI,
                            functionName: 'interestApr'
                        }),
                        publicClient.readContract({
                            address: creditLineAddr as `0x${string}`,
                            abi: CreditLineABI,
                            functionName: 'balance'
                        }),
                        publicClient.readContract({
                            address: creditLineAddr as `0x${string}`,
                            abi: CreditLineABI,
                            functionName: 'termEndTime'
                        })
                    ]);

                    // 4. Fetch Borrower Profile
                    let profileName = "Unknown Borrower";
                    let profileDesc = "Standard institutional lending facility.";
                    let verified = false;
                    let docs: any[] = [];

                    try {
                        const profile = await publicClient.readContract({
                            address: BORROWER_PROFILE_ADDRESS as `0x${string}`,
                            abi: BorrowerProfileABI,
                            functionName: 'getProfile',
                            args: [borrowerAddr as `0x${string}`]
                        }) as any;

                        if (profile && profile.name) {
                            profileName = profile.name;
                            profileDesc = profile.description;
                            verified = profile.isVerified;
                        }

                        const response = await publicClient.readContract({
                            address: BORROWER_PROFILE_ADDRESS as `0x${string}`,
                            abi: BorrowerProfileABI,
                            functionName: 'getDocuments',
                            args: [borrowerAddr as `0x${string}`]
                        }) as any[];
                        if (response) docs = response;
                    } catch (e) {
                        console.error("Error fetching profile for", borrowerAddr, e);
                    }

                    const capacity = Number(formatUnits(limit as bigint, 6));
                    const filled = capacity; // For simplicity in simple view, or we can fetch totalDeposited
                    // Note: In Lenda, 'limit' on CL is actually the amount drawn down or the max allowed.
                    // Let's use 100% progress for now if it's an existing pool, or calculate properly.

                    // 5. Fetch Pool Name from Metadata Registry
                    let customName = "";
                    try {
                        customName = await publicClient.readContract({
                            address: METADATA_REGISTRY_ADDRESS as `0x${string}`,
                            abi: MetadataRegistryABI,
                            functionName: 'poolNames',
                            args: [poolAddr as `0x${string}`]
                        }) as string;
                    } catch (e) {
                        console.error("Error fetching name for", poolAddr, e);
                    }

                    return {
                        id: poolAddr,
                        name: customName || `${profileName} - Credit Line`,
                        borrower: profileName,
                        borrowerAddress: borrowerAddr,
                        apy: `${(Number(interestApr) / 1e16).toFixed(2)}%`,
                        capacity: `$${capacity.toLocaleString()}`,
                        filled: `$${capacity.toLocaleString()}`,
                        progress: 100,
                        term: "12 Months",
                        status: "Active",
                        verified: verified,
                        description: profileDesc,
                        type: "Institutional Loan",
                        riskRating: "A-",
                        minInvestment: "$500 USDC",
                        documents: docs.filter(Boolean).map(d => ({ name: d?.description || "Document", id: d?.ipfsCid || "" }))
                    };
                });

                const resolvedPools = await Promise.all(poolDataPromises);
                setPools(resolvedPools);
            } catch (error) {
                console.error("Error fetching pools:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchPools();
    }, [publicClient]);

    return { pools, isLoading };
}
