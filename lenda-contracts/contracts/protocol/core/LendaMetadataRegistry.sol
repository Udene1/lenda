// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ITranchedPool
 * @notice Minimal interface for the MetadataRegistry to interact with pools.
 */
interface ITranchedPool {
    function creditLine() external view returns (address);
}

/**
 * @title ICreditLine
 * @notice Minimal interface for the MetadataRegistry to interact with credit lines.
 */
interface ICreditLine {
    function borrower() external view returns (address);
}

/**
 * @title LendaMetadataRegistry
 * @notice Registry for metadata related to the Lenda protocol, such as pool names.
 * @author Lenda Protocol
 */
contract LendaMetadataRegistry {
    /// @notice Mapping from pool address to its human-readable name.
    mapping(address => string) public poolNames;

    /// @notice Emitted when a pool name is updated.
    event PoolNameUpdated(address indexed pool, string name);

    /**
     * @notice Set or update the name of a lending pool.
     * @dev Only the borrower of the pool (as defined in its CreditLine) can set the name.
     * @param pool The address of the TranchedPool.
     * @param name The new human-readable name for the pool.
     */
    function setPoolName(address pool, string calldata name) external {
        ITranchedPool tp = ITranchedPool(pool);
        try tp.creditLine() returns (address cl) {
            address borrower = ICreditLine(cl).borrower();
            require(borrower == msg.sender, "Only borrower can set name");
            poolNames[pool] = name;
            emit PoolNameUpdated(pool, name);
        } catch {
            revert("Invalid pool address");
        }
    }
}
