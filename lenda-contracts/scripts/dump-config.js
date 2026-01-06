const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const configAddress = deployment.contracts.GoldfinchConfig;
    const config = await ethers.getContractAt("GoldfinchConfig", configAddress);

    console.log("🔍 Checking GoldfinchConfig Addresses...\n");

    const indices = {
        Pool: 0,
        CreditLineImplementation: 1,
        GoldfinchFactory: 2,
        Fidu: 4,
        USDC: 5,
        TreasuryReserve: 6,
        ProtocolAdmin: 7,
        PoolTokens: 12,
        TranchedPoolImplementation: 13,
        SeniorPool: 14,
        SeniorPoolStrategy: 15,
        BorrowerImplementation: 17,
        Go: 19,
        TranchedPoolImplementationRepository: 23,
        MonthlyScheduleRepo: 25
    };

    for (const [name, index] of Object.entries(indices)) {
        const addr = await config.getAddress(index);
        console.log(`[${index}] ${name.padEnd(40)}: ${addr}`);
    }
}

main().catch(console.error);
