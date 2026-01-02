const { ethers } = require("hardhat");
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

    console.log("\n=== Redeploying UniqueIdentity (Manual Proxy) ===");
    console.log("Old address:", deploymentData.contracts.UniqueIdentity);

    // 1. Deploy implementation
    console.log("\n1. Deploying UniqueIdentity implementation...");
    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const uidImpl = await UniqueIdentity.deploy();
    await uidImpl.waitForDeployment();
    const implAddress = await uidImpl.getAddress();
    console.log("   Implementation:", implAddress);

    // 2. Deploy TransparentUpgradeableProxy
    console.log("\n2. Deploying TransparentUpgradeableProxy...");
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const proxyAdmin = await ProxyAdmin.deploy(deployer.address);
    await proxyAdmin.waitForDeployment();
    const proxyAdminAddress = await proxyAdmin.getAddress();
    console.log("   ProxyAdmin:", proxyAdminAddress);

    // Encode initialize call
    const initData = UniqueIdentity.interface.encodeFunctionData("initialize", [
        deployer.address,
        "https://lenda.finance/uid/{id}.json"
    ]);

    const TUP = await ethers.getContractFactory("TransparentUpgradeableProxy");
    const proxy = await TUP.deploy(implAddress, proxyAdminAddress, initData);
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    console.log("   Proxy:", proxyAddress);

    // 3. Interact with proxy as UniqueIdentity
    console.log("\n3. Setting up UniqueIdentity...");
    const uid = UniqueIdentity.attach(proxyAddress);

    // Enable supported ID types (0-4)
    console.log("   Enabling supported ID types...");
    for (let i = 0; i <= 4; i++) {
        const tx = await uid.setSupportedId(i, true);
        await tx.wait();
        console.log(`      ID ${i} enabled`);
    }

    // 4. Grant SIGNER_ROLE to deployer
    console.log("\n4. Granting SIGNER_ROLE...");
    const SIGNER_ROLE = ethers.id("SIGNER_ROLE");
    const tx = await uid.grantRole(SIGNER_ROLE, deployer.address);
    await tx.wait();
    console.log("   ✅ SIGNER_ROLE granted to deployer");

    // 5. Verify roles
    console.log("\n5. Verifying Roles...");
    const hasSignerRole = await uid.hasRole(SIGNER_ROLE, deployer.address);
    const hasOwnerRole = await uid.hasRole(ethers.id("OWNER_ROLE"), deployer.address);
    const hasDefaultAdmin = await uid.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", deployer.address);
    console.log("   Has SIGNER_ROLE:", hasSignerRole);
    console.log("   Has OWNER_ROLE:", hasOwnerRole);
    console.log("   Has DEFAULT_ADMIN_ROLE:", hasDefaultAdmin);

    // 6. Update Go contract
    console.log("\n6. Updating Go contract...");
    try {
        const goAddress = deploymentData.contracts.Go;
        const Go = await ethers.getContractFactory("Go");
        const go = Go.attach(goAddress);
        const setUidTx = await go.setUniqueIdentity(proxyAddress);
        await setUidTx.wait();
        console.log("   ✅ Go contract updated");
    } catch (e) {
        console.log("   ⚠️  Could not update Go:", e.message);
    }

    // 7. Update GoldfinchConfig
    console.log("\n7. Updating GoldfinchConfig...");
    try {
        const configAddress = deploymentData.contracts.GoldfinchConfig;
        const GoldfinchConfig = await ethers.getContractFactory("GoldfinchConfig");
        const config = GoldfinchConfig.attach(configAddress);
        const configTx = await config.setAddress(12, proxyAddress); // 12 = UniqueIdentity
        await configTx.wait();
        console.log("   ✅ GoldfinchConfig updated");
    } catch (e) {
        console.log("   ⚠️  Could not update Config:", e.message);
    }

    // 8. Save deployment
    const oldUid = deploymentData.contracts.UniqueIdentity;
    deploymentData.contracts.UniqueIdentity = proxyAddress;
    deploymentData.contracts.UniqueIdentity_old = oldUid;
    deploymentData.contracts.UniqueIdentity_ProxyAdmin = proxyAdminAddress;
    deploymentData.contracts.UniqueIdentity_Implementation = implAddress;
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log("\n✅ Updated deployments-core.json");

    console.log("\n=== Summary ===");
    console.log("New UniqueIdentity Proxy:", proxyAddress);
    console.log("Implementation:", implAddress);
    console.log("ProxyAdmin:", proxyAdminAddress);
    console.log("SIGNER_ROLE granted:", hasSignerRole);

    console.log("\n🎉 Redeployment complete!");
    console.log("\n⚠️  Update frontend address:");
    console.log(`   UNIQUE_IDENTITY_ADDRESS = "${proxyAddress}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
