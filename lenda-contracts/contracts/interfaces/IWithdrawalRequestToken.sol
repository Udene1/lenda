// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";

/**
 * @title IWithdrawalRequestToken
 * @notice Interface for the WithdrawalRequestToken NFT in the Lenda protocol.
 * @author Lenda Protocol
 */
interface IWithdrawalRequestToken is IERC721EnumerableUpgradeable {
  /**
   * @notice Mint a withdrawal request token to `receiver`
   * @dev succeeds if and only if called by senior pool
   * @param receiver The address to receive the token.
   * @return tokenId The ID of the newly minted token.
   */
  function mint(address receiver) external returns (uint256 tokenId);

  /**
   * @notice Burn token `tokenId`
   * @dev succeeds if and only if called by senior pool
   * @param tokenId The ID of the token to burn.
   */
  function burn(uint256 tokenId) external;
}
