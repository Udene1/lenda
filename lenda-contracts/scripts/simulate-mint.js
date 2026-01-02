const { ethers, network } = require("hardhat");
const axios = require("axios");

async function main() {
    const userAddress = "0x18E167204a25B13EFc0c4a6D312eA96de846F729"; // User to mint for

    // Impersonate the user for simulation
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [userAddress],
    });
    const userSigner = await ethers.getSigner(userAddress);

    const uidProxyAddress = "0x42f07dBa4045dCe69e203728566A2f2d4DCDeAfe";

    console.log("Fetching signature from mock server...");
    const response = await axios.post("http://127.0.0.1:5001/sign", {
        user_address: userAddress,
        id_type: 1
    });

    const { signature, expiresAt, id } = response.data;
    console.log("Received Signature:", signature);
    console.log("ExpiresAt:", expiresAt);
    console.log("ID:", id);

    const uid = await ethers.getContractAt("UniqueIdentity", uidProxyAddress);

    console.log("\nSimulating mint call...");
    try {
        // Use staticCall to simulate and get revert reason
        await uid.connect(userSigner).mint.staticCall(id, expiresAt, signature);
        console.log("✅ Simulation SUCCESS!");
    } catch (error) {
        console.log("❌ Simulation FAILED!");
        if (error.data) {
            const decodedError = uid.interface.parseError(error.data);
            console.log("Revert Reason (decoded):", decodedError ? decodedError.name : error.data);
        } else {
            console.log("Error Message:", error.message);
        }

        // Try to get more info via callStatic
        try {
            await uid.mint(id, expiresAt, signature);
        } catch (e) {
            console.log("\nDetailed Error Info:");
            console.log(e);
        }
    }
}

main().catch(console.error);
