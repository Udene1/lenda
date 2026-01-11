import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SENIOR_POOL_ADDRESS, FIDU_ADDRESS, WITHDRAWAL_REQUEST_TOKEN_ADDRESS } from "../lib/contracts/addresses";
import { SeniorPoolABI, FiduABI, WithdrawalRequestTokenABI } from "../lib/contracts/abis";
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

    // Read: FIDU Balance
    const { data: fiduBalance, refetch: refetchFiduBalance } = useReadContract({
        address: FIDU_ADDRESS as `0x${string}`,
        abi: FiduABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    // Read: Withdrawal Tokens Balance
    const { data: withdrawalTokenCount, refetch: refetchWrtBalance } = useReadContract({
        address: WITHDRAWAL_REQUEST_TOKEN_ADDRESS as `0x${string}`,
        abi: WithdrawalRequestTokenABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    // Read: Individual Withdrawal Token IDs
    const { data: wrtIds } = useReadContracts({
        contracts: Array.from({ length: Number(withdrawalTokenCount || 0) }).map((_, i) => ({
            address: WITHDRAWAL_REQUEST_TOKEN_ADDRESS as `0x${string}`,
            abi: WithdrawalRequestTokenABI,
            functionName: "tokenOfOwnerByIndex",
            args: [address, BigInt(i)],
        })),
        query: {
            enabled: !!address && !!withdrawalTokenCount,
        }
    });

    // Read: Individual Withdrawal Request Data
    const { data: withdrawalRequests, refetch: refetchRequests } = useReadContracts({
        contracts: (wrtIds || []).filter(res => res.status === 'success').map(res => ({
            address: SENIOR_POOL_ADDRESS as `0x${string}`,
            abi: SeniorPoolABI,
            functionName: "withdrawalRequest",
            args: [res.result as bigint],
        })),
        query: {
            enabled: !!wrtIds && wrtIds.length > 0,
        }
    });

    // Read: Current Epoch Info
    const { data: currentEpoch, refetch: refetchEpoch } = useReadContract({
        address: SENIOR_POOL_ADDRESS as `0x${string}`,
        abi: SeniorPoolABI,
        functionName: "currentEpoch",
    });

    // Write: Deposit USDC
    const deposit = async (amount: string) => {
        const usdcAmount = parseUnits(amount, 6);
        writeContract({
            address: SENIOR_POOL_ADDRESS as `0x${string}`,
            abi: SeniorPoolABI,
            functionName: "deposit",
            args: [usdcAmount],
        });
    };

    // Write: Request Withdrawal
    const requestWithdrawal = async (fiduAmountStr: string) => {
        const fiduAmount = parseUnits(fiduAmountStr, 18);
        writeContract({
            address: SENIOR_POOL_ADDRESS as `0x${string}`,
            abi: SeniorPoolABI,
            functionName: "requestWithdrawal",
            args: [fiduAmount],
        });
    };

    // Write: Claim Withdrawal
    const claimWithdrawal = async (tokenId: bigint) => {
        writeContract({
            address: SENIOR_POOL_ADDRESS as `0x${string}`,
            abi: SeniorPoolABI,
            functionName: "claimWithdrawalRequest",
            args: [tokenId],
        });
    };

    return {
        assets: assets as bigint | undefined,
        sharePrice: sharePrice as bigint | undefined,
        fiduBalance: fiduBalance as bigint | undefined,
        withdrawalTokenCount: withdrawalTokenCount as bigint | undefined,
        withdrawalRequests: (withdrawalRequests || []).map((res, i) => ({
            tokenId: (wrtIds?.[i]?.result as bigint),
            ...(res.result as any)
        })).filter(req => req.tokenId !== undefined),
        currentEpoch: currentEpoch as any,
        deposit,
        requestWithdrawal,
        claimWithdrawal,
        isPending: isPending || isWaiting,
        isSuccess,
        writeError,
        hash,
        reset,
        refetch: () => {
            refetchAssets();
            refetchSharePrice();
            refetchFiduBalance();
            refetchWrtBalance();
            refetchRequests();
            refetchEpoch();
        }
    };
}
