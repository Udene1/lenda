const { createPublicClient, http, formatUnits, decodeEventLog } = require("viem");
const { baseSepolia } = require("viem/chains");
const path = require("path");

// ABIs
const LendaFactoryABI = [{"inputs":[{"indexed":true,"internalType":"address","name":"pool","type":"address"},{"indexed":true,"internalType":"address","name":"borrower","type":"address"}],"name":"PoolCreated","type":"event"}];
const TranchedPoolABI = [{"inputs":[],"name":"creditLine","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"createdAt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"juniorFeePercent","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
const CreditLineABI = [{"inputs":[],"name":"limit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"interestApr","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"balance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"termEndTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

const LENDA_FACTORY_ADDRESS = "0x6AEb4aB1CD812939429e6FBa538332DCCb331f36";

async function main() {
    const addressesPath = path.join(__dirname, "src/lib/contracts/addresses.ts");
    // Just use standard RPC if env is missing
    const rpc = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : "https://sepolia.base.org";

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(rpc)
    });

    try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 100000n ? currentBlock - 100000n : 0n;
        console.log("Fetching logs from block", fromBlock.toString());
        
        let logs = [];
        let cur = fromBlock;
        while (cur < currentBlock) {
            let next = cur + 9900n;
            if (next > currentBlock) next = currentBlock;
            const batch = await publicClient.getLogs({
                address: LENDA_FACTORY_ADDRESS,
                event: {
                    type: 'event',
                    name: 'PoolCreated',
                    inputs: [
                        { type: 'address', name: 'pool', indexed: true },
                        { type: 'address', name: 'borrower', indexed: true }
                    ],
                },
                fromBlock: cur,
                toBlock: next
            });
            logs = logs.concat(batch);
            cur = next + 1n;
        }

        console.log(`Found ${logs.length} pools.`);
        
        for (const log of logs) {
            const poolAddr = log.args.pool;
            const borrowerAddr = log.args.borrower;
            console.log(`Pool: ${poolAddr}, Borrower: ${borrowerAddr}`);

            try {
                const [creditLineAddr, createdAt, juniorFee] = await Promise.all([
                    publicClient.readContract({ address: poolAddr, abi: TranchedPoolABI, functionName: 'creditLine' }),
                    publicClient.readContract({ address: poolAddr, abi: TranchedPoolABI, functionName: 'createdAt' }),
                    publicClient.readContract({ address: poolAddr, abi: TranchedPoolABI, functionName: 'juniorFeePercent' })
                ]);
                console.log(`  -> creditLine: ${creditLineAddr}`);

                const [limit, interestApr, balance, termEndTime] = await Promise.all([
                    publicClient.readContract({ address: creditLineAddr, abi: CreditLineABI, functionName: 'limit' }),
                    publicClient.readContract({ address: creditLineAddr, abi: CreditLineABI, functionName: 'interestApr' }),
                    publicClient.readContract({ address: creditLineAddr, abi: CreditLineABI, functionName: 'balance' }),
                    publicClient.readContract({ address: creditLineAddr, abi: CreditLineABI, functionName: 'termEndTime' })
                ]);

                console.log(`  -> SUCCESS! Limit: ${limit}, Term: ${termEndTime}`);
            } catch (err) {
                console.error(`  -> ERROR reading contract data for pool ${poolAddr}: ${err.message}`);
            }
        }
    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

main();
