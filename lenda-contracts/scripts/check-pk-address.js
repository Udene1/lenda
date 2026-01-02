const { ethers } = require("ethers");
const fs = require("fs");
const dotenv = require("dotenv");

// Load .env from current directory or parent
if (fs.existsSync(".env")) {
    dotenv.config({ path: ".env" });
}

async function main() {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        console.log("No PRIVATE_KEY found in .env");
        return;
    }

    try {
        const wallet = new ethers.Wallet(pk);
        console.log("Private Key address:", wallet.address);
    } catch (e) {
        console.log("Error parsing private key:", e.message);
    }
}

main();
