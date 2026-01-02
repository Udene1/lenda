const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const deploymentPath = "./deployments-core.json";
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ deployments-core.json not found!");
        process.exit(1);
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const uidAddress = deploymentData.contracts.UniqueIdentity;
    const deployerAddress = deploymentData.deployer;

    console.log("UniqueIdentity Address:", uidAddress);
    console.log("Deployer Address (Signer):", deployerAddress);

    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const uid = UniqueIdentity.attach(uidAddress);

    const SIGNER_ROLE = ethers.id("SIGNER_ROLE");
    const OWNER_ROLE = ethers.id("OWNER_ROLE");
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

    console.log("SIGNER_ROLE Hash:", SIGNER_ROLE);

    const hasOwnerRole = await uid.hasRole(OWNER_ROLE, deployerAddress);
    const hasAdminRole = await uid.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress);
    const signerAdminRole = await uid.getRoleAdmin(SIGNER_ROLE);

    console.log("Deployer has OWNER_ROLE:", hasOwnerRole);
    console.log("Deployer has DEFAULT_ADMIN_ROLE:", hasAdminRole);
    console.log("SIGNER_ROLE Admin Role:", signerAdminRole);

    console.log("\nGranting SIGNER_ROLE to deployer using setupSigner()...");
    try {
        // Use setupSigner() which sets SIGNER_ROLE admin to OWNER_ROLE and grants the role
        const tx = await uid.setupSigner(deployerAddress);
        console.log("   Transaction hash:", tx.hash);
        await tx.wait();
        console.log("✅ SIGNER_ROLE granted successfully via setupSigner!");
    } catch (e) {
        console.error("❌ setupSigner failed:", e.message);
        if (e.data) console.error("   Error data:", e.data);
    }

    const hasRole = await uid.hasRole(SIGNER_ROLE, deployerAddress);
    console.log("   Role check:", hasRole);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
