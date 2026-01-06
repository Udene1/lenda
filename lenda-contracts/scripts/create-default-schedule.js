const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const repoAddress = deployment.contracts.MonthlyScheduleRepo;
    const repo = await ethers.getContractAt("MonthlyScheduleRepo", repoAddress);

    const params = [12, 12, 1, 0];
    console.log("🚀 Checking/Creating default 12-month schedule...");

    // Use staticCall to get the return value (the schedule address)
    const scheduleAddress = await repo.createSchedule.staticCall(...params);
    console.log("   📍 Schedule address will be:", scheduleAddress);

    // Now execute the transaction to make sure it's actually deployed
    const tx = await repo.createSchedule(...params);
    await tx.wait();
    console.log("   ✅ Transaction confirmed.");

    // Save to deployment
    deployment.contracts.DefaultSchedule = scheduleAddress;
    fs.writeFileSync("deployments-core.json", JSON.stringify(deployment, null, 2));
    console.log("📁 Updated deployments-core.json");
}

main().catch(console.error);
