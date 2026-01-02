// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-v5/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-v5/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts-v5/access/Ownable.sol";
import "@openzeppelin/contracts-v5/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title LendaToken
 * @author Lenda Protocol
 * @notice ERC20 governance token for the Lenda Protocol with a capped supply.
 * @dev Features:
 *      - Maximum supply of 150 million tokens
 *      - Owner-controlled minting up to the cap
 *      - Burnable by token holders
 *      - EIP-2612 permit functionality for gasless approvals
 */
contract LendaToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    /// @notice Maximum supply of LENDA tokens (150 million with 18 decimals)
    uint256 public constant MAX_SUPPLY = 150_000_000 * 10**18;

    /// @notice Custom error for zero address validation
    error ZeroAddress();

    /// @notice Custom error when minting would exceed max supply
    error MaxSupplyExceeded();

    /**
     * @notice Initializes the LENDA token
     * @param initialOwner Address that will own the contract and have minting rights
     */
    constructor(address initialOwner)
        ERC20("Lenda Token", "LENDA")
        Ownable(initialOwner)
        ERC20Permit("Lenda Token")
    {
        if (initialOwner == address(0)) revert ZeroAddress();
    }

    /**
     * @notice Mints new LENDA tokens
     * @dev Only callable by the owner. Will revert if minting exceeds MAX_SUPPLY.
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint (with 18 decimals)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
    }
}
