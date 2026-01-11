/**
 * CLI Tool to whitelist Borrowers in the Lenda Protocol.
 * 
 * This script:
 * 1. Grants BORROWER_ROLE in LendaFactory (allows creating pools)
 * 2. Grants ZAPPER_ROLE in Go (allows bypassing KYC)
 * 
 * Usage:
 * BORROWER=0x... npx hardhat run scripts/whitelist-borrower.js --network base-sepolia
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    const borrowerAddress = process.env.BORROWER;

    if (!borrowerAddress || !ethers.isAddress(borrowerAddress)) {
        console.error("❌ Error: Valid BORROWER address must be provided via environment variable.");
        console.log("Example: BORROWER=0x... npx hardhat run scripts/whitelist-borrower.js --network base-sepolia");
        process.exit(1);
    }

    console.log("====================================================");
    console.log("🚀 Whitelisting Borrower:", borrowerAddress);
    console.log("👤 Using Admin Account:", deployer.address);
    console.log("====================================================\n");

    // Load Deployment Info
    const deploymentPath = path.join(__dirname, "../deployments-lenda-final.json");
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ Error: deployments-lenda-final.json not found.");
        process.exit(1);
    }
    const deployments = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const addresses = deployments.contracts;

    // Roles
    const BORROWER_ROLE = ethers.id("BORROWER_ROLE");
    const ZAPPER_ROLE = ethers.id("ZAPPER_ROLE");

    // 1. Grant BORROWER_ROLE in LendaFactory
    console.log("📦 Checking LendaFactory...");
    const factory = await ethers.getContractAt("contracts/protocol/core/LendaFactory.sol:LendaFactory", addresses.LendaFactory);
    const hasBorrowerRole = await factory.hasRole(BORROWER_ROLE, borrowerAddress);

    if (hasBorrowerRole) {
        console.log("✅ Already has BORROWER_ROLE in LendaFactory.");
    } else {
        console.log("⏳ Granting BORROWER_ROLE...");
        const tx = await factory.grantRole(BORROWER_ROLE, borrowerAddress);
        await tx.wait();
        console.log("✅ BORROWER_ROLE granted.");
    }

    // 2. Grant ZAPPER_ROLE in Go
    console.log("\n🛡️ Checking Go (KYC Bypass)...");
    const go = await ethers.getContractAt("contracts/protocol/core/Go.sol:Go", addresses.Go);
    const hasZapperRole = await go.hasRole(ZAPPER_ROLE, borrowerAddress);

    if (hasZapperRole) {
        console.log("✅ Already has ZAPPER_ROLE in Go.");
    } else {
        console.log("⏳ Granting ZAPPER_ROLE...");
        const tx = await go.grantRole(ZAPPER_ROLE, borrowerAddress);
        await tx.wait();
        console.log("✅ ZAPPER_ROLE granted.");
    }

    console.log("\n🎉 Borrower successfully whitelisted!");
    console.log("They can now create pools and drawdown funds without standard KYC.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Script failed:", error);
        process.exit(1);
    });
