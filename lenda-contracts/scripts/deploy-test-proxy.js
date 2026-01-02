const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("TEST: Deploying GoldfinchConfig Proxy...");
    try {
        const GoldfinchConfig = await ethers.getContractFactory("GoldfinchConfig");
        console.log("Factory obtained.");

        // Attempt deployment
        const config = await upgrades.deployProxy(GoldfinchConfig, [], {
            initializer: 'initialize(address)',
            unsafeAllow: ['delegatecall', 'constructor'] // Just in case, broadly allow for testing
        });

        console.log("deployProxy called. Waiting for deployment...");
        await config.waitForDeployment();

        console.log("✅ SUCCESS! Deployed to:", await config.getAddress());

    } catch (error) {
        console.error("❌ FAILURE!");
        console.error("Error Message:", error.message);
        console.error("Full Error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Fatal Script Error:", error);
        process.exit(1);
    });
