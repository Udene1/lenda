const { ethers } = require("hardhat");

async function main() {
    const user = "0x18E167204a25B13EFc0c4a6D312eA96de846F729";
    const id = 1;
    const expiresAt = 1735732800; // Example timestamp
    const nonce = 0;

    console.log("Values:");
    console.log("  User:", user);
    console.log("  ID:", id);
    console.log("  ExpiresAt:", expiresAt);
    console.log("  Nonce:", nonce);

    //abi.encodePacked(user, id, expiresAt, nonce)
    const packed = ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256"],
        [user, id, expiresAt, nonce]
    );
    const hash = ethers.keccak256(packed);
    console.log("\nSolidity Hash (structHash):", hash);

    const ethPrefixedHash = ethers.hashMessage(ethers.getBytes(hash));
    console.log("Eth Prefixed Hash (for recovery):", ethPrefixedHash);
}

main().catch(console.error);
