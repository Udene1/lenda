const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Load deployment data
    const deploymentPath = "./deployments-core.json";
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    const proxyAdminAddress = deploymentData.contracts.ProxyAdmin;
    const uidProxyAddress = deploymentData.contracts.UniqueIdentity;
    const oldImplAddress = deploymentData.contracts.UniqueIdentityImplementation;

    console.log("\n=== Upgrading UniqueIdentity ===");
    console.log("Proxy:", uidProxyAddress);
    console.log("ProxyAdmin:", proxyAdminAddress);
    console.log("Old Implementation:", oldImplAddress);

    // 1. Deploy new implementation with fixed initialize
    console.log("\n1. Deploying new UniqueIdentity implementation...");
    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const newImpl = await UniqueIdentity.deploy();
    await newImpl.waitForDeployment();
    const newImplAddress = await newImpl.getAddress();
    console.log("   New Implementation:", newImplAddress);

    // 2. Upgrade via ProxyAdmin
    console.log("\n2. Upgrading proxy to new implementation...");
    const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
    const proxyAdmin = ProxyAdmin.attach(proxyAdminAddress);

    // Try simple upgrade first
    const upgradeTx = await proxyAdmin.upgrade(uidProxyAddress, newImplAddress);
    await upgradeTx.wait();
    console.log("   ✅ Proxy upgraded!");

    // 3. Call setupSigner to fix the role admin and grant SIGNER_ROLE
    console.log("\n3. Calling setupSigner to grant SIGNER_ROLE...");
    const uid = UniqueIdentity.attach(uidProxyAddress);

    const setupTx = await uid.setupSigner(deployer.address);
    await setupTx.wait();
    console.log("   ✅ setupSigner completed!");

    // 4. Verify
    console.log("\n4. Verifying roles...");
    const SIGNER_ROLE = ethers.id("SIGNER_ROLE");
    const OWNER_ROLE = ethers.id("OWNER_ROLE");
    const hasSignerRole = await uid.hasRole(SIGNER_ROLE, deployer.address);
    const hasOwnerRole = await uid.hasRole(OWNER_ROLE, deployer.address);
    const signerRoleAdmin = await uid.getRoleAdmin(SIGNER_ROLE);

    console.log("   Has SIGNER_ROLE:", hasSignerRole);
    console.log("   Has OWNER_ROLE:", hasOwnerRole);
    console.log("   SIGNER_ROLE admin:", signerRoleAdmin);
    console.log("   (Should be OWNER_ROLE):", signerRoleAdmin === OWNER_ROLE);

    // 5. Update deployment file
    deploymentData.contracts.UniqueIdentityImplementation = newImplAddress;
    deploymentData.contracts.UniqueIdentityOldImplementation = oldImplAddress;
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
    console.log("\n✅ Updated deployments-core.json");

    console.log("\n=== Summary ===");
    console.log("Proxy (unchanged):", uidProxyAddress);
    console.log("New Implementation:", newImplAddress);
    console.log("SIGNER_ROLE granted:", hasSignerRole);
    console.log("\n🎉 Upgrade complete! No address changes needed.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
