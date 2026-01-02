const { ethers } = require("hardhat");
const fs = require("fs");

// TransparentUpgradeableProxy ABI for initialization
const PROXY_ABI = [
    "constructor(address _logic, address admin_, bytes memory _data)"
];

// ProxyAdmin ABI
const PROXY_ADMIN_ABI = [
    "function getProxyImplementation(address proxy) external view returns (address)",
    "function getProxyAdmin(address proxy) external view returns (address)",
    "function changeProxyAdmin(address proxy, address newAdmin) external",
    "function upgrade(address proxy, address implementation) external",
    "function upgradeAndCall(address proxy, address implementation, bytes memory data) external payable"
];

async function deployImplementation(name, factory) {
    console.log(`   Deploying ${name} implementation...`);
    const impl = await factory.deploy();
    await impl.waitForDeployment();
    const address = await impl.getAddress();
    console.log(`   ✅ ${name} implementation: ${address}`);
    return { impl, address };
}

async function deployProxy(implAddress, proxyAdminAddress, initData) {
    // Get the TransparentUpgradeableProxy from our OZProxies wrapper
    const ProxyFactory = await ethers.getContractFactory("TransparentUpgradeableProxy");
    const proxy = await ProxyFactory.deploy(implAddress, proxyAdminAddress, initData);
    await proxy.waitForDeployment();
    return await proxy.getAddress();
}

