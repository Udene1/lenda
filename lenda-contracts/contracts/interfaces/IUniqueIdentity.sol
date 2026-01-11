// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface for the UniqueIdentity NFT contract, used for KYC/KYB.
 */
interface IUniqueIdentity {
  function balanceOf(address account, uint256 id) external view returns (uint256);

  function isApprovedForAll(address account, address operator) external view returns (bool);
}
