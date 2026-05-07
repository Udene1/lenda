import { useState, useEffect, useCallback } from "react";
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
    borrower: string; // The result of getProfile().name
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
    const [lastUpdated, setLastUpdated] = useState<number>(0);
    const publicClient = usePublicClient();

    const fetchPools = useCallback(async () => {
        if (!publicClient) return;

        try {
            setIsLoading(true);

            // 1. Fetch PoolCreated events from Factory
            const currentBlock = await publicClient.getBlockNumber();
            const scanRange = 10000000n; // ~230 days at 2s/block, plenty for 4-6 months
            const chunkSize = 50000n;
            const startBlock = currentBlock > scanRange ? currentBlock - scanRange : 0n;

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
                    console.warn(`Logs fetch failed for block range ${cursor}-${end}:`, e);
                }
                cursor = end + 1n;
            }

            if (logs.length === 0) {
                setPools([]);
                return;
            }

            // 2. Prepare Multicall for Pool & Profile Data
            const poolAddresses = logs.map(log => log.args.pool as `0x${string}`);
            const borrowerAddresses = logs.map(log => log.args.borrower as `0x${string}`);

            const poolDetailsCalls = poolAddresses.flatMap((poolAddr, i) => [
                { address: poolAddr, abi: TranchedPoolABI, functionName: 'creditLine' },
                { address: poolAddr, abi: TranchedPoolABI, functionName: 'createdAt' },
                { address: BORROWER_PROFILE_ADDRESS as `0x${string}`, abi: BorrowerProfileABI, functionName: 'getProfile', args: [borrowerAddresses[i]] },
                { address: BORROWER_PROFILE_ADDRESS as `0x${string}`, abi: BorrowerProfileABI, functionName: 'getDocuments', args: [borrowerAddresses[i]] },
                { address: METADATA_REGISTRY_ADDRESS as `0x${string}`, abi: MetadataRegistryABI, functionName: 'poolNames', args: [poolAddr] }
            ]);

            const results = await publicClient.multicall({
                contracts: poolDetailsCalls as any[],
                allowFailure: true
            });

            if (!results || results.length === 0) {
                setPools([]);
                setIsLoading(false);
                return;
            }

            // 3. Extract CreditLine addresses and Prepare second Multicall
            const poolInfos: any[] = [];
            const creditLineCalls: any[] = [];

            for (let i = 0; i < poolAddresses.length; i++) {
                const baseIdx = i * 5;
                if (!results[baseIdx]) continue;

                const creditLineAddr = results[baseIdx].result as `0x${string}`;
                const createdAt = results[baseIdx + 1]?.result;
                const profile = results[baseIdx + 2]?.result as any;
                const documents = results[baseIdx + 3]?.result as any[];
                const customName = results[baseIdx + 4]?.result as string;

                poolInfos.push({
                    poolAddr: poolAddresses[i],
                    borrowerAddr: borrowerAddresses[i],
                    creditLineAddr,
                    createdAt,
                    profile,
                    documents: (documents || []).filter(Boolean),
                    customName
                });

                if (creditLineAddr) {
                    creditLineCalls.push(
                        { address: creditLineAddr, abi: CreditLineABI, functionName: 'limit' },
                        { address: creditLineAddr, abi: CreditLineABI, functionName: 'interestApr' },
                        { address: creditLineAddr, abi: CreditLineABI, functionName: 'balance' },
                        { address: creditLineAddr, abi: CreditLineABI, functionName: 'termEndTime' }
                    );
                }
            }

            const clResults = await publicClient.multicall({
                contracts: creditLineCalls as any[],
                allowFailure: true
            });

            // 4. Assemble Final Pool Data
            const finalPools: PoolData[] = poolInfos.map((info, i) => {
                const clIdx = i * 4;
                const limit = clResults[clIdx]?.result as bigint || 0n;
                const apr = clResults[clIdx + 1]?.result as bigint || 0n;
                const balance = clResults[clIdx + 2]?.result as bigint || 0n;
                const termEnd = clResults[clIdx + 3]?.result as bigint || 0n;

                const capacity = Number(formatUnits(limit, 6));
                const currentBalance = Number(formatUnits(balance, 6));
                
                // Progress calculation or fixed 100 if fully funded previously
                const progress = capacity > 0 ? Math.min(100, Math.round((currentBalance / capacity) * 100)) : 100;

                const profileName = info.profile?.name || "Premium Borrower";
                
                return {
                    id: info.poolAddr,
                    name: info.customName || `${profileName} - creditLine`,
                    borrower: profileName,
                    borrowerAddress: info.borrowerAddr,
                    apy: `${(Number(formatUnits(apr, 18)) * 100).toFixed(2)}%`,
                    capacity: `$${capacity.toLocaleString()}`,
                    filled: `$${currentBalance.toLocaleString()}`,
                    progress: progress || 100, // Fallback to 100 if we can't determine
                    term: "12 Months",
                    status: "Active",
                    verified: info.profile?.isVerified || false,
                    description: info.profile?.description || "Institutional lending facility.",
                    type: "Institutional Loan",
                    riskRating: "A-",
                    minInvestment: "$500 USDC",
                    documents: info.documents.map((d: any) => ({ 
                        name: d?.description || "Document", 
                        id: d?.ipfsCid || "" 
                    }))
                };
            });

            setPools(finalPools);
            setLastUpdated(Date.now());
        } catch (error) {
            console.error("Error fetching pools:", error);
        } finally {
            setIsLoading(false);
        }
    }, [publicClient]);

    useEffect(() => {
        fetchPools();
    }, [fetchPools]);

    return { pools, isLoading, refetch: fetchPools, lastUpdated };
}
