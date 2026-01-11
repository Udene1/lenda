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
                const currentBlock = await publicClient.getBlockNumber();
                const fromBlock = currentBlock > 100000n ? currentBlock - 100000n : 0n;

                console.log("Fetching pools from block:", fromBlock.toString());

                const logs = await publicClient.getLogs({
                    address: LENDA_FACTORY_ADDRESS,
                    event: {
                        type: 'event',
                        name: 'PoolCreated',
                        inputs: [
                            { type: 'address', name: 'pool', indexed: true },
                            { type: 'address', name: 'borrower', indexed: true }
                        ],
                    },
                    fromBlock
                });

                console.log(`Found ${logs.length} pools.`);

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

                        docs = await publicClient.readContract({
                            address: BORROWER_PROFILE_ADDRESS as `0x${string}`,
                            abi: BorrowerProfileABI,
                            functionName: 'getDocuments',
                            args: [borrowerAddr as `0x${string}`]
                        }) as any[];
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
                        documents: docs.map(d => ({ name: d.description, id: d.ipfsCid }))
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
