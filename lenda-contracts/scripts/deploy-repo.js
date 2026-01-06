const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying MonthlyScheduleRepo...");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const MonthlyScheduleRepo = await ethers.getContractFactory("MonthlyScheduleRepo");
    const repo = await MonthlyScheduleRepo.deploy();
    await repo.waitForDeployment();
    const repoAddress = await repo.getAddress();
    console.log("   ✅ MonthlyScheduleRepo deployed to:", repoAddress);

    // Update Config
    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const configAddress = deployment.contracts.GoldfinchConfig;
    const config = await ethers.getContractAt("GoldfinchConfig", configAddress);

    console.log("   Updating GoldfinchConfig index 25...");
    const tx = await config.setAddress(25, repoAddress);
    await tx.wait();
    console.log("   ✅ Config updated.");

    // Update deployment file
    deployment.contracts.MonthlyScheduleRepo = repoAddress;
    fs.writeFileSync("deployments-core.json", JSON.stringify(deployment, null, 2));
    console.log("📁 Updated deployments-core.json");
}

main().catch(console.error);
