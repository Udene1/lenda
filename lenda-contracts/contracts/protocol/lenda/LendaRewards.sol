// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-v5/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-v5/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-v5/access/Ownable.sol";
import "@openzeppelin/contracts-v5/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-v5/utils/cryptography/MerkleProof.sol";

/**
 * @title LendaRewards
 * @author Lenda Protocol
 * @notice Milestone-based reward distribution for $LENDA using Merkle proofs.
 * @dev Users can claim rewards based on their allocation in the Merkle tree.
 *      The owner can update the Merkle root to add new milestones.
 */
contract LendaRewards is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The LENDA token used for rewards
    IERC20 public immutable lendaToken;

    /// @notice Current Merkle root for reward verification
    bytes32 public merkleRoot;

    /// @notice Tracks total amount claimed by each address
    mapping(address => uint256) public totalClaimed;

    /// @notice Emitted when rewards are claimed
    /// @param account The address that claimed rewards
    /// @param amount The amount of LENDA tokens claimed
    event RewardsClaimed(address indexed account, uint256 amount);

    /// @notice Emitted when the Merkle root is updated
    /// @param newRoot The new Merkle root
    event MerkleRootUpdated(bytes32 newRoot);

    /// @notice Emitted when tokens are withdrawn by owner
    /// @param token The token address withdrawn
    /// @param amount The amount withdrawn
    event TokensWithdrawn(address indexed token, uint256 amount);

    /// @notice Custom errors for gas efficiency
    error ZeroAddress();
    error InvalidProof();
    error NothingToClaim();

    /**
     * @notice Initializes the LendaRewards contract
     * @param _lendaToken Address of the LENDA token contract
     * @param initialOwner Address of the contract owner
     */
    constructor(address _lendaToken, address initialOwner) Ownable(initialOwner) {
        if (_lendaToken == address(0)) revert ZeroAddress();
        if (initialOwner == address(0)) revert ZeroAddress();
        lendaToken = IERC20(_lendaToken);
    }

    /**
     * @notice Updates the Merkle root for reward distribution
     * @dev Only callable by the owner
     * @param _merkleRoot The new Merkle root
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    /**
     * @notice Claims available rewards for the caller
     * @dev Protected against reentrancy attacks
     * @param totalAmount Total cumulative amount allocated to the caller
     * @param merkleProof Merkle proof verifying the allocation
     */
    function claim(
        uint256 totalAmount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        bytes32 node = keccak256(abi.encodePacked(msg.sender, totalAmount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) {
            revert InvalidProof();
        }

        uint256 claimable = totalAmount - totalClaimed[msg.sender];
        if (claimable == 0) revert NothingToClaim();

        // Effects before interactions (CEI pattern)
        totalClaimed[msg.sender] = totalAmount;

        // Interaction - using SafeERC20 for safe transfer
        lendaToken.safeTransfer(msg.sender, claimable);

        emit RewardsClaimed(msg.sender, claimable);
    }

    /**
     * @notice Allows owner to withdraw tokens from the contract
     * @dev Uses SafeERC20 for safe transfers
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(owner(), amount);
        emit TokensWithdrawn(token, amount);
    }
}
