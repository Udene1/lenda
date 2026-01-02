const { ethers } = require("hardhat");

async function main() {
    const proxyAddress = "0x42f07dBa4045dCe69e203728566A2f2d4DCDeAfe";
    // EIP-1967 admin slot
    const adminSlot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

    console.log("Checking admin for proxy:", proxyAddress);

    const adminValue = await ethers.provider.getStorage(proxyAddress, adminSlot);
    const adminAddress = ethers.getAddress("0x" + adminValue.slice(26));

    console.log("Actual Admin Address (from storage):", adminAddress);

    const configuredProxyAdmin = "0xe3446305AAbf414C80956F72f184aA1ecB4c3494";
    console.log("Configured ProxyAdmin in deployments-core.json:", configuredProxyAdmin);

    if (adminAddress.toLowerCase() === configuredProxyAdmin.toLowerCase()) {
        console.log("✅ Admin match!");
    } else {
        console.log("❌ Admin mismatch!");
    }

    const proxyAdmin = await ethers.getContractAt("ProxyAdmin", configuredProxyAdmin);
    const owner = await proxyAdmin.owner();
    console.log("ProxyAdmin Owner:", owner);

    const [deployer] = await ethers.getSigners();
    console.log("Deployer Address:", deployer.address);
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        console.log("✅ Deployer is ProxyAdmin owner!");
    } else {
        console.log("❌ Deployer is NOT ProxyAdmin owner!");
    }

    const newImplAddress = "0x338824dAc45981726263e21a066450fD7437fCF0";
    const code = await ethers.provider.getCode(newImplAddress);
    console.log("New Implementation code length:", code.length);
    if (code === "0x") {
        console.log("❌ New Implementation has NO code!");
    } else {
        console.log("✅ New Implementation has code.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
