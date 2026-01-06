const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const deployment = JSON.parse(fs.readFileSync("deployments-core.json", "utf8"));
    const configAddress = deployment.contracts.GoldfinchConfig;
    const config = await ethers.getContractAt("GoldfinchConfig", configAddress);

    console.log("Config Address:", configAddress);

    try {
        const owner = await config.hasRole(ethers.ZeroHash, "0x18E167204a25B13EFc0c4a6D312eA96de846F729");
        console.log("Deployer has DEFAULT_ADMIN_ROLE:", owner);

        const ownerRole = await config.OWNER_ROLE();
        const hasOwnerRole = await config.hasRole(ownerRole, "0x18E167204a25B13EFc0c4a6D312eA96de846F729");
        console.log("Deployer has OWNER_ROLE:", hasOwnerRole);
    } catch (e) {
        console.log("Error checking roles:", e.message);
    }

    // Try reading addresses[12] (PoolTokens)
    try {
        const addr12 = await config.addresses(12);
        console.log("Raw addresses[12]:", addr12);
    } catch (e) {
        console.log("Error reading addresses[12]:", e.message);
    }
}

main().catch(console.error);
