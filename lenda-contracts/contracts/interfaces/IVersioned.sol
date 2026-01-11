// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IVersioned
 * @notice Interface for implementers that have an arbitrary associated tag
 * @author Lenda Protocol
 */
interface IVersioned {
  /**
   * @notice Returns the version triplet `[major, minor, patch]`
   */
  function getVersion() external pure returns (uint8[3] memory);
}
