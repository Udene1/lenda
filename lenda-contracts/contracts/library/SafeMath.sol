// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Math operations with additional safety checks.
 * In Solidity 0.8.x, standard math operations already have overflow checks.
 * This library provides additional utility functions like saturatingSub.
 */
library SafeMath {
  /**
   * @notice Do a - b. If b > a, return 0 instead of reverting.
   */
  function saturatingSub(uint256 a, uint256 b) internal pure returns (uint256) {
    return b > a ? 0 : a - b;
  }
}
