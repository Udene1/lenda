const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("Checking upgrades plugin...");
    if (upgrades) {
        console.log("✅ Upgrades plugin is defined");
        console.log("Keys:", Object.keys(upgrades));
    } else {
        console.error("❌ Upgrades plugin is UNDEFINED");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
