// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title ILendaConfig
 * @notice Interface for LendaConfig contract
 * @author Lenda Protocol
 */

interface ILendaConfig {
  /**
   * @dev Sets an address in the config at the given index
   * @param addressIndex The index of the address to set
   * @param newAddress The new address value
   */
  function setAddress(uint256 addressIndex, address newAddress) external;

  /**
   * @dev Sets a number in the config at the given index
   * @param index The index of the number to set
   * @param newNumber The new number value
   */
  function setNumber(uint256 index, uint256 newNumber) external;

  /**
   * @dev Gets an address from the config at the given index
   * @param index The index of the address to get
   * @return The address value
   */
  function getAddress(uint256 index) external view returns (address);

  /**
   * @dev Gets a number from the config at the given index
   * @param index The index of the number to get
   * @return The number value
   */
  function getNumber(uint256 index) external view returns (uint256);
}
