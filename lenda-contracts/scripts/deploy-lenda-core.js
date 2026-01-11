const { ethers } = require("hardhat");
const fs = require("fs");

const CHECKPOINT_FILE = "deployment-checkpoint-lenda.json";

// LendaConfigOptions.Addresses enum indices
const ADDRESS_INDEXES = {
    CreditLineImplementation: 1,
    LendaFactory: 2,
    Fidu: 4,
    USDC: 5,
    TreasuryReserve: 6,
    ProtocolAdmin: 7,
    LendaConfig: 11,
    PoolTokens: 12,
    TranchedPoolImplementation: 13,
    SeniorPool: 14,
    SeniorPoolStrategy: 15,
    Go: 19,
    BackerRewards: 20,
    StakingRewards: 21,
    TranchedPoolImplementationRepository: 23,
    WithdrawalRequestToken: 24,
    MonthlyScheduleRepo: 25,
    CallableLoanImplementationRepository: 26,
    GFI: 18,
    BorrowerProfile: 27,
    LendaRewards: 28,
    LendaMetadataRegistry: 29
};

const NUMBERS_INDEXES = {
    LeverageRatio: 9
};

function loadCheckpoint() {
    if (fs.existsSync(CHECKPOINT_FILE)) {
        return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
    }
    return { step: 0, contracts: {} };
}

