// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20withDec.sol";

/**
 * @title IFidu
 * @notice Interface for the Fidu token (Lenda LP token).
 * @author Lenda Protocol
 */
interface IFidu is IERC20withDec {
  function mintTo(address to, uint256 amount) external;

  function burnFrom(address to, uint256 amount) external;

  function renounceRole(bytes32 role, address account) external;
}
