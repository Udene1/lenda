const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const configAddress = deployment.contracts.GoldfinchConfig;

    const config = await ethers.getContractAt("GoldfinchConfig", configAddress);

    // MonthlyScheduleRepo is index 25
    const repoAddress = await config.getAddress(25);
    console.log("MonthlyScheduleRepo Address:", repoAddress);

    const factoryAddress = deployment.contracts.GoldfinchFactory;
    const factory = await ethers.getContractAt("GoldfinchFactory", factoryAddress);

    // Check BORROWER_ROLE
    const BORROWER_ROLE = await factory.BORROWER_ROLE();
    console.log("BORROWER_ROLE:", BORROWER_ROLE);
}

main().catch(console.error);
