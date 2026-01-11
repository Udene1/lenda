// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseUpgradeablePausable} from "./protocol/core/BaseUpgradeablePausable.sol";
import {IUniqueIdentity} from "./interfaces/IUniqueIdentity.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title UniqueIdentity
 * @notice Custom implementation of a non-transferable identity NFT for Lenda KYC/KYB.
 * @author Lenda Protocol
 */
contract UniqueIdentity is IUniqueIdentity, BaseUpgradeablePausable {
    using ECDSA for bytes32;

    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    // Mapping from (account -> id -> balance)
    mapping(address => mapping(uint256 => uint256)) private _balances;
    // Mapping from (account -> operator -> approved)
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    
    // Nonces for signatures to prevent replay
    mapping(address => uint256) public nonces;

    // Supported ID types (Lenda usually uses 0-10)
    mapping(uint256 => bool) public supportedIds;

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    string public uri;

    function initialize(address owner, string memory _uri) public initializer {
        require(owner != address(0), "Owner cannot be 0");
        __BaseUpgradeablePausable__init(owner);
        uri = _uri;
        
        // Grant DEFAULT_ADMIN_ROLE to owner so they can manage all roles
        _setRoleAdmin(SIGNER_ROLE, OWNER_ROLE);
    }

    function setURI(string memory newuri) external onlyAdmin {
        uri = newuri;
    }

    function setSupportedId(uint256 id, bool supported) external onlyAdmin {
        supportedIds[id] = supported;
    }

    /**
     * @dev Mints a UID token. Requires a valid signature from a SIGNER_ROLE.
     * @param id The ID type to mint (e.g., 0 for US Accredited, 1 for Non-US)
     * @param expiresAt Timestamp when the signature expires
     * @param signature ECDSA signature from a valid signer
     */
    function mint(uint256 id, uint256 expiresAt, bytes calldata signature) external whenNotPaused {
        require(supportedIds[id], "ID type not supported");
        require(block.timestamp <= expiresAt, "Signature expired");
        require(_balances[msg.sender][id] == 0, "Already has UID");

        bytes32 structHash = keccak256(abi.encodePacked(msg.sender, id, expiresAt, nonces[msg.sender]));
        bytes32 hash = ECDSA.toEthSignedMessageHash(structHash);
        
        address signer = hash.recover(signature);
        require(hasRole(SIGNER_ROLE, signer), "Invalid signer");

        _balances[msg.sender][id] = 1;
        nonces[msg.sender]++;
        
        emit TransferSingle(msg.sender, address(0), msg.sender, id, 1);
    }

    /**
     * @dev Helper to set SIGNER_ROLE admin and grant the role.
     * Can only be called by an account with OWNER_ROLE.
     */
    function setupSigner(address signer) external onlyAdmin {
        _setRoleAdmin(SIGNER_ROLE, OWNER_ROLE);
        _grantRole(SIGNER_ROLE, signer);
    }

    // Burn allows a user to remove their own UID
    function burn(address account, uint256 id, uint256 value) external {
        require(account == msg.sender || isApprovedForAll(account, msg.sender), "Caller is not owner nor approved");
        require(_balances[account][id] >= value, "Insufficient balance");
        
        _balances[account][id] -= value;
        emit TransferSingle(msg.sender, account, address(0), id, value);
    }

    // IUniqueIdentity Implementation
    function balanceOf(address account, uint256 id) external view override returns (uint256) {
        return _balances[account][id];
    }

    function isApprovedForAll(address account, address operator) public view override returns (bool) {
        return _operatorApprovals[account][operator];
    }

    // ERC1155 Standard Functions (Simplified for Non-Transferable)
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external {
        revert("UniqueIdentity is non-transferable");
    }

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external {
        revert("UniqueIdentity is non-transferable");
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
}
