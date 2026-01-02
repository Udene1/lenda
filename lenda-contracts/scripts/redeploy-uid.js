const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Load existing deployment data
    const deploymentPath = "./deployments-core.json";
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ deployments-core.json not found!");
        process.exit(1);
    }
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    console.log("\n=== Redeploying UniqueIdentity ===");
    console.log("Old address:", deploymentData.contracts.UniqueIdentity);

    // Deploy new UniqueIdentity with fixed initialization
    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const uid = await upgrades.deployProxy(
        UniqueIdentity,
        [deployer.address, "https://lenda.finance/uid/{id}.json"],
        {
            initializer: "initialize",
            kind: "transparent",
            unsafeAllow: ["missing-initializer-call", "incorrect-initializer-order"]
        }
    );
    await uid.waitForDeployment();
    const uidAddress = await uid.getAddress();
    console.log("✅ New UniqueIdentity deployed at:", uidAddress);

    // Enable supported ID types (0-4 like before)
    console.log("\n=== Setting up supported ID types ===");
    for (let i = 0; i <= 4; i++) {
        const tx = await uid.setSupportedId(i, true);
        await tx.wait();
        console.log(`   ID ${i} enabled`);
    }

    // Grant SIGNER_ROLE to deployer
    console.log("\n=== Granting SIGNER_ROLE ===");
    const SIGNER_ROLE = ethers.id("SIGNER_ROLE");
    const tx = await uid.grantRole(SIGNER_ROLE, deployer.address);
    await tx.wait();
    console.log("✅ SIGNER_ROLE granted to deployer");

    // Verify roles
    console.log("\n=== Verifying Roles ===");
    const hasSignerRole = await uid.hasRole(SIGNER_ROLE, deployer.address);
    const hasOwnerRole = await uid.hasRole(ethers.id("OWNER_ROLE"), deployer.address);
    console.log("Deployer has SIGNER_ROLE:", hasSignerRole);
    console.log("Deployer has OWNER_ROLE:", hasOwnerRole);

    // Update Go contract to point to new UniqueIdentity
    console.log("\n=== Updating Go contract ===");
    const goAddress = deploymentData.contracts.Go;
    const Go = await ethers.getContractFactory("Go");
    const go = Go.attach(goAddress);

    try {
        const setUidTx = await go.setUniqueIdentity(uidAddress);
        await setUidTx.wait();
        console.log("✅ Go contract updated with new UniqueIdentity address");
    } catch (e) {
        console.log("⚠️  Could not update Go contract (may need manual update):", e.message);
    }

    // Update GoldfinchConfig with new UniqueIdentity address
    console.log("\n=== Updating GoldfinchConfig ===");
    const configAddress = deploymentData.contracts.GoldfinchConfig;
    const GoldfinchConfig = await ethers.getContractFactory("GoldfinchConfig");
    const config = GoldfinchConfig.attach(configAddress);

    try {
        // ConfigOptions.Addresses.UniqueIdentity = 12
        const configTx = await config.setAddress(12, uidAddress);
        await configTx.wait();
        console.log("✅ GoldfinchConfig updated with new UniqueIdentity address");
    } catch (e) {
        console.log("⚠️  Could not update GoldfinchConfig:", e.message);
    }

    // Update deployment file
    deploymentData.contracts.UniqueIdentity = uidAddress;
    deploymentData.contracts.UniqueIdentity_old = deploymentData.contracts.UniqueIdentity;
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log("\n✅ Updated deployments-core.json");

    console.log("\n=== Summary ===");
    console.log("New UniqueIdentity:", uidAddress);
    console.log("SIGNER_ROLE granted:", hasSignerRole);
    console.log("\n🎉 Redeployment complete!");
    console.log("\n⚠️  Remember to update frontend address in:");
    console.log("   lenda-frontend/src/lib/contracts/addresses.ts");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
