const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Upgrading GoldfinchConfig to Fixer...");

    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const proxyAddress = deployment.contracts.GoldfinchConfig;

    const GoldfinchConfigFixer = await ethers.getContractFactory("GoldfinchConfigFixer");

    // We use forceImport if the plugin doesn't recognize the proxy
    // but here we just try to upgrade.
    const upgraded = await upgrades.upgradeProxy(proxyAddress, GoldfinchConfigFixer);
    await upgraded.waitForDeployment();

    console.log("   ✅ Upgraded GoldfinchConfig to Fixer at:", proxyAddress);
}

main().catch(console.error);