async function main() {
    console.log("🚀 Starting Lenda Core Contracts Deployment (Manual Proxy)...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

    const deployedContracts = {};

    // 1. Deploy ProxyAdmin first (Ownable - deployer is owner by default)
    console.log("1️⃣ Deploying ProxyAdmin...");
    const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
    const proxyAdmin = await ProxyAdminFactory.deploy();  // No constructor args in v4.x
    await proxyAdmin.waitForDeployment();
    const proxyAdminAddress = await proxyAdmin.getAddress();
    console.log("   ✅ ProxyAdmin deployed to:", proxyAdminAddress);
    deployedContracts.ProxyAdmin = proxyAdminAddress;

    // 2. Deploy TranchingLogic Library
    console.log("\n2️⃣ Deploying TranchingLogic Library...");
    const TranchingLogic = await ethers.getContractFactory("TranchingLogic");
    const tranchingLogic = await TranchingLogic.deploy();
    await tranchingLogic.waitForDeployment();
    const tranchingLogicAddress = await tranchingLogic.getAddress();
    console.log("   ✅ TranchingLogic deployed to:", tranchingLogicAddress);
    deployedContracts.TranchingLogic = tranchingLogicAddress;

    // 3. Deploy GoldfinchConfig
    console.log("\n3️⃣ Deploying GoldfinchConfig...");
    const GoldfinchConfig = await ethers.getContractFactory("GoldfinchConfig");
    const { address: configImplAddress } = await deployImplementation("GoldfinchConfig", GoldfinchConfig);
    deployedContracts.GoldfinchConfigImplementation = configImplAddress;

    // Encode initialize call
    const configInitData = GoldfinchConfig.interface.encodeFunctionData("initialize", [deployer.address]);
    const configProxyAddress = await deployProxy(configImplAddress, proxyAdminAddress, configInitData);
    console.log("   ✅ GoldfinchConfig Proxy deployed to:", configProxyAddress);
    deployedContracts.GoldfinchConfig = configProxyAddress;

    // Get config contract instance at proxy address
    const config = GoldfinchConfig.attach(configProxyAddress);

    // 4. Deploy UniqueIdentity
    console.log("\n4️⃣ Deploying UniqueIdentity...");
    const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
    const { address: uidImplAddress } = await deployImplementation("UniqueIdentity", UniqueIdentity);
    deployedContracts.UniqueIdentityImplementation = uidImplAddress;

    const uidInitData = UniqueIdentity.interface.encodeFunctionData("initialize", [
        deployer.address,
        "https://lenda.finance/api/metadata/{id}"
    ]);
    const uidProxyAddress = await deployProxy(uidImplAddress, proxyAdminAddress, uidInitData);
    console.log("   ✅ UniqueIdentity Proxy deployed to:", uidProxyAddress);
    deployedContracts.UniqueIdentity = uidProxyAddress;

    // Configure Supported IDs
    const uniqueIdentity = UniqueIdentity.attach(uidProxyAddress);
    console.log("   Configuring Supported IDs...");
    for (let i = 0; i <= 4; i++) {
        await uniqueIdentity.setSupportedId(i, true);
    }
    console.log("   ✅ UniqueIdentity initialized and configured");

    // 5. Deploy Go
    console.log("\n5️⃣ Deploying Go...");
    const Go = await ethers.getContractFactory("Go");
    const { address: goImplAddress } = await deployImplementation("Go", Go);
    deployedContracts.GoImplementation = goImplAddress;

    const goInitData = Go.interface.encodeFunctionData("initialize", [
        deployer.address,
        configProxyAddress,
        uidProxyAddress
    ]);
    const goProxyAddress = await deployProxy(goImplAddress, proxyAdminAddress, goInitData);
    console.log("   ✅ Go Proxy deployed to:", goProxyAddress);
    deployedContracts.Go = goProxyAddress;

    // 6. Deploy PoolTokens
    console.log("\n6️⃣ Deploying PoolTokens...");
    const PoolTokens = await ethers.getContractFactory("PoolTokens");
    const { address: poolTokensImplAddress } = await deployImplementation("PoolTokens", PoolTokens);
    deployedContracts.PoolTokensImplementation = poolTokensImplAddress;

    const poolTokensInitData = PoolTokens.interface.encodeFunctionData("__initialize__", [
        deployer.address,
        configProxyAddress
    ]);
    const poolTokensProxyAddress = await deployProxy(poolTokensImplAddress, proxyAdminAddress, poolTokensInitData);
    console.log("   ✅ PoolTokens Proxy deployed to:", poolTokensProxyAddress);
    deployedContracts.PoolTokens = poolTokensProxyAddress;

    // 7. Deploy Fidu
    console.log("\n7️⃣ Deploying Fidu...");
    const Fidu = await ethers.getContractFactory("Fidu");
    const { address: fiduImplAddress } = await deployImplementation("Fidu", Fidu);
    deployedContracts.FiduImplementation = fiduImplAddress;

    const fiduInitData = Fidu.interface.encodeFunctionData("__initialize__", [
        deployer.address,
        "Fidu",
        "FIDU",
        configProxyAddress
    ]);
    const fiduProxyAddress = await deployProxy(fiduImplAddress, proxyAdminAddress, fiduInitData);
    console.log("   ✅ Fidu Proxy deployed to:", fiduProxyAddress);
    deployedContracts.Fidu = fiduProxyAddress;

    // 8. Deploy SeniorPool
    console.log("\n8️⃣ Deploying SeniorPool...");
    const SeniorPool = await ethers.getContractFactory("contracts/protocol/core/SeniorPool.sol:SeniorPool");
    const { address: seniorPoolImplAddress } = await deployImplementation("SeniorPool", SeniorPool);
    deployedContracts.SeniorPoolImplementation = seniorPoolImplAddress;

    const seniorPoolInitData = SeniorPool.interface.encodeFunctionData("initialize", [
        deployer.address,
        configProxyAddress
    ]);
    const seniorPoolProxyAddress = await deployProxy(seniorPoolImplAddress, proxyAdminAddress, seniorPoolInitData);
    console.log("   ✅ SeniorPool Proxy deployed to:", seniorPoolProxyAddress);
    deployedContracts.SeniorPool = seniorPoolProxyAddress;

    // 9. Deploy TranchedPool Implementation (not a proxy, used as template)
    console.log("\n9️⃣ Deploying TranchedPool Implementation...");
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

    // 10. Deploy GoldfinchFactory
    console.log("\n🔟 Deploying GoldfinchFactory...");
    const GoldfinchFactory = await ethers.getContractFactory("GoldfinchFactory");
    const { address: factoryImplAddress } = await deployImplementation("GoldfinchFactory", GoldfinchFactory);
    deployedContracts.GoldfinchFactoryImplementation = factoryImplAddress;

    const factoryInitData = GoldfinchFactory.interface.encodeFunctionData("initialize", [
        deployer.address,
        configProxyAddress
    ]);
    const factoryProxyAddress = await deployProxy(factoryImplAddress, proxyAdminAddress, factoryInitData);
    console.log("   ✅ GoldfinchFactory Proxy deployed to:", factoryProxyAddress);
    deployedContracts.GoldfinchFactory = factoryProxyAddress;

    // 11. Wire Protocol Configuration
    console.log("\n1️⃣1️⃣ Wiring Protocol Configuration...");

    // Config Indexes (from ConfigOptions.sol)
    const PoolTokensIndex = 1;
    const SeniorPoolIndex = 2;
    const TranchedPoolImplementationIndex = 5;
    const GoldfinchFactoryIndex = 6;
    const GoldfinchConfigIndex = 7;
    const TreasuryReserveIndex = 9;
    const ProtocolAdminIndex = 10;
    const GoIndex = 14;
    const FiduIndex = 16;

    console.log("   Setting addresses in Config...");
    await config.setAddress(PoolTokensIndex, poolTokensProxyAddress);
    console.log(`   SET Address ${PoolTokensIndex} -> ${poolTokensProxyAddress}`);

    await config.setAddress(SeniorPoolIndex, seniorPoolProxyAddress);
    console.log(`   SET Address ${SeniorPoolIndex} -> ${seniorPoolProxyAddress}`);

    await config.setAddress(TranchedPoolImplementationIndex, tranchedPoolImplAddress);
    console.log(`   SET Address ${TranchedPoolImplementationIndex} -> ${tranchedPoolImplAddress}`);

    await config.setAddress(GoldfinchFactoryIndex, factoryProxyAddress);
    console.log(`   SET Address ${GoldfinchFactoryIndex} -> ${factoryProxyAddress}`);

    await config.setAddress(GoldfinchConfigIndex, configProxyAddress);
    console.log(`   SET Address ${GoldfinchConfigIndex} -> ${configProxyAddress}`);

    await config.setAddress(GoIndex, goProxyAddress);
    console.log(`   SET Address ${GoIndex} -> ${goProxyAddress}`);

    await config.setAddress(FiduIndex, fiduProxyAddress);
    console.log(`   SET Address ${FiduIndex} -> ${fiduProxyAddress}`);

    // Set Treasury and Admin to deployer
    await config.setTreasuryReserve(deployer.address);
    console.log(`   SET TreasuryReserve -> ${deployer.address}`);

    await config.setTranchedPoolImplementation(tranchedPoolImplAddress);
    console.log(`   SET TranchedPoolImplementation -> ${tranchedPoolImplAddress}`);

    // Add deployer to GoList
    console.log("   Adding Deployer to GoList...");
    await config.addToGoList(deployer.address);

    // Save deployment
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

    // Print summary
    console.log("\n📄 Deployed Contract Addresses:\n");
    console.log(JSON.stringify(deployedContracts, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        fs.writeFileSync("deployment_error.log", error.toString() + "\n" + (error.stack || ""));
        process.exit(1);
    });
