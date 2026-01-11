// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ICreditLine} from "../../interfaces/ICreditLine.sol";
import {ITranchedPool} from "../../interfaces/ITranchedPool.sol";
import {IPoolTokens} from "../../interfaces/IPoolTokens.sol";
import {LendaConfig} from "./LendaConfig.sol";
import {LendaConfigHelper} from "./LendaConfigHelper.sol";
import {FixedPoint} from "../../external/FixedPoint.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title TranchingLogic
 * @notice Library for handling the payments waterfall
 * @author Lenda Protocol
 */
library TranchingLogic {
  using LendaConfigHelper for LendaConfig;

  struct SliceInfo {
    uint256 reserveFeePercent;
    uint256 interestAccrued;
    uint256 principalAccrued;
  }

  struct ApplyResult {
    uint256 interestRemaining;
    uint256 principalRemaining;
    uint256 reserveDeduction;
    uint256 oldInterestSharePrice;
    uint256 oldPrincipalSharePrice;
  }

  uint256 internal constant FP_SCALING_FACTOR = 1e18;
  uint256 public constant NUM_TRANCHES_PER_SLICE = 2;

  function usdcToSharePrice(uint256 amount, uint256 totalShares) public pure returns (uint256) {
    return totalShares == 0 ? 0 : (amount * FP_SCALING_FACTOR) / totalShares;
  }

  function sharePriceToUsdc(uint256 sharePrice, uint256 totalShares) public pure returns (uint256) {
    return (sharePrice * totalShares) / FP_SCALING_FACTOR;
  }

  function lockTranche(ITranchedPool.TrancheInfo storage tranche, LendaConfig config) external {
    tranche.lockedUntil = block.timestamp + config.getDrawdownPeriodInSeconds();
    emit TrancheLocked(address(this), tranche.id, tranche.lockedUntil);
  }

  function redeemableInterestAndPrincipal(
    ITranchedPool.TrancheInfo storage trancheInfo,
    IPoolTokens.TokenInfo memory tokenInfo
  ) public view returns (uint256, uint256) {
    uint256 maxPrincipalRedeemable = sharePriceToUsdc(
      trancheInfo.principalSharePrice,
      tokenInfo.principalAmount
    );
    uint256 maxInterestRedeemable = sharePriceToUsdc(
      trancheInfo.interestSharePrice,
      tokenInfo.principalAmount
    );

    uint256 interestRedeemable = maxInterestRedeemable - tokenInfo.interestRedeemed;
    uint256 principalRedeemable = maxPrincipalRedeemable - tokenInfo.principalRedeemed;

    return (interestRedeemable, principalRedeemable);
  }

  function calculateExpectedSharePrice(
    ITranchedPool.TrancheInfo memory tranche,
    uint256 amount,
    ITranchedPool.PoolSlice memory slice
  ) public pure returns (uint256) {
    uint256 sharePrice = usdcToSharePrice(amount, tranche.principalDeposited);
    return _scaleByPercentOwnership(tranche, sharePrice, slice);
  }

  function scaleForSlice(
    ITranchedPool.PoolSlice memory slice,
    uint256 amount,
    uint256 totalDeployed
  ) public pure returns (uint256) {
    return scaleByFraction(amount, slice.principalDeployed, totalDeployed);
  }

  function getSliceInfo(
    ITranchedPool.PoolSlice memory slice,
    ICreditLine creditLine,
    uint256 totalDeployed,
    uint256 reserveFeePercent
  ) public view returns (SliceInfo memory) {
    (uint256 interestAccrued, uint256 principalAccrued) = getTotalInterestAndPrincipal(
      slice,
      creditLine,
      totalDeployed
    );
    return
      SliceInfo({
        reserveFeePercent: reserveFeePercent,
        interestAccrued: interestAccrued,
        principalAccrued: principalAccrued
      });
  }

  function getTotalInterestAndPrincipal(
    ITranchedPool.PoolSlice memory slice,
    ICreditLine creditLine,
    uint256 totalDeployed
  ) public view returns (uint256, uint256) {
    uint256 principalAccrued = creditLine.principalOwed();
    principalAccrued = (totalDeployed - creditLine.balance()) + principalAccrued;
    principalAccrued = scaleForSlice(slice, principalAccrued, totalDeployed);
    uint256 totalDeposited = slice.seniorTranche.principalDeposited +
      slice.juniorTranche.principalDeposited;
    principalAccrued = (totalDeposited - slice.principalDeployed) + principalAccrued;
    return (slice.totalInterestAccrued, principalAccrued);
  }

  function scaleByFraction(
    uint256 amount,
    uint256 fraction,
    uint256 total
  ) public pure returns (uint256) {
    if (total == 0) return 0;
    return (amount * fraction) / total;
  }

  function applyToAllSlices(
    mapping(uint256 => ITranchedPool.PoolSlice) storage poolSlices,
    uint256 numSlices,
    uint256 interest,
    uint256 principal,
    uint256 reserveFeePercent,
    uint256 totalDeployed,
    ICreditLine creditLine,
    uint256 juniorFeePercent
  ) external returns (uint256) {
    ApplyResult memory result = applyToAllSeniorTranches(
      poolSlices,
      numSlices,
      interest,
      principal,
      reserveFeePercent,
      totalDeployed,
      creditLine,
      juniorFeePercent
    );

    return
      result.reserveDeduction +
        applyToAllJuniorTranches(
          poolSlices,
          numSlices,
          result.interestRemaining,
          result.principalRemaining,
          reserveFeePercent,
          totalDeployed,
          creditLine
        );
  }

  function applyToAllSeniorTranches(
    mapping(uint256 => ITranchedPool.PoolSlice) storage poolSlices,
    uint256 numSlices,
    uint256 interest,
    uint256 principal,
    uint256 reserveFeePercent,
    uint256 totalDeployed,
    ICreditLine creditLine,
    uint256 juniorFeePercent
  ) internal returns (ApplyResult memory) {
    ApplyResult memory seniorApplyResult;
    for (uint256 i = 0; i < numSlices; i++) {
      ITranchedPool.PoolSlice storage slice = poolSlices[i];

      SliceInfo memory sliceInfo = getSliceInfo(
        slice,
        creditLine,
        totalDeployed,
        reserveFeePercent
      );

      ApplyResult memory applyResult = applyToSeniorTranche(
        slice,
        scaleForSlice(slice, interest, totalDeployed),
        scaleForSlice(slice, principal, totalDeployed),
        juniorFeePercent,
        sliceInfo
      );
      emitSharePriceUpdatedEvent(slice.seniorTranche, applyResult);
      seniorApplyResult.interestRemaining = seniorApplyResult.interestRemaining +
        applyResult.interestRemaining;
      seniorApplyResult.principalRemaining = seniorApplyResult.principalRemaining +
        applyResult.principalRemaining;
      seniorApplyResult.reserveDeduction = seniorApplyResult.reserveDeduction +
        applyResult.reserveDeduction;
    }
    return seniorApplyResult;
  }

  function applyToAllJuniorTranches(
    mapping(uint256 => ITranchedPool.PoolSlice) storage poolSlices,
    uint256 numSlices,
    uint256 interest,
    uint256 principal,
    uint256 reserveFeePercent,
    uint256 totalDeployed,
    ICreditLine creditLine
  ) internal returns (uint256 totalReserveAmount) {
    for (uint256 i = 0; i < numSlices; i++) {
      SliceInfo memory sliceInfo = getSliceInfo(
        poolSlices[i],
        creditLine,
        totalDeployed,
        reserveFeePercent
      );
      ApplyResult memory applyResult = applyToJuniorTranche(
        poolSlices[i],
        scaleForSlice(poolSlices[i], interest, totalDeployed),
        scaleForSlice(poolSlices[i], principal, totalDeployed),
        sliceInfo
      );
      emitSharePriceUpdatedEvent(poolSlices[i].juniorTranche, applyResult);
      totalReserveAmount = totalReserveAmount + applyResult.reserveDeduction;
    }
    return totalReserveAmount;
  }

  function emitSharePriceUpdatedEvent(
    ITranchedPool.TrancheInfo memory tranche,
    ApplyResult memory applyResult
  ) internal {
    emit SharePriceUpdated(
      address(this),
      tranche.id,
      tranche.principalSharePrice,
      int256(tranche.principalSharePrice) - int256(applyResult.oldPrincipalSharePrice),
      tranche.interestSharePrice,
      int256(tranche.interestSharePrice) - int256(applyResult.oldInterestSharePrice)
    );
  }

  function applyToSeniorTranche(
    ITranchedPool.PoolSlice storage slice,
    uint256 interestRemaining,
    uint256 principalRemaining,
    uint256 juniorFeePercent,
    SliceInfo memory sliceInfo
  ) internal returns (ApplyResult memory) {
    uint256 expectedInterestSharePrice = calculateExpectedSharePrice(
      slice.seniorTranche,
      sliceInfo.interestAccrued,
      slice
    );
    uint256 expectedPrincipalSharePrice = calculateExpectedSharePrice(
      slice.seniorTranche,
      sliceInfo.principalAccrued,
      slice
    );

    uint256 desiredNetInterestSharePrice = scaleByFraction(
      expectedInterestSharePrice,
      100 - (juniorFeePercent + sliceInfo.reserveFeePercent),
      100
    );
    uint256 reserveDeduction = scaleByFraction(
      interestRemaining,
      sliceInfo.reserveFeePercent,
      100
    );
    interestRemaining = interestRemaining - reserveDeduction;
    uint256 oldInterestSharePrice = slice.seniorTranche.interestSharePrice;
    uint256 oldPrincipalSharePrice = slice.seniorTranche.principalSharePrice;
    (interestRemaining, principalRemaining) = _applyBySharePrice(
      slice.seniorTranche,
      interestRemaining,
      principalRemaining,
      desiredNetInterestSharePrice,
      expectedPrincipalSharePrice
    );
    return
      ApplyResult({
        interestRemaining: interestRemaining,
        principalRemaining: principalRemaining,
        reserveDeduction: reserveDeduction,
        oldInterestSharePrice: oldInterestSharePrice,
        oldPrincipalSharePrice: oldPrincipalSharePrice
      });
  }

  function applyToJuniorTranche(
    ITranchedPool.PoolSlice storage slice,
    uint256 interestRemaining,
    uint256 principalRemaining,
    SliceInfo memory sliceInfo
  ) public returns (ApplyResult memory) {
    uint256 expectedInterestSharePrice = slice.juniorTranche.interestSharePrice +
      usdcToSharePrice(interestRemaining, slice.juniorTranche.principalDeposited);
    uint256 expectedPrincipalSharePrice = calculateExpectedSharePrice(
      slice.juniorTranche,
      sliceInfo.principalAccrued,
      slice
    );
    uint256 oldInterestSharePrice = slice.juniorTranche.interestSharePrice;
    uint256 oldPrincipalSharePrice = slice.juniorTranche.principalSharePrice;
    (interestRemaining, principalRemaining) = _applyBySharePrice(
      slice.juniorTranche,
      interestRemaining,
      principalRemaining,
      expectedInterestSharePrice,
      expectedPrincipalSharePrice
    );

    interestRemaining = interestRemaining + principalRemaining;
    uint256 reserveDeduction = scaleByFraction(
      principalRemaining,
      sliceInfo.reserveFeePercent,
      100
    );
    interestRemaining = interestRemaining - reserveDeduction;
    principalRemaining = 0;

    (interestRemaining, principalRemaining) = _applyByAmount(
      slice.juniorTranche,
      interestRemaining + principalRemaining,
      0,
      interestRemaining + principalRemaining,
      0
    );
    return
      ApplyResult({
        interestRemaining: interestRemaining,
        principalRemaining: principalRemaining,
        reserveDeduction: reserveDeduction,
        oldInterestSharePrice: oldInterestSharePrice,
        oldPrincipalSharePrice: oldPrincipalSharePrice
      });
  }

  function trancheIdToSliceIndex(uint256 trancheId) external pure returns (uint256) {
    return (trancheId - 1) / NUM_TRANCHES_PER_SLICE;
  }

  function initializeNextSlice(
    mapping(uint256 => ITranchedPool.PoolSlice) storage poolSlices,
    uint256 sliceIndex
  ) external {
    poolSlices[sliceIndex] = ITranchedPool.PoolSlice({
      seniorTranche: ITranchedPool.TrancheInfo({
        id: sliceIndexToSeniorTrancheId(sliceIndex),
        principalSharePrice: usdcToSharePrice(1, 1),
        interestSharePrice: 0,
        principalDeposited: 0,
        lockedUntil: 0
      }),
      juniorTranche: ITranchedPool.TrancheInfo({
        id: sliceIndexToJuniorTrancheId(sliceIndex),
        principalSharePrice: usdcToSharePrice(1, 1),
        interestSharePrice: 0,
        principalDeposited: 0,
        lockedUntil: 0
      }),
      totalInterestAccrued: 0,
      principalDeployed: 0
    });
  }

  function sliceIndexToJuniorTrancheId(uint256 sliceIndex) public pure returns (uint256) {
    return (sliceIndex * NUM_TRANCHES_PER_SLICE) + 2;
  }

  function sliceIndexToSeniorTrancheId(uint256 sliceIndex) public pure returns (uint256) {
    return (sliceIndex * NUM_TRANCHES_PER_SLICE) + 1;
  }

  function isSeniorTrancheId(uint256 trancheId) external pure returns (bool) {
    return (trancheId % TranchingLogic.NUM_TRANCHES_PER_SLICE) == 1;
  }

  function isJuniorTrancheId(uint256 trancheId) external pure returns (bool) {
    return trancheId != 0 && (trancheId % TranchingLogic.NUM_TRANCHES_PER_SLICE) == 0;
  }

  function _applyToSharePrice(
    uint256 amountRemaining,
    uint256 currentSharePrice,
    uint256 desiredAmount,
    uint256 totalShares
  ) internal pure returns (uint256, uint256) {
    if (amountRemaining == 0 || desiredAmount == 0) {
      return (amountRemaining, currentSharePrice);
    }
    if (amountRemaining < desiredAmount) {
      desiredAmount = amountRemaining;
    }
    uint256 sharePriceDifference = usdcToSharePrice(desiredAmount, totalShares);
    return (amountRemaining - desiredAmount, currentSharePrice + sharePriceDifference);
  }

  function _scaleByPercentOwnership(
    ITranchedPool.TrancheInfo memory tranche,
    uint256 amount,
    ITranchedPool.PoolSlice memory slice
  ) internal pure returns (uint256) {
    uint256 totalDeposited = slice.juniorTranche.principalDeposited +
      slice.seniorTranche.principalDeposited;
    return scaleByFraction(amount, tranche.principalDeposited, totalDeposited);
  }

  function _desiredAmountFromSharePrice(
    uint256 desiredSharePrice,
    uint256 actualSharePrice,
    uint256 totalShares
  ) internal pure returns (uint256) {
    if (desiredSharePrice < actualSharePrice) {
      desiredSharePrice = actualSharePrice;
    }
    uint256 sharePriceDifference = desiredSharePrice - actualSharePrice;
    return sharePriceToUsdc(sharePriceDifference, totalShares);
  }

  function _applyByAmount(
    ITranchedPool.TrancheInfo storage tranche,
    uint256 interestRemaining,
    uint256 principalRemaining,
    uint256 desiredInterestAmount,
    uint256 desiredPrincipalAmount
  ) internal returns (uint256, uint256) {
    uint256 totalShares = tranche.principalDeposited;
    uint256 newSharePrice;

    (interestRemaining, newSharePrice) = _applyToSharePrice(
      interestRemaining,
      tranche.interestSharePrice,
      desiredInterestAmount,
      totalShares
    );
    tranche.interestSharePrice = newSharePrice;

    (principalRemaining, newSharePrice) = _applyToSharePrice(
      principalRemaining,
      tranche.principalSharePrice,
      desiredPrincipalAmount,
      totalShares
    );
    tranche.principalSharePrice = newSharePrice;
    return (interestRemaining, principalRemaining);
  }

  function _applyBySharePrice(
    ITranchedPool.TrancheInfo storage tranche,
    uint256 interestRemaining,
    uint256 principalRemaining,
    uint256 desiredInterestSharePrice,
    uint256 desiredPrincipalSharePrice
  ) internal returns (uint256, uint256) {
    uint256 desiredInterestAmount = _desiredAmountFromSharePrice(
      desiredInterestSharePrice,
      tranche.interestSharePrice,
      tranche.principalDeposited
    );
    uint256 desiredPrincipalAmount = _desiredAmountFromSharePrice(
      desiredPrincipalSharePrice,
      tranche.principalSharePrice,
      tranche.principalDeposited
    );
    return
      _applyByAmount(
        tranche,
        interestRemaining,
        principalRemaining,
        desiredInterestAmount,
        desiredPrincipalAmount
      );
  }

  event TrancheLocked(address indexed pool, uint256 trancheId, uint256 lockedUntil);

  event SharePriceUpdated(
    address indexed pool,
    uint256 indexed tranche,
    uint256 principalSharePrice,
    int256 principalDelta,
    uint256 interestSharePrice,
    int256 interestDelta
  );
}
