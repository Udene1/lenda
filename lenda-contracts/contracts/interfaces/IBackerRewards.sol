// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ITranchedPool} from "./ITranchedPool.sol";

/**
 * @title IBackerRewards
 * @notice Interface for the BackerRewards contract in the Lenda protocol.
 * @author Lenda Protocol
 */
interface IBackerRewards {
  struct BackerRewardsTokenInfo {
    uint256 rewardsClaimed; // gfi claimed
    uint256 accRewardsPerPrincipalDollarAtMint; // Pool's accRewardsPerPrincipalDollar at PoolToken mint()
  }

  struct BackerRewardsInfo {
    uint256 accRewardsPerPrincipalDollar; // accumulator gfi per interest dollar
  }

  /// @notice total amount of GFI rewards available, times 1e18
  function totalRewards() external view returns (uint256);

  /// @notice interest $ eligible for gfi rewards, times 1e18
  function maxInterestDollarsEligible() external view returns (uint256);

  /// @notice counter of total interest repayments, times 1e6
  function totalInterestReceived() external view returns (uint256);

  /// @notice totalRewards/totalGFISupply * 100, times 1e18
  function totalRewardPercentOfTotalGFI() external view returns (uint256);

  /// @notice Get backer rewards metadata for a pool token
  function getTokenInfo(uint256 poolTokenId) external view returns (BackerRewardsTokenInfo memory);

  /// @notice Calculates the accRewardsPerPrincipalDollar for a given pool,
  ///   when a interest payment is received by the protocol
  /// @param _interestPaymentAmount Atomic usdc amount of the interest payment
  function allocateRewards(uint256 _interestPaymentAmount) external;

  /// @notice callback for TranchedPools when they drawdown
  /// @param sliceIndex index of the tranched pool slice
  function onTranchedPoolDrawdown(uint256 sliceIndex) external;

  /// @notice When a pool token is minted for multiple drawdowns,
  ///   set accRewardsPerPrincipalDollarAtMint to the current accRewardsPerPrincipalDollar price
  /// @param poolAddress Address of the pool associated with the pool token
  /// @param tokenId Pool token id
  function setPoolTokenAccRewardsPerPrincipalDollarAtMint(
    address poolAddress,
    uint256 tokenId
  ) external;

  /// @notice PoolToken request to withdraw all allocated rewards
  /// @param tokenId Pool token id
  /// @return amount of rewards withdrawn
  function withdraw(uint256 tokenId) external returns (uint256);

  /**
   * @notice Set BackerRewards metadata for tokens created by a pool token split.
   * @param originalBackerRewardsTokenInfo backer rewards info for the pool token that was split
   * @param newTokenId id of one of the tokens in the split
   * @param newRewardsClaimed rewardsClaimed value for the new token.
   */
  function setBackerRewardsTokenInfoOnSplit(
    BackerRewardsTokenInfo memory originalBackerRewardsTokenInfo,
    uint256 newTokenId,
    uint256 newRewardsClaimed
  ) external;

  /**
   * @notice Calculate the gross available gfi rewards for a PoolToken
   * @param tokenId Pool token id
   * @return The amount of GFI claimable
   */
  function poolTokenClaimableRewards(uint256 tokenId) external view returns (uint256);

  /// @notice Clear all BackerRewards associated data for `tokenId`
  function clearTokenInfo(uint256 tokenId) external;
}
