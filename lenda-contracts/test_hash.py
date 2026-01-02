from web3 import Web3
from eth_account.messages import encode_defunct

user = "0x18E167204a25B13EFc0c4a6D312eA96de846F729"
id = 1
expiresAt = 1735732800
nonce = 0

# solidity_keccak applies abi.encodePacked logic
struct_hash = Web3.solidity_keccak(
    ['address', 'uint256', 'uint256', 'uint256'],
    [user, id, expiresAt, nonce]
)

print(f"Python Hash (structHash): {struct_hash.hex()}")

# encode_defunct adds "Ethereum Signed Message" prefix
encoded_message = encode_defunct(hexstr=struct_hash.hex())
print(f"Encoded Hash (prefixed): {encoded_message.body.hex()}")
