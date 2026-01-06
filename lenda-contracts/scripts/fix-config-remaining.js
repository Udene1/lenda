const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🛠️  Fixing remaining indices in GoldfinchConfig...\n");

    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const configAddress = deployment.contracts.GoldfinchConfig;
    const config = await ethers.getContractAt("GoldfinchConfigFixer", configAddress);

    const contracts = deployment.contracts;

    const indices = {
        BorrowerImplementation: 17
    };

    const addr = ethers.getAddress(contracts.BorrowerImplementation || "0xC9C616d25F6564e9a805F0F548e65893a4Cc9907");
    const index = indices.BorrowerImplementation;

    console.log(`📡 Setting BorrowerImplementation [${index}] to ${addr}...`);
    try {
        const tx = await config.forceSetAddress(index, addr);
        await tx.wait();
        console.log("   ✅ Done.");
    } catch (e) {
        console.log(`   ❌ Failed: ${e.message}`);
    }

    console.log("\n🚀 All indices fixed.");
}

main().catch(console.error);
