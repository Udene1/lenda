const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const deploymentsPath = path.join(__dirname, "..", "deployments-lenda-final.json");
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    const addresses = deployments.contracts;

    const [deployer] = await ethers.getSigners();
    console.log("Simulating with account:", deployer.address);

    const usdc = await ethers.getContractAt("IERC20withDec", addresses.USDC);
    const factory = await ethers.getContractAt("LendaFactory", addresses.LendaFactory);
    const seniorPool = await ethers.getContractAt("SeniorPool", addresses.SeniorPool);
    const scheduleRepo = await ethers.getContractAt("MonthlyScheduleRepo", addresses.MonthlyScheduleRepo);
    const go = await ethers.getContractAt("Go", addresses.Go);
    const config = await ethers.getContractAt("LendaConfig", addresses.LendaConfig);

    // 0. Ensure ReserveDenominator is set (to avoid division by zero in pay)
    console.log("Checking protocol parameters...");
    const RESERVE_DENOMINATOR_INDEX = 3;
    const reserveDenominator = await config.numbers(RESERVE_DENOMINATOR_INDEX);
    if (reserveDenominator == 0n) {
        console.log("Setting ReserveDenominator to 10 (10% reserve fee)...");
        await (await config.setNumber(RESERVE_DENOMINATOR_INDEX, 10)).wait();
    }
    console.log("Checking if Senior Pool is go-listed...");
    const ZAPPER_ROLE = ethers.id("ZAPPER_ROLE");
    const isZapper = await go.hasRole(ZAPPER_ROLE, addresses.SeniorPool);
    if (!isZapper) {
        console.log("Granting ZAPPER_ROLE to Senior Pool...");
        await (await go.grantRole(ZAPPER_ROLE, addresses.SeniorPool)).wait();
        console.log("ZAPPER_ROLE granted.");
    } else {
        console.log("Senior Pool is already a Zapper.");
    }

    // 0. Ensure Senior Pool has USDC to invest
    console.log("Funding Senior Pool...");
    const mockUsdc = await ethers.getContractAt("MockUSDC", addresses.USDC);
    const fundAmount = ethers.parseUnits("10000", 6); // $10,000
    console.log("Minting USDC for simulation...");
    await (await mockUsdc.mint(deployer.address, fundAmount + ethers.parseUnits("2000", 6))).wait();

    console.log("Depositing $10,000 into Senior Pool to provide liquidity...");
    await (await usdc.approve(addresses.SeniorPool, fundAmount)).wait();
    await (await seniorPool.deposit(fundAmount)).wait();
    console.log("Senior Pool funded.");

    // 1. Create a Schedule (12 months, monthly interest, bullets principal at end)
    console.log("Creating schedule...");
    const tx0 = await scheduleRepo.createSchedule(12, 12, 1, 0);
    const receipt0 = await tx0.wait();

    // The Schedule address will be returned from the transaction (it's not an event but we can find it)
    // Actually MonthlyScheduleRepo returns it in its createSchedule function.
    // In ethers v6 we can use staticCall to get the return value if it's not a view.
    const scheduleAddress = await scheduleRepo.createSchedule.staticCall(12, 12, 1, 0);
    console.log("Schedule address (predicted):", scheduleAddress);

    // Ensure it's created
    await (await scheduleRepo.createSchedule(12, 12, 1, 0)).wait();

    const schedule = scheduleAddress;
    console.log("Schedule confirmed at:", schedule);

    // 2. Create a TranchedPool
    console.log("Creating Tranched Pool...");
    const limit = ethers.parseUnits("5000", 6); // $5,000
    const interestApr = ethers.parseUnits("0.12", 18); // 12%
    const tx1 = await factory.createPool(
        deployer.address,
        20, // 20% junior fee
        limit,
        interestApr,
        schedule,
        ethers.parseUnits("0.02", 18), // 2% late fee
        0, // fundable now
        [0], // ID_TYPE_0
        false
    );
    const receipt = await tx1.wait();

    // Find PoolCreated event
    const poolCreatedTopic = factory.interface.getEvent("PoolCreated").topicHash;
    const log = receipt.logs.find(l => l.topics[0] === poolCreatedTopic);
    const parsedLog = factory.interface.parseLog(log);
    const poolAddress = parsedLog.args.pool;
    console.log("Tranched Pool created at:", poolAddress);

    const pool = await ethers.getContractAt("TranchedPool", poolAddress);

    // 3. Deposit into Junior Tranche (Backer)
    const juniorAmount = ethers.parseUnits("1000", 6); // $1,000
    console.log("Approving USDC for Junior deposit...");
    await (await usdc.approve(poolAddress, juniorAmount)).wait();
    console.log("Depositing into Junior Tranche...");
    await (await pool.deposit(2, juniorAmount)).wait(); // Tranche 2 is Junior

    // 4. Lock Junior Capital
    console.log("Locking Junior Capital...");
    try {
        await (await pool.lockJuniorCapital()).wait();
        console.log("Junior Capital locked.");
    } catch (e) {
        console.log("Junior Capital might already be locked or failed:", e.message);
    }

    // 5. Senior Pool Invests
    console.log("Senior Pool investing...");
    await (await seniorPool.invest(poolAddress)).wait();
    console.log("Senior Pool invested.");

    // 6. Lock Pool and Drawdown
    console.log("Checking if pool is locked...");
    const seniorTrancheAfter = await pool.getTranche(1);
    if (seniorTrancheAfter.lockedUntil == 0n) {
        console.log("Locking pool...");
        try {
            await (await pool.lockPool()).wait();
            console.log("Pool locked.");
        } catch (e) {
            console.log("Locking pool failed:", e.message);
        }
    } else {
        console.log("Pool already locked.");
    }

    const juniorDeposits = await pool.totalJuniorDeposits();
    const seniorTrancheFinal = await pool.getTranche(1);
    const seniorDeposits = seniorTrancheFinal.principalDeposited;

    console.log("Junior Deposits:", ethers.formatUnits(juniorDeposits, 6));
    console.log("Senior Deposits:", ethers.formatUnits(seniorDeposits, 6));

    const totalDeposits = juniorDeposits + seniorDeposits;
    if (totalDeposits > 0n) {
        console.log("Borrower drawing down full amount...");
        await (await pool.drawdown(totalDeposits)).wait();
        console.log("Drawdown complete.");

        // 7. Simulate Repayment of Interest
        const repaymentAmount = ethers.parseUnits("1", 6); // Just pay $1
        console.log("Approving USDC for repayment...");
        await (await usdc.approve(poolAddress, repaymentAmount)).wait();

        const oldSharePrice = await seniorPool.sharePrice();
        console.log("Senior Pool Share Price before (raw):", oldSharePrice.toString());

        console.log("Paying a small amount to complete the lifecycle...");
        await (await pool["pay(uint256)"](repaymentAmount)).wait();
        console.log("Payment processed.");

        // 8. Redeem Senior Pool's share
        const poolTokensAddress = addresses.PoolTokens;
        const poolTokens = await ethers.getContractAt("contracts/interfaces/IPoolTokens.sol:IPoolTokens", poolTokensAddress);
        const seniorPoolTokenBalance = await poolTokens.balanceOf(addresses.SeniorPool);
        if (seniorPoolTokenBalance > 0n) {
            const tokenId = await poolTokens.tokenOfOwnerByIndex(addresses.SeniorPool, seniorPoolTokenBalance - 1n);
            console.log("Redeeming Senior Pool token:", tokenId.toString());
            await (await seniorPool.redeem(tokenId)).wait();
            console.log("Redemption complete.");
        }
    }
    else {
        console.log("No deposits found, skipping drawdown.");
    }

    console.log("\nSimulation complete! Check your Portfolio page now.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
