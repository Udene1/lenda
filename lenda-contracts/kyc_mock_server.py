import os
import time
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
from eth_account.messages import encode_defunct
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configuration
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
RPC_URL = "https://sepolia.base.org"
UID_ADDRESS = "0xCB18688d24feBB377932E703805D7B2d94fF0E13"

if not PRIVATE_KEY:
    print("ERROR: PRIVATE_KEY not found in .env")
    sys.stdout.flush()
    exit(1)

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)
print(f"Server started with Signer Address: {account.address}")
sys.stdout.flush()

# Minimal ABI to get nonces
UID_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "nonces",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    }
]

uid_contract = w3.eth.contract(address=UID_ADDRESS, abi=UID_ABI)

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "running", 
        "signer": account.address,
        "contract": UID_ADDRESS,
        "rpc": RPC_URL
    })

@app.route('/sign', methods=['POST'])
def sign_kyc():
    try:
        data = request.json
        print(f"Received request: {data}")
        sys.stdout.flush()

        raw_address = data.get('user_address')
        if not raw_address:
            return jsonify({"error": "user_address is required"}), 400
            
        user_address = Web3.to_checksum_address(raw_address)
        id_type = int(data.get('id_type', 1))
        
        # 1. Fetch current nonce from contract
        nonce = uid_contract.functions.nonces(user_address).call()
        
        # 2. Set expiry (1 hour from now)
        expires_at = int(time.time()) + 3600
        
        # 3. Create the message hash
        message_hash = Web3.solidity_keccak(
            ['address', 'uint256', 'uint256', 'uint256'],
            [user_address, id_type, expires_at, nonce]
        )
        
        # 4. Sign the hash
        encoded_message = encode_defunct(hexstr=message_hash.hex())
        signed_message = w3.eth.account.sign_message(encoded_message, private_key=PRIVATE_KEY)
        
        # Verify recovery
        recovered_signer = w3.eth.account.recover_message(encoded_message, signature=signed_message.signature)
        
        print(f"Request for: {user_address}")
        print(f"  Nonce: {nonce}")
        print(f"  ID Ty: {id_type}")
        print(f"  Expir: {expires_at}")
        print(f"  Hash : {message_hash.hex()}")
        print(f"  Recov: {recovered_signer}")
        sys.stdout.flush()
        
        return jsonify({
            "signature": "0x" + signed_message.signature.hex(),
            "expiresAt": expires_at,
            "id": id_type,
            "nonce": nonce,
            "signer": account.address
        })

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.stdout.flush()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Mock KYC Server running on http://127.0.0.1:5001")
    sys.stdout.flush()
    app.run(host='0.0.0.0', port=5001)
