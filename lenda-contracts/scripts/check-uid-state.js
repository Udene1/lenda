const { ethers } = require("hardhat");

async function main() {
    const uidProxyAddress = "0x42f07dBa4045dCe69e203728566A2f2d4DCDeAfe";
    const uid = await ethers.getContractAt("UniqueIdentity", uidProxyAddress);

    const id = 1;
    const isSupported = await uid.supportedIds(id);
    console.log(`ID ${id} supported:`, isSupported);

    if (!isSupported) {
        console.log(`Enabling ID ${id}...`);
        const tx = await uid.setSupportedID(id, true);
        await tx.wait();
        console.log(`ID ${id} enabled!`);
    }

    const SIGNER_ROLE = ethers.id("SIGNER_ROLE");
    const [deployer] = await ethers.getSigners();
    const hasSignerRole = await uid.hasRole(SIGNER_ROLE, deployer.address);
    console.log("Deployer has SIGNER_ROLE:", hasSignerRole);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
