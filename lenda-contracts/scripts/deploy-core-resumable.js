const { ethers } = require("hardhat");
const fs = require("fs");

const CHECKPOINT_FILE = "deployment-checkpoint.json";

// Load checkpoint or create new one
function loadCheckpoint() {
    if (fs.existsSync(CHECKPOINT_FILE)) {
        return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
    }
    return { step: 0, contracts: {} };
}

function saveCheckpoint(checkpoint) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

async function deployImplementation(name, factory) {
    console.log(`   Deploying ${name} implementation...`);
    const impl = await factory.deploy();
    await impl.waitForDeployment();
    const address = await impl.getAddress();
    console.log(`   ✅ ${name} implementation: ${address}`);
    return { impl, address };
}

async function deployProxy(implAddress, proxyAdminAddress, initData) {
    const ProxyFactory = await ethers.getContractFactory("TransparentUpgradeableProxy");
    const proxy = await ProxyFactory.deploy(implAddress, proxyAdminAddress, initData);
    await proxy.waitForDeployment();
    return await proxy.getAddress();
}

async function main() {
    console.log("🚀 Starting Lenda Core Contracts Deployment (RESUMABLE)...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

    // Load checkpoint
    let checkpoint = loadCheckpoint();
    console.log(`📍 Resuming from step ${checkpoint.step}\n`);

    const contracts = checkpoint.contracts;

    try {
        // STEP 1: ProxyAdmin
        if (checkpoint.step < 1) {
            console.log("1️⃣ Deploying ProxyAdmin...");
            const ProxyAdminFactory = await ethers.getContractFactory("ProxyAdmin");
            const proxyAdmin = await ProxyAdminFactory.deploy();
            await proxyAdmin.waitForDeployment();
            contracts.ProxyAdmin = await proxyAdmin.getAddress();
            console.log("   ✅ ProxyAdmin:", contracts.ProxyAdmin);
            checkpoint.step = 1;
            saveCheckpoint(checkpoint);
        } else {
            console.log("1️⃣ ProxyAdmin already deployed:", contracts.ProxyAdmin);
        }

        // STEP 2: TranchingLogic
        if (checkpoint.step < 2) {
            console.log("\n2️⃣ Deploying TranchingLogic...");
            const TranchingLogic = await ethers.getContractFactory("TranchingLogic");
            const tranchingLogic = await TranchingLogic.deploy();
            await tranchingLogic.waitForDeployment();
            contracts.TranchingLogic = await tranchingLogic.getAddress();
            console.log("   ✅ TranchingLogic:", contracts.TranchingLogic);
            checkpoint.step = 2;
            saveCheckpoint(checkpoint);
        } else {
            console.log("2️⃣ TranchingLogic already deployed:", contracts.TranchingLogic);
        }

        // STEP 3: GoldfinchConfig
        if (checkpoint.step < 3) {
            console.log("\n3️⃣ Deploying GoldfinchConfig...");
            const GoldfinchConfig = await ethers.getContractFactory("GoldfinchConfig");
            const { address: implAddr } = await deployImplementation("GoldfinchConfig", GoldfinchConfig);
            contracts.GoldfinchConfigImplementation = implAddr;

            const initData = GoldfinchConfig.interface.encodeFunctionData("initialize", [deployer.address]);
            contracts.GoldfinchConfig = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ GoldfinchConfig Proxy:", contracts.GoldfinchConfig);
            checkpoint.step = 3;
            saveCheckpoint(checkpoint);
        } else {
            console.log("3️⃣ GoldfinchConfig already deployed:", contracts.GoldfinchConfig);
        }

        // STEP 4: UniqueIdentity
        if (checkpoint.step < 4) {
            console.log("\n4️⃣ Deploying UniqueIdentity...");
            const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
            const { address: implAddr } = await deployImplementation("UniqueIdentity", UniqueIdentity);
            contracts.UniqueIdentityImplementation = implAddr;

            const initData = UniqueIdentity.interface.encodeFunctionData("initialize", [
                deployer.address,
                "https://lenda.finance/api/metadata/{id}"
            ]);
            contracts.UniqueIdentity = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ UniqueIdentity Proxy:", contracts.UniqueIdentity);

            // Configure IDs
            const uid = UniqueIdentity.attach(contracts.UniqueIdentity);
            console.log("   Configuring Supported IDs...");
            for (let i = 0; i <= 4; i++) {
                await uid.setSupportedId(i, true);
            }
            console.log("   ✅ UniqueIdentity configured");
            checkpoint.step = 4;
            saveCheckpoint(checkpoint);
        } else {
            console.log("4️⃣ UniqueIdentity already deployed:", contracts.UniqueIdentity);
        }

        // STEP 5: Go
        if (checkpoint.step < 5) {
            console.log("\n5️⃣ Deploying Go...");
            const Go = await ethers.getContractFactory("Go");
            const { address: implAddr } = await deployImplementation("Go", Go);
            contracts.GoImplementation = implAddr;

            const initData = Go.interface.encodeFunctionData("initialize", [
                deployer.address,
                contracts.GoldfinchConfig,
                contracts.UniqueIdentity
            ]);
            contracts.Go = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ Go Proxy:", contracts.Go);
            checkpoint.step = 5;
            saveCheckpoint(checkpoint);
        } else {
            console.log("5️⃣ Go already deployed:", contracts.Go);
        }

        // STEP 6: PoolTokens
        if (checkpoint.step < 6) {
            console.log("\n6️⃣ Deploying PoolTokens...");
            const PoolTokens = await ethers.getContractFactory("PoolTokens");
            const { address: implAddr } = await deployImplementation("PoolTokens", PoolTokens);
            contracts.PoolTokensImplementation = implAddr;

            const initData = PoolTokens.interface.encodeFunctionData("__initialize__", [
                deployer.address,
                contracts.GoldfinchConfig
            ]);
            contracts.PoolTokens = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ PoolTokens Proxy:", contracts.PoolTokens);
            checkpoint.step = 6;
            saveCheckpoint(checkpoint);
        } else {
            console.log("6️⃣ PoolTokens already deployed:", contracts.PoolTokens);
        }

        // STEP 7: Fidu
        if (checkpoint.step < 7) {
            console.log("\n7️⃣ Deploying Fidu...");
            const Fidu = await ethers.getContractFactory("Fidu");
            const { address: implAddr } = await deployImplementation("Fidu", Fidu);
            contracts.FiduImplementation = implAddr;

            const initData = Fidu.interface.encodeFunctionData("__initialize__", [
                deployer.address,
                "Fidu",
                "FIDU",
                contracts.GoldfinchConfig
            ]);
            contracts.Fidu = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ Fidu Proxy:", contracts.Fidu);
            checkpoint.step = 7;
            saveCheckpoint(checkpoint);
        } else {
            console.log("7️⃣ Fidu already deployed:", contracts.Fidu);
        }

        // STEP 8: Accountant Library + SeniorPool
        if (checkpoint.step < 8) {
            console.log("\n8️⃣ Deploying Accountant + SeniorPool...");

            // First deploy Accountant library
            console.log("   Deploying Accountant library...");
            const Accountant = await ethers.getContractFactory("Accountant");
            const accountant = await Accountant.deploy();
            await accountant.waitForDeployment();
            contracts.Accountant = await accountant.getAddress();
            console.log("   ✅ Accountant library:", contracts.Accountant);

            // Now deploy SeniorPool with linked Accountant library
            const SeniorPool = await ethers.getContractFactory("contracts/protocol/core/SeniorPool.sol:SeniorPool", {
                libraries: { Accountant: contracts.Accountant }
            });
            const { address: implAddr } = await deployImplementation("SeniorPool", SeniorPool);
            contracts.SeniorPoolImplementation = implAddr;

            const initData = SeniorPool.interface.encodeFunctionData("initialize", [
                deployer.address,
                contracts.GoldfinchConfig
            ]);
            contracts.SeniorPool = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ SeniorPool Proxy:", contracts.SeniorPool);
            checkpoint.step = 8;
            saveCheckpoint(checkpoint);
        } else {
            console.log("8️⃣ SeniorPool already deployed:", contracts.SeniorPool);
        }

        // STEP 9: TranchedPool Implementation
        if (checkpoint.step < 9) {
            console.log("\n9️⃣ Deploying TranchedPool Implementation...");
            const TranchedPool = await ethers.getContractFactory("TranchedPool", {
                libraries: { TranchingLogic: contracts.TranchingLogic }
            });
            const impl = await TranchedPool.deploy();
            await impl.waitForDeployment();
            contracts.TranchedPoolImplementation = await impl.getAddress();
            console.log("   ✅ TranchedPool Implementation:", contracts.TranchedPoolImplementation);
            checkpoint.step = 9;
            saveCheckpoint(checkpoint);
        } else {
            console.log("9️⃣ TranchedPool already deployed:", contracts.TranchedPoolImplementation);
        }

        // STEP 10: GoldfinchFactory
        if (checkpoint.step < 10) {
            console.log("\n🔟 Deploying GoldfinchFactory...");
            const GoldfinchFactory = await ethers.getContractFactory("GoldfinchFactory");
            const { address: implAddr } = await deployImplementation("GoldfinchFactory", GoldfinchFactory);
            contracts.GoldfinchFactoryImplementation = implAddr;

            const initData = GoldfinchFactory.interface.encodeFunctionData("initialize", [
                deployer.address,
                contracts.GoldfinchConfig
            ]);
            contracts.GoldfinchFactory = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ GoldfinchFactory Proxy:", contracts.GoldfinchFactory);
            checkpoint.step = 10;
            saveCheckpoint(checkpoint);
        } else {
            console.log("🔟 GoldfinchFactory already deployed:", contracts.GoldfinchFactory);
        }

        // STEP 11: Wire Configuration
        if (checkpoint.step < 11) {
            console.log("\n1️⃣1️⃣ Wiring Protocol Configuration...");
            const GoldfinchConfig = await ethers.getContractFactory("GoldfinchConfig");
            const config = GoldfinchConfig.attach(contracts.GoldfinchConfig);

            // Config Indexes
            const indexes = {
                PoolTokens: 1,
                SeniorPool: 2,
                TranchedPoolImplementation: 5,
                GoldfinchFactory: 6,
                GoldfinchConfig: 7,
                Go: 14,
                Fidu: 16
            };

            console.log("   Setting addresses...");
            await config.setAddress(indexes.PoolTokens, contracts.PoolTokens);
            await config.setAddress(indexes.SeniorPool, contracts.SeniorPool);
            await config.setAddress(indexes.TranchedPoolImplementation, contracts.TranchedPoolImplementation);
            await config.setAddress(indexes.GoldfinchFactory, contracts.GoldfinchFactory);
            await config.setAddress(indexes.GoldfinchConfig, contracts.GoldfinchConfig);
            await config.setAddress(indexes.Go, contracts.Go);
            await config.setAddress(indexes.Fidu, contracts.Fidu);

            await config.setTreasuryReserve(deployer.address);
            await config.setTranchedPoolImplementation(contracts.TranchedPoolImplementation);
            await config.addToGoList(deployer.address);

            console.log("   ✅ Configuration complete");
            checkpoint.step = 11;
            saveCheckpoint(checkpoint);
        } else {
            console.log("1️⃣1️⃣ Configuration already done");
        }

        // DONE!
        console.log("\n" + "=".repeat(50));
        console.log("🎉 CORE DEPLOYMENT COMPLETE!");
        console.log("=".repeat(50));

        const deploymentData = {
            network: "base-sepolia",
            chainId: 84532,
            deployer: deployer.address,
            deployedAt: new Date().toISOString(),
            contracts: contracts
        };

        fs.writeFileSync("deployments-core.json", JSON.stringify(deploymentData, null, 2));
        console.log("📁 Saved to deployments-core.json");
        console.log("\n📄 Deployed Contracts:\n");
        console.log(JSON.stringify(contracts, null, 2));

        // Clean up checkpoint
        fs.unlinkSync(CHECKPOINT_FILE);
        console.log("\n✅ Checkpoint file removed");

    } catch (error) {
        console.error("\n❌ Deployment failed at step " + checkpoint.step + ":", error.message);
        console.log("💡 Run this script again to resume from step " + checkpoint.step);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
