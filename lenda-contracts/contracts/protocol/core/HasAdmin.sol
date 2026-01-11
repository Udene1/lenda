// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title HasAdmin
 * @notice Base contract that provides an OWNER_ROLE and convenience function/modifier for
 *  checking sender against this role.
 * @author Lenda Protocol
 */
abstract contract HasAdmin is AccessControlUpgradeable {
  /// @notice ID for OWNER_ROLE
  bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

  /**
   * @notice Determine whether msg.sender has OWNER_ROLE
   * @return isAdmin True when msg.sender has OWNER_ROLE
   */
  function isAdmin() public view returns (bool) {
    return hasRole(OWNER_ROLE, msg.sender);
  }

  modifier onlyAdmin() {
    require(isAdmin(), "Must have admin role to perform this action");
    _;
  }
}
