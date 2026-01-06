const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying GoldfinchConfigFixer implementation...");

    const Fixer = await ethers.getContractFactory("GoldfinchConfigFixer");
    const fixer = await Fixer.deploy();
    await fixer.waitForDeployment();
    const fixerAddress = await fixer.getAddress();
    console.log("   ✅ Fixer implementation deployed at:", fixerAddress);

    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const proxyAddress = deployment.contracts.GoldfinchConfig;
    const adminAddress = deployment.contracts.ProxyAdmin;

    console.log("📡 Upgrading proxy via ProxyAdmin...");
    const admin = await ethers.getContractAt("ProxyAdmin", adminAddress);

    const tx = await admin.upgrade(proxyAddress, fixerAddress);
    await tx.wait();
    console.log("   ✅ Proxy upgraded successfully!");
}

main().catch(console.error);
