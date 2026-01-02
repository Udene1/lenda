const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting Lenda Contracts Deployment to Base Sepolia...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH\n");

    if (balance === 0n) {
        throw new Error("Deployer has no ETH! Get testnet ETH from faucet.");
    }

    const deployedContracts = {};

    // ============ Deploy LendaToken ============
    console.log("1️⃣ Deploying LendaToken...");
    const LendaToken = await ethers.getContractFactory("LendaToken");
    const lendaToken = await LendaToken.deploy(deployer.address);
    await lendaToken.waitForDeployment();
    const lendaTokenAddress = await lendaToken.getAddress();
    console.log("   ✅ LendaToken deployed to:", lendaTokenAddress);
    deployedContracts.LendaToken = lendaTokenAddress;

    // ============ Deploy LendaRewards ============
    console.log("\n2️⃣ Deploying LendaRewards...");
    const LendaRewards = await ethers.getContractFactory("LendaRewards");
    const lendaRewards = await LendaRewards.deploy(lendaTokenAddress, deployer.address);
    await lendaRewards.waitForDeployment();
    const lendaRewardsAddress = await lendaRewards.getAddress();
    console.log("   ✅ LendaRewards deployed to:", lendaRewardsAddress);
    deployedContracts.LendaRewards = lendaRewardsAddress;

    // ============ Deploy BorrowerProfile ============
    console.log("\n3️⃣ Deploying BorrowerProfile...");
    const BorrowerProfile = await ethers.getContractFactory("BorrowerProfile");
    const borrowerProfile = await BorrowerProfile.deploy(deployer.address);
    await borrowerProfile.waitForDeployment();
    const borrowerProfileAddress = await borrowerProfile.getAddress();
    console.log("   ✅ BorrowerProfile deployed to:", borrowerProfileAddress);
    deployedContracts.BorrowerProfile = borrowerProfileAddress;

    // ============ Summary ============
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("\n📄 Deployed Contract Addresses:\n");
    console.log(JSON.stringify(deployedContracts, null, 2));
    console.log("\n🔗 View on Basescan:");
    console.log(`   LendaToken: https://sepolia.basescan.org/address/${lendaTokenAddress}`);
    console.log(`   LendaRewards: https://sepolia.basescan.org/address/${lendaRewardsAddress}`);
    console.log(`   BorrowerProfile: https://sepolia.basescan.org/address/${borrowerProfileAddress}`);

    // Save addresses to file
    const fs = require("fs");
    const deploymentData = {
        network: "base-sepolia",
        chainId: 84532,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        contracts: deployedContracts
    };

    fs.writeFileSync(
        "deployments-base-sepolia.json",
        JSON.stringify(deploymentData, null, 2)
    );
    console.log("\n📁 Deployment addresses saved to deployments-base-sepolia.json");

    return deployedContracts;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });
