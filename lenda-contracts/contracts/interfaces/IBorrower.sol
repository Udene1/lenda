// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IBorrower
 * @notice Interface for the Borrower contract in the Lenda protocol.
 * @author Lenda Protocol
 */
interface IBorrower {
  function initialize(address owner, address _config) external;

  function drawdown(address poolAddress, uint256 amount, address addressToSendTo) external;
}
