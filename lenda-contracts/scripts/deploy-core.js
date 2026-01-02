const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Starting Lenda Core Contracts Deployment...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const deployedContracts = {};

    // 1. Deploy TranchingLogic Library
    console.log("\n1️⃣ Deploying TranchingLogic Library...");
    const TranchingLogic = await ethers.getContractFactory("TranchingLogic");
    const tranchingLogic = await TranchingLogic.deploy();
    await tranchingLogic.waitForDeployment();
    const tranchingLogicAddress = await tranchingLogic.getAddress();
    console.log("   ✅ TranchingLogic deployed to:", tranchingLogicAddress);
    deployedContracts.TranchingLogic = tranchingLogicAddress;

    // 2. Deploy GoldfinchConfig (Proxy)
    console.log("\n2️⃣ Deploying GoldfinchConfig (Proxy)...");
    const GoldfinchConfig = await ethers.getContractFactory("GoldfinchConfig");
    const config = await upgrades.deployProxy(GoldfinchConfig, [deployer.address], {
        kind: 'transparent',
        unsafeAllow: ['delegatecall', 'constructor', 'state-variable-immutable', 'state-variable-assignment', 'missing-initializer'],
        unsafeSkipStorageCheck: true
    });
    await config.waitForDeployment();
    const configAddress = await config.getAddress();
    console.log("   ✅ GoldfinchConfig Proxy deployed to:", configAddress);
    deployedContracts.GoldfinchConfig = configAddress;

    // 3. Deploy UniqueIdentity (Proxy)
    console.log("\n3️⃣ Deploying UniqueIdentity (Proxy)...");
    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const uniqueIdentity = await upgrades.deployProxy(UniqueIdentity, [deployer.address, "https://lenda.finance/api/metadata/{id}"], {
        kind: 'transparent',
        unsafeAllow: ['delegatecall', 'constructor', 'state-variable-immutable', 'state-variable-assignment', 'missing-initializer'],
        unsafeSkipStorageCheck: true
    });
    await uniqueIdentity.waitForDeployment();
    const uniqueIdentityAddress = await uniqueIdentity.getAddress();
    console.log("   ✅ UniqueIdentity Proxy deployed to:", uniqueIdentityAddress);
    deployedContracts.UniqueIdentity = uniqueIdentityAddress;

    // Configure Supported IDs
    console.log("   Configuring Supported IDs...");
    for (let i = 0; i <= 4; i++) {
        await uniqueIdentity.setSupportedId(i, true);
    }
    console.log("   ✅ UniqueIdentity initialized and configured");

    // 4. Deploy Go (Proxy)
    console.log("\n4️⃣ Deploying Go (Proxy)...");
    const Go = await ethers.getContractFactory("Go");
    const go = await upgrades.deployProxy(Go, [deployer.address, configAddress, uniqueIdentityAddress], {
        kind: 'transparent',
        unsafeAllow: ['delegatecall', 'constructor', 'state-variable-immutable', 'state-variable-assignment', 'missing-initializer'],
        unsafeSkipStorageCheck: true
    });
    await go.waitForDeployment();
    const goAddress = await go.getAddress();
    console.log("   ✅ Go Proxy deployed to:", goAddress);
    deployedContracts.Go = goAddress;

    // Implement Zapper Role for Go (Allows Go to check ID balances)
    // UniqueIdentity checks? Actually Go checks UID, UID is passive.
    // However, Go contracts often need specific roles on other contracts in complex setups, 
    // but here Go just reads from UID.


    // 5. Deploy PoolTokens (Proxy)
    console.log("\n5️⃣ Deploying PoolTokens (Proxy)...");
    const PoolTokens = await ethers.getContractFactory("PoolTokens");
    // PoolTokens initialize takes (owner, config)
    const poolTokens = await upgrades.deployProxy(PoolTokens, [deployer.address, configAddress], {
        kind: 'transparent',
        unsafeAllow: ['delegatecall', 'constructor', 'state-variable-immutable', 'state-variable-assignment', 'missing-initializer'],
        unsafeSkipStorageCheck: true
    });
    await poolTokens.waitForDeployment();
    const poolTokensAddress = await poolTokens.getAddress();
    console.log("   ✅ PoolTokens Proxy deployed to:", poolTokensAddress);
    deployedContracts.PoolTokens = poolTokensAddress;

    // 6. Deploy SeniorPool (Proxy)
    console.log("\n6️⃣ Deploying SeniorPool (Proxy)...");
    const SeniorPool = await ethers.getContractFactory("SeniorPool");
    // SeniorPool initialize takes (owner, config)
    const seniorPool = await upgrades.deployProxy(SeniorPool, [deployer.address, configAddress], {
        kind: 'transparent',
        unsafeAllow: ['delegatecall', 'constructor', 'state-variable-immutable', 'state-variable-assignment', 'missing-initializer'],
        unsafeSkipStorageCheck: true
    });
    await seniorPool.waitForDeployment();
    const seniorPoolAddress = await seniorPool.getAddress();
    console.log("   ✅ SeniorPool Proxy deployed to:", seniorPoolAddress);
    deployedContracts.SeniorPool = seniorPoolAddress;

    // 7. Deploy Fidu (Proxy)
    console.log("\n7️⃣ Deploying Fidu (Proxy)...");
    const Fidu = await ethers.getContractFactory("Fidu");
    // Fidu initialize takes (owner, name, symbol, config)
    const fidu = await upgrades.deployProxy(Fidu, [deployer.address, "Fidu", "FIDU", configAddress], {
        kind: 'transparent',
        unsafeAllow: ['delegatecall', 'constructor', 'state-variable-immutable', 'state-variable-assignment', 'missing-initializer'],
        unsafeSkipStorageCheck: true
    });
    await fidu.waitForDeployment();
    const fiduAddress = await fidu.getAddress();
    console.log("   ✅ Fidu Proxy deployed to:", fiduAddress);
    deployedContracts.Fidu = fiduAddress;

    // 8. Deploy TranchedPool Implementation (Direct Deployment)
    // TranchedPool is NOT a proxy itself (it IS the implementation for clones), so we deploy it normally.
    console.log("\n8️⃣ Deploying TranchedPool Implementation...");
    const TranchedPool = await ethers.getContractFactory("TranchedPool", {
        libraries: {
            TranchingLogic: tranchingLogicAddress,
        },
    });
    const tranchedPoolImpl = await TranchedPool.deploy();
    await tranchedPoolImpl.waitForDeployment();
    const tranchedPoolImplAddress = await tranchedPoolImpl.getAddress();
    console.log("   ✅ TranchedPool Implementation deployed to:", tranchedPoolImplAddress);
    deployedContracts.TranchedPoolImplementation = tranchedPoolImplAddress;

    // 9. Deploy GoldfinchFactory (Proxy)
    console.log("\n9️⃣ Deploying GoldfinchFactory (Proxy)...");
    const GoldfinchFactory = await ethers.getContractFactory("GoldfinchFactory");
    // GoldfinchFactory initialize takes (owner, config)
    const factory = await upgrades.deployProxy(GoldfinchFactory, [deployer.address, configAddress], {
        kind: 'transparent',
        unsafeAllow: ['delegatecall', 'constructor', 'state-variable-immutable', 'state-variable-assignment', 'missing-initializer'],
        unsafeSkipStorageCheck: true
    });
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("   ✅ GoldfinchFactory Proxy deployed to:", factoryAddress);
    deployedContracts.GoldfinchFactory = factoryAddress;


    // 10. Wiring Everything Together
    console.log("\n🔟 Wiring Protocol Configuration...");

    const setAddr = async (index, addr) => {
        // Prevent setting 0 address if deployment failed (safety check)
        if (!addr) {
            console.error(`Error: Address for index ${index} is undefined!`);
            return;
        }
        console.log(`   SET Address ${index} -> ${addr}`);
        await config.setAddress(index, addr);
    };

    // Config Indexes (from ConfigOptions.sol)
    const PoolAddressIndex = 0;
    const PoolTokensIndex = 1;
    const SeniorPoolIndex = 2;
    const SeniorPoolStrategyIndex = 3;
    const CreditLineImplementationIndex = 4;
    const TranchedPoolImplementationIndex = 5;
    const GoldfinchFactoryIndex = 6;
    const GoldfinchConfigIndex = 7;
    const BorrowerImplementationIndex = 8;
    const TreasuryReserveIndex = 9;
    const ProtocolAdminIndex = 10;
    const OneInchIndex = 11;
    // ... others
    const GoIndex = 14;
    const StakingRewardsIndex = 15;
    const FiduIndex = 16;

    console.log("   Setting addresses in Config...");
    await setAddr(PoolTokensIndex, poolTokensAddress);
    await setAddr(SeniorPoolIndex, seniorPoolAddress);
    await setAddr(TranchedPoolImplementationIndex, tranchedPoolImplAddress); // Using impl as trusted?
    await setAddr(GoldfinchFactoryIndex, factoryAddress);
    await setAddr(GoldfinchConfigIndex, configAddress);
    await setAddr(GoIndex, goAddress);
    await setAddr(FiduIndex, fiduAddress);

    // Set Treasury to Deployer for now
    await setAddr(TreasuryReserveIndex, deployer.address);
    // Set Protocol Admin to Deployer
    await setAddr(ProtocolAdminIndex, deployer.address);

    // Also set specific setters if needed (some are redundant but safe)
    await config.setTreasuryReserve(deployer.address);
    await config.setTranchedPoolImplementation(tranchedPoolImplAddress);

    // Initial GO Listing
    console.log("   Adding Deployer to GoList...");
    await config.addToGoList(deployer.address);

    // Save final deployment
    console.log("\n" + "=".repeat(50));
    console.log("🎉 CORE DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));

    const deploymentData = {
        network: "base-sepolia",
        chainId: 84532,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        contracts: deployedContracts
    };

    fs.writeFileSync(
        "deployments-core.json",
        JSON.stringify(deploymentData, null, 2)
    );
    console.log("📁 Saved to deployments-core.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        fs.writeFileSync("deployment_error.log", error.toString() + "\n" + (error.stack || ""));
        process.exit(1);
    });
