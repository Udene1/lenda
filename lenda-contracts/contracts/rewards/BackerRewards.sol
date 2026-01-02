// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Math} from "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";
import {SafeMath} from "../library/SafeMath.sol";
import {SafeERC20Transfer} from "../library/SafeERC20Transfer.sol";
import {GoldfinchConfig} from "../protocol/core/GoldfinchConfig.sol";
import {ConfigHelper} from "../protocol/core/ConfigHelper.sol";
import {BaseUpgradeablePausable} from "../protocol/core/BaseUpgradeablePausable.sol";
import {IPoolTokens} from "../interfaces/IPoolTokens.sol";
import {ITranchedPool} from "../interfaces/ITranchedPool.sol";
import {IBackerRewards} from "../interfaces/IBackerRewards.sol";
import {IEvents} from "../interfaces/IEvents.sol";
import {IERC20withDec} from "../interfaces/IERC20withDec.sol";

contract BackerRewards is IBackerRewards, BaseUpgradeablePausable, IEvents {
  GoldfinchConfig public config;
  using ConfigHelper for GoldfinchConfig;
  using SafeERC20Transfer for IERC20withDec;
  using SafeMath for uint256;

  uint256 internal constant GFI_MANTISSA = 10 ** 18;
  uint256 internal constant USDC_MANTISSA = 10 ** 6;
  uint256 internal constant NUM_TRANCHES_PER_SLICE = 2;

  uint256 public override totalRewards;
  uint256 public override maxInterestDollarsEligible;
  uint256 public override totalInterestReceived;
  uint256 public override totalRewardPercentOfTotalGFI;

  mapping(uint256 => BackerRewardsTokenInfo) public tokens;
  mapping(address => BackerRewardsInfo) public pools;

  // solhint-disable-next-line func-name-mixedcase
  function __initialize__(address owner, GoldfinchConfig _config) public initializer {
    require(
      owner != address(0) && address(_config) != address(0),
      "Owner and config addresses cannot be empty"
    );
    __BaseUpgradeablePausable__init(owner);
    config = _config;
  }

  function allocateRewards(uint256 _interestPaymentAmount) external override onlyPool nonReentrant {
    if (_interestPaymentAmount > 0) {
      _allocateRewards(_interestPaymentAmount);
    }
  }

  function _allocateRewards(uint256 _interestPaymentAmount) internal {
    // Highly simplified version for MVP
    totalInterestReceived = totalInterestReceived.add(_interestPaymentAmount);
  }

  function onTranchedPoolDrawdown(uint256 sliceIndex) external override onlyPool nonReentrant {
    // No-op for MVP
  }

  function setPoolTokenAccRewardsPerPrincipalDollarAtMint(
    address poolAddress,
    uint256 tokenId
  ) external override {
    // No-op for MVP
  }

  function setBackerRewardsTokenInfoOnSplit(
    BackerRewardsTokenInfo memory originalBackerRewardsTokenInfo,
    uint256 newTokenId,
    uint256 newRewardsClaimed
  ) external override onlyPoolTokens {
    tokens[newTokenId] = BackerRewardsTokenInfo({
      rewardsClaimed: newRewardsClaimed,
      accRewardsPerPrincipalDollarAtMint: originalBackerRewardsTokenInfo
        .accRewardsPerPrincipalDollarAtMint
    });
  }

  function clearTokenInfo(uint256 tokenId) external override onlyPoolTokens {
    delete tokens[tokenId];
  }

  function getTokenInfo(
    uint256 poolTokenId
  ) external view override returns (BackerRewardsTokenInfo memory) {
    return tokens[poolTokenId];
  }

  function poolTokenClaimableRewards(uint256 tokenId) public view override returns (uint256) {
    return 0; // Simplified for MVP
  }

  function withdraw(uint256 tokenId) public override whenNotPaused nonReentrant returns (uint256) {
    return 0; // Simplified for MVP
  }

  function setTotalRewards(uint256 _totalRewards) public onlyAdmin {
    totalRewards = _totalRewards;
  }

  function setMaxInterestDollarsEligible(uint256 _maxInterestDollarsEligible) public onlyAdmin {
    maxInterestDollarsEligible = _maxInterestDollarsEligible;
  }

  modifier onlyPoolTokens() {
    require(msg.sender == address(config.getPoolTokens()), "Not PoolTokens");
    _;
  }

  modifier onlyPool() {
    require(config.getPoolTokens().validPool(_msgSender()), "Invalid pool!");
    _;
  }
}
