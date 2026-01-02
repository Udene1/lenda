const { ethers } = require("hardhat");

async function main() {
    const uidProxyAddress = "0x42f07dBa4045dCe69e203728566A2f2d4DCDeAfe";
    const deployerAddress = "0x18E167204a25B13EFc0c4a6D312eA96de846F729";

    const uid = await ethers.getContractAt("UniqueIdentity", uidProxyAddress);

    const SIGNER_ROLE = ethers.id("SIGNER_ROLE");
    const OWNER_ROLE = ethers.id("OWNER_ROLE");
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

    console.log("Checking roles for address:", deployerAddress);
    console.log("Has SIGNER_ROLE:", await uid.hasRole(SIGNER_ROLE, deployerAddress));
    console.log("Has OWNER_ROLE:", await uid.hasRole(OWNER_ROLE, deployerAddress));
    console.log("Has DEFAULT_ADMIN_ROLE:", await uid.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress));

    const admin = await uid.getRoleAdmin(SIGNER_ROLE);
    console.log("SIGNER_ROLE admin:", admin);
    console.log("OWNER_ROLE hash :", OWNER_ROLE);

    if (admin === OWNER_ROLE) {
        console.log("Admin matches OWNER_ROLE. Attempting grantRole...");
        try {
            const tx = await uid.grantRole(SIGNER_ROLE, deployerAddress);
            await tx.wait();
            console.log("✅ grantRole successful!");
            console.log("New SIGNER_ROLE status:", await uid.hasRole(SIGNER_ROLE, deployerAddress));
        } catch (e) {
            console.log("❌ grantRole failed:", e.message);
        }
    } else {
        console.log("❌ Admin DOES NOT match OWNER_ROLE. Still at DEFAULT_ADMIN?");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