function saveCheckpoint(checkpoint) {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

async function deployImplementation(name, factory, ...args) {
    console.log(`   Deploying ${name} implementation...`);
    const impl = await factory.deploy(...args);
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
    console.log("\n🚀 Starting Lenda Core Protocol Deployment...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployer:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

    let checkpoint = loadCheckpoint();
    console.log(`📍 Current step: ${checkpoint.step}\n`);

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
        }

        // STEP 2: Libraries
        if (checkpoint.step < 2) {
            console.log("\n2️⃣ Deploying Libraries...");
            const TranchingLogic = await ethers.getContractFactory("TranchingLogic");
            const tranchingLogic = await TranchingLogic.deploy();
            await tranchingLogic.waitForDeployment();
            contracts.TranchingLogic = await tranchingLogic.getAddress();
            console.log("   ✅ TranchingLogic:", contracts.TranchingLogic);

            const Accountant = await ethers.getContractFactory("Accountant");
            const accountant = await Accountant.deploy();
            await accountant.waitForDeployment();
            contracts.Accountant = await accountant.getAddress();
            console.log("   ✅ Accountant:", contracts.Accountant);
            checkpoint.step = 2;
            saveCheckpoint(checkpoint);
        }

        // STEP 3: LendaConfig
        if (checkpoint.step < 3) {
            console.log("\n3️⃣ Deploying LendaConfig...");
            const LendaConfig = await ethers.getContractFactory("LendaConfig");
            const { address: implAddr } = await deployImplementation("LendaConfig", LendaConfig);
            contracts.LendaConfigImplementation = implAddr;

            const initData = LendaConfig.interface.encodeFunctionData("initialize", [deployer.address]);
            contracts.LendaConfig = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ LendaConfig Proxy:", contracts.LendaConfig);
            checkpoint.step = 3;
            saveCheckpoint(checkpoint);
        }

        // STEP 4: USDC
        if (checkpoint.step < 4) {
            console.log("\n4️⃣ Ensuring USDC...");
            if (!contracts.USDC) {
                const MockUSDC = await ethers.getContractFactory("MockUSDC");
                const usdc = await MockUSDC.deploy();
                await usdc.waitForDeployment();
                contracts.USDC = await usdc.getAddress();
                console.log("   ✅ MockUSDC deployed:", contracts.USDC);
            } else {
                console.log("   ✅ USDC already set:", contracts.USDC);
            }
            checkpoint.step = 4;
            saveCheckpoint(checkpoint);
        }

        // STEP 5: UniqueIdentity
        if (checkpoint.step < 5) {
            console.log("\n5️⃣ Deploying UniqueIdentity...");
            const UniqueIdentity = await ethers.getContractFactory("UniqueIdentity");
            const { address: implAddr } = await deployImplementation("UniqueIdentity", UniqueIdentity);
            contracts.UniqueIdentityImplementation = implAddr;

            const initData = UniqueIdentity.interface.encodeFunctionData("initialize", [
                deployer.address,
                "https://lenda.finance/api/metadata/{id}"
            ]);
            contracts.UniqueIdentity = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ UniqueIdentity Proxy:", contracts.UniqueIdentity);

            const uid = UniqueIdentity.attach(contracts.UniqueIdentity);
            console.log("   Granting SIGNER_ROLE to deployer...");
            const SIGNER_ROLE = await uid.SIGNER_ROLE();
            await (await uid.grantRole(SIGNER_ROLE, deployer.address)).wait();

            console.log("   Configuring ID types 0-4...");
            for (let i = 0; i <= 4; i++) {
                await (await uid.setSupportedId(i, true)).wait();
            }
            checkpoint.step = 5;
            saveCheckpoint(checkpoint);
        }

        // STEP 6: Go
        if (checkpoint.step < 6) {
            console.log("\n6️⃣ Deploying Go...");
            const Go = await ethers.getContractFactory("Go");
            const { address: implAddr } = await deployImplementation("Go", Go);
            contracts.GoImplementation = implAddr;

            const initData = Go.interface.encodeFunctionData("initialize", [
                deployer.address,
                contracts.LendaConfig,
                contracts.UniqueIdentity
            ]);
            contracts.Go = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ Go Proxy:", contracts.Go);
            checkpoint.step = 6;
            saveCheckpoint(checkpoint);
        }

        // STEP 7: PoolTokens
        if (checkpoint.step < 7) {
            console.log("\n7️⃣ Deploying PoolTokens...");
            const PoolTokens = await ethers.getContractFactory("PoolTokens");
            const { address: implAddr } = await deployImplementation("PoolTokens", PoolTokens);
            contracts.PoolTokensImplementation = implAddr;

            const initData = PoolTokens.interface.encodeFunctionData("__initialize__", [
                deployer.address,
                contracts.LendaConfig
            ]);
            contracts.PoolTokens = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ PoolTokens Proxy:", contracts.PoolTokens);
            checkpoint.step = 7;
            saveCheckpoint(checkpoint);
        }

        // STEP 8: WithdrawalRequestToken
        if (checkpoint.step < 8) {
            console.log("\n8️⃣ Deploying WithdrawalRequestToken...");
            const WithdrawalRequestToken = await ethers.getContractFactory("WithdrawalRequestToken");
            const { address: implAddr } = await deployImplementation("WithdrawalRequestToken", WithdrawalRequestToken);
            contracts.WithdrawalRequestTokenImplementation = implAddr;

            const initData = WithdrawalRequestToken.interface.encodeFunctionData("__initialize__", [
                deployer.address,
                contracts.LendaConfig
            ]);
            contracts.WithdrawalRequestToken = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ WithdrawalRequestToken Proxy:", contracts.WithdrawalRequestToken);
            checkpoint.step = 8;
            saveCheckpoint(checkpoint);
        }

        // STEP 9: BackerRewards
        if (checkpoint.step < 9) {
            console.log("\n9️⃣ Deploying BackerRewards...");
            const BackerRewards = await ethers.getContractFactory("BackerRewards");
            const { address: implAddr } = await deployImplementation("BackerRewards", BackerRewards);
            contracts.BackerRewardsImplementation = implAddr;

            const initData = BackerRewards.interface.encodeFunctionData("__initialize__", [
                deployer.address,
                contracts.LendaConfig
            ]);
            contracts.BackerRewards = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ BackerRewards Proxy:", contracts.BackerRewards);
            checkpoint.step = 9;
            saveCheckpoint(checkpoint);
        }

        // STEP 10: Fidu
        if (checkpoint.step < 10) {
            console.log("\n🔟 Deploying Fidu...");
            const Fidu = await ethers.getContractFactory("Fidu");
            const { address: implAddr } = await deployImplementation("Fidu", Fidu);
            contracts.FiduImplementation = implAddr;

            const initData = Fidu.interface.encodeFunctionData("__initialize__", [
                deployer.address,
                "Lenda FIDU",
                "FIDU",
                contracts.LendaConfig
            ]);
            contracts.Fidu = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ Fidu Proxy:", contracts.Fidu);
            checkpoint.step = 10;
            saveCheckpoint(checkpoint);
        }

        // STEP 11: SeniorPool
        if (checkpoint.step < 11) {
            console.log("\n1️⃣1️⃣ Deploying SeniorPool...");
            const SeniorPool = await ethers.getContractFactory("SeniorPool", {
                libraries: { Accountant: contracts.Accountant }
            });
            const { address: implAddr } = await deployImplementation("SeniorPool", SeniorPool);
            contracts.SeniorPoolImplementation = implAddr;

            const initData = SeniorPool.interface.encodeFunctionData("initialize", [
                deployer.address,
                contracts.LendaConfig
            ]);
            contracts.SeniorPool = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ SeniorPool Proxy:", contracts.SeniorPool);
            checkpoint.step = 11;
            saveCheckpoint(checkpoint);
        }

        // STEP 12: LendaFactory
        if (checkpoint.step < 12) {
            console.log("\n1️⃣2️⃣ Deploying LendaFactory...");
            const LendaFactory = await ethers.getContractFactory("LendaFactory");
            const { address: implAddr } = await deployImplementation("LendaFactory", LendaFactory);
            contracts.LendaFactoryImplementation = implAddr;

            const initData = LendaFactory.interface.encodeFunctionData("initialize", [
                deployer.address,
                contracts.LendaConfig
            ]);
            contracts.LendaFactory = await deployProxy(implAddr, contracts.ProxyAdmin, initData);
            console.log("   ✅ LendaFactory Proxy:", contracts.LendaFactory);
            checkpoint.step = 12;
            saveCheckpoint(checkpoint);
        }

        // STEP 13: Repositories & Implementations
        if (checkpoint.step < 13) {
            console.log("\n1️⃣3️⃣ Deploying Repositories & Implementations...");

            const MonthlyScheduleRepo = await ethers.getContractFactory("MonthlyScheduleRepo");
            const monthlyScheduleRepo = await MonthlyScheduleRepo.deploy();
            await monthlyScheduleRepo.waitForDeployment();
            contracts.MonthlyScheduleRepo = await monthlyScheduleRepo.getAddress();
            console.log("   ✅ MonthlyScheduleRepo:", contracts.MonthlyScheduleRepo);

            const CreditLine = await ethers.getContractFactory("CreditLine", {
                libraries: { Accountant: contracts.Accountant }
            });
            const clImpl = await CreditLine.deploy();
            await clImpl.waitForDeployment();
            contracts.CreditLineImplementation = await clImpl.getAddress();
            console.log("   ✅ CreditLine Implementation:", contracts.CreditLineImplementation);

            const TranchedPool = await ethers.getContractFactory("TranchedPool", {
                libraries: { TranchingLogic: contracts.TranchingLogic }
            });
            const tpImpl = await TranchedPool.deploy();
            await tpImpl.waitForDeployment();
            contracts.TranchedPoolImplementation = await tpImpl.getAddress();
            console.log("   ✅ TranchedPool Implementation:", contracts.TranchedPoolImplementation);

            const TPRepo = await ethers.getContractFactory("TranchedPoolImplementationRepository");
            const tpRepo = await TPRepo.deploy();
            await tpRepo.waitForDeployment();
            // Initialize TPRepo
            await (await tpRepo.initialize(deployer.address, contracts.TranchedPoolImplementation)).wait();
            contracts.TranchedPoolImplementationRepository = await tpRepo.getAddress();
            console.log("   ✅ TranchedPoolImplementationRepository:", contracts.TranchedPoolImplementationRepository);

            const Strategy = await ethers.getContractFactory("FixedLeverageRatioStrategy");
            const { address: strategyImplAddr } = await deployImplementation("FixedLeverageRatioStrategy", Strategy);
            const strategyInitData = Strategy.interface.encodeFunctionData("initialize", [deployer.address, contracts.LendaConfig]);
            contracts.SeniorPoolStrategy = await deployProxy(strategyImplAddr, contracts.ProxyAdmin, strategyInitData);
            console.log("   ✅ SeniorPoolStrategy Proxy:", contracts.SeniorPoolStrategy);

            checkpoint.step = 13;
            saveCheckpoint(checkpoint);
        }

        // STEP 14: Wiring LendaConfig
        if (checkpoint.step < 14) {
            console.log("\n1️⃣4️⃣ Wiring LendaConfig...");
            const LendaConfig = await ethers.getContractFactory("LendaConfig");
            const config = LendaConfig.attach(contracts.LendaConfig);

            const mappings = [
                [ADDRESS_INDEXES.USDC, contracts.USDC],
                [ADDRESS_INDEXES.Fidu, contracts.Fidu],
                [ADDRESS_INDEXES.SeniorPool, contracts.SeniorPool],
                [ADDRESS_INDEXES.PoolTokens, contracts.PoolTokens],
                [ADDRESS_INDEXES.LendaFactory, contracts.LendaFactory],
                [ADDRESS_INDEXES.Go, contracts.Go],
                [ADDRESS_INDEXES.WithdrawalRequestToken, contracts.WithdrawalRequestToken],
                [ADDRESS_INDEXES.MonthlyScheduleRepo, contracts.MonthlyScheduleRepo],
                [ADDRESS_INDEXES.TranchedPoolImplementationRepository, contracts.TranchedPoolImplementationRepository],
                [ADDRESS_INDEXES.TranchedPoolImplementation, contracts.TranchedPoolImplementation],
                [ADDRESS_INDEXES.CreditLineImplementation, contracts.CreditLineImplementation],
                [ADDRESS_INDEXES.SeniorPoolStrategy, contracts.SeniorPoolStrategy],
                [ADDRESS_INDEXES.BackerRewards, contracts.BackerRewards],
                [ADDRESS_INDEXES.LendaConfig, contracts.LendaConfig],
                [ADDRESS_INDEXES.TreasuryReserve, deployer.address],
                [ADDRESS_INDEXES.ProtocolAdmin, deployer.address]
            ];

            for (const [idx, addr] of mappings) {
                console.log(`   Setting address at index ${idx} to ${addr}...`);
                await (await config.setAddress(idx, addr)).wait();
            }

            console.log("   Setting LeverageRatio to 4x...");
            await (await config.setNumber(NUMBERS_INDEXES.LeverageRatio, ethers.parseUnits("4", 18))).wait();

            checkpoint.step = 14;
            saveCheckpoint(checkpoint);
        }

        // STEP 15: Roles & Minter Permissions
        if (checkpoint.step < 15) {
            console.log("\n1️⃣5️⃣ Configuring Roles...");

            const Fidu = await ethers.getContractFactory("Fidu");
            const fidu = Fidu.attach(contracts.Fidu);
            const MINTER_ROLE = await fidu.MINTER_ROLE();
            console.log("   Granting SeniorPool MINTER_ROLE on Fidu...");
            await (await fidu.grantRole(MINTER_ROLE, contracts.SeniorPool)).wait();

            const PoolTokens = await ethers.getContractFactory("PoolTokens");
            const poolTokens = PoolTokens.attach(contracts.PoolTokens);
            console.log("   Granting deployer MINTER_ROLE on PoolTokens (for initial testing)...");
            await (await poolTokens.grantRole(MINTER_ROLE, deployer.address)).wait();

            const LendaFactory = await ethers.getContractFactory("LendaFactory");
            const factory = LendaFactory.attach(contracts.LendaFactory);
            const BORROWER_ROLE = await factory.BORROWER_ROLE();
            console.log("   Granting deployer BORROWER_ROLE on LendaFactory...");
            await (await factory.grantRole(BORROWER_ROLE, deployer.address)).wait();

            const LendaConfig = await ethers.getContractFactory("LendaConfig");
            const config = LendaConfig.attach(contracts.LendaConfig);
            console.log("   Adding deployer to Go List...");
            await (await config.addToGoList(deployer.address)).wait();

            checkpoint.step = 15;
            saveCheckpoint(checkpoint);
        }

        // STEP 16: Initialize SeniorPool Epochs
        if (checkpoint.step < 16) {
            console.log("\n1️⃣6️⃣ Initializing SeniorPool Epochs...");
            const SeniorPool = await ethers.getContractFactory("SeniorPool", {
                libraries: { Accountant: contracts.Accountant }
            });
            const seniorPool = SeniorPool.attach(contracts.SeniorPool);
            await (await seniorPool.initializeEpochs()).wait();
            console.log("   ✅ Epochs initialized");
            checkpoint.step = 16;
            saveCheckpoint(checkpoint);
        }

        // STEP 17: Peripheral Lenda Contracts
        if (checkpoint.step < 17) {
            console.log("\n1️⃣7️⃣ Deploying Peripheral Contracts...");

            const LendaToken = await ethers.getContractFactory("LendaToken");
            const lendaToken = await LendaToken.deploy(deployer.address);
            await lendaToken.waitForDeployment();
            contracts.LendaToken = await lendaToken.getAddress();
            console.log("   ✅ LendaToken:", contracts.LendaToken);

            const LendaRewards = await ethers.getContractFactory("LendaRewards");
            const lendaRewards = await LendaRewards.deploy(contracts.LendaToken, deployer.address);
            await lendaRewards.waitForDeployment();
            contracts.LendaRewards = await lendaRewards.getAddress();
            console.log("   ✅ LendaRewards:", contracts.LendaRewards);

            const BorrowerProfile = await ethers.getContractFactory("BorrowerProfile");
            const borrowerProfile = await BorrowerProfile.deploy(deployer.address);
            await borrowerProfile.waitForDeployment();
            contracts.BorrowerProfile = await borrowerProfile.getAddress();
            console.log("   ✅ BorrowerProfile:", contracts.BorrowerProfile);

            const LendaMetadataRegistry = await ethers.getContractFactory("LendaMetadataRegistry");
            const lendaMetadataRegistry = await LendaMetadataRegistry.deploy();
            await lendaMetadataRegistry.waitForDeployment();
            contracts.LendaMetadataRegistry = await lendaMetadataRegistry.getAddress();
            console.log("   ✅ LendaMetadataRegistry:", contracts.LendaMetadataRegistry);

            console.log("   Updating LendaConfig with peripheral addresses...");
            const LendaConfig = await ethers.getContractFactory("LendaConfig");
            const config = LendaConfig.attach(contracts.LendaConfig);

            const periphMappings = [
                [ADDRESS_INDEXES.GFI, contracts.LendaToken],
                [ADDRESS_INDEXES.LendaRewards, contracts.LendaRewards],
                [ADDRESS_INDEXES.BorrowerProfile, contracts.BorrowerProfile],
                [ADDRESS_INDEXES.LendaMetadataRegistry, contracts.LendaMetadataRegistry]
            ];

            for (const [idx, addr] of periphMappings) {
                console.log(`   Setting peripheral address at index ${idx} to ${addr}...`);
                await (await config.setAddress(idx, addr)).wait();
            }

            checkpoint.step = 17;
            saveCheckpoint(checkpoint);
        }

        // FINISHED!
        console.log("\n" + "=".repeat(60));
        console.log("🎉 LENDA CORE DEPLOYMENT COMPLETE!");
        console.log("=".repeat(60));

        const finalData = {
            network: "base-sepolia",
            deployer: deployer.address,
            deployedAt: new Date().toISOString(),
            contracts: contracts
        };
        fs.writeFileSync("deployments-lenda-final.json", JSON.stringify(finalData, null, 2));
        console.log("📁 Final deployment data saved to deployments-lenda-final.json");

        if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);

    } catch (e) {
        console.error("\n❌ Deployment failed at step " + checkpoint.step + ":");
        console.error(e);
        process.exit(1);
    }
}

main().catch(console.error);
