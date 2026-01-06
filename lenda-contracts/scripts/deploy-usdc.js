const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying standard Mock USDC...");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("   ✅ Mock USDC deployed to:", usdcAddress);

    // Update deployment file
    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    deployment.contracts.USDC = usdcAddress;
    fs.writeFileSync("deployments-core.json", JSON.stringify(deployment, null, 2));
    console.log("📁 Updated deployments-core.json");
}

main().catch(console.error);
