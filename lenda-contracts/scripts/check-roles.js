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
    console.log("Deployer Address:", deployerAddress);

    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const uid = UniqueIdentity.attach(uidAddress);

    const SIGNER_ROLE = ethers.id("SIGNER_ROLE");
    const OWNER_ROLE = ethers.id("OWNER_ROLE");
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

    console.log("\n=== Checking Roles ===");
    console.log("SIGNER_ROLE Hash:", SIGNER_ROLE);
    console.log("OWNER_ROLE Hash:", OWNER_ROLE);

    const hasSignerRole = await uid.hasRole(SIGNER_ROLE, deployerAddress);
    const hasOwnerRole = await uid.hasRole(OWNER_ROLE, deployerAddress);
    const hasAdminRole = await uid.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress);

    console.log("\n=== Deployer Role Status ===");
    console.log("Has SIGNER_ROLE:", hasSignerRole);
    console.log("Has OWNER_ROLE:", hasOwnerRole);
    console.log("Has DEFAULT_ADMIN_ROLE:", hasAdminRole);

    const signerRoleAdmin = await uid.getRoleAdmin(SIGNER_ROLE);
    console.log("\nSIGNER_ROLE admin is:", signerRoleAdmin);
    console.log("Is SIGNER_ROLE admin = OWNER_ROLE?", signerRoleAdmin === OWNER_ROLE);
    console.log("Is SIGNER_ROLE admin = DEFAULT_ADMIN?", signerRoleAdmin === DEFAULT_ADMIN_ROLE);

    // Check supported IDs
    console.log("\n=== Checking Supported ID Types ===");
    for (let i = 0; i <= 5; i++) {
        const supported = await uid.supportedIds(i);
        console.log(`ID ${i} supported:`, supported);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
