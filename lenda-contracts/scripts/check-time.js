const { ethers } = require("hardhat");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const block = await provider.getBlock("latest");
    const blockTime = block.timestamp;
    const localTime = Math.floor(Date.now() / 1000);

    console.log("Block Time (Base Sepolia):", blockTime);
    console.log("Local Machine Time:      ", localTime);
    console.log("Difference (seconds):   ", blockTime - localTime);

    if (Math.abs(blockTime - localTime) > 300) {
        console.log("WARNING: Time difference > 5 minutes!");
    }
}

main().catch(console.error);
