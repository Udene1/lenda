const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🛠️  FORCING Rewire of GoldfinchConfig with CORRECT indices...\n");

    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const configAddress = deployment.contracts.GoldfinchConfig;

    // Use the Fixer ABI to get forceSetAddress
    const config = await ethers.getContractAt("GoldfinchConfigFixer", configAddress);

    const contracts = deployment.contracts;

    // Official indices from ConfigOptions.sol
    const indices = {
        Pool: 0,
        CreditLineImplementation: 1,
        GoldfinchFactory: 2,
        Fidu: 4,
        USDC: 5,
        TreasuryReserve: 6,
        ProtocolAdmin: 7,
        GoldfinchConfig: 11,
        PoolTokens: 12,
        TranchedPoolImplementation: 13,
        SeniorPool: 14,
        SeniorPoolStrategy: 15,
        BorrowerImplementation: 17,
        GFI: 18,
        Go: 19,
        TranchedPoolImplementationRepository: 23,
        MonthlyScheduleRepo: 25
    };

    const mapping = [
        { name: "CreditLineImplementation", index: indices.CreditLineImplementation, addr: contracts.CreditLineImplementation || "0x1f1c01062a9AFa30A10a700c5a484847bFf76e11" },
        { name: "GoldfinchFactory", index: indices.GoldfinchFactory, addr: contracts.GoldfinchFactory },
        { name: "Fidu", index: indices.Fidu, addr: contracts.Fidu },
        { name: "USDC", index: indices.USDC, addr: contracts.USDC },
        { name: "TreasuryReserve", index: indices.TreasuryReserve, addr: deployment.deployer },
        { name: "ProtocolAdmin", index: indices.ProtocolAdmin, addr: deployment.deployer },
        { name: "GoldfinchConfig", index: indices.GoldfinchConfig, addr: configAddress },
        { name: "PoolTokens", index: indices.PoolTokens, addr: contracts.PoolTokens },
        { name: "TranchedPoolImplementation", index: indices.TranchedPoolImplementation, addr: contracts.TranchedPoolImplementation },
        { name: "SeniorPool", index: indices.SeniorPool, addr: contracts.SeniorPool },
        { name: "BorrowerImplementation", index: indices.BorrowerImplementation, addr: contracts.BorrowerImplementation || "0xC9C616d25F6564e9a805F0F548e65893a4Cc9907" },
        { name: "Go", index: indices.Go, addr: contracts.Go },
        { name: "MonthlyScheduleRepo", index: indices.MonthlyScheduleRepo, addr: contracts.MonthlyScheduleRepo }
    ];

    for (const item of mapping) {
        if (!item.addr) {
            console.log(`⚠️  Skipping ${item.name} (Address unknown)`);
            continue;
        }

        const current = await config.getAddress(item.index);
        console.log(`📡 Setting ${item.name} [${item.index}] to ${item.addr}...`);

        try {
            const tx = await config.forceSetAddress(item.index, item.addr);
            await tx.wait();
            console.log("   ✅ Done.");
        } catch (e) {
            console.log(`   ❌ Failed: ${e.message}`);
        }
    }

    console.log("\n🚀 Forced Rewire complete.");
}

main().catch(console.error);
