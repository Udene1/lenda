// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ISchedule} from "./ISchedule.sol";
import {ILoan} from "./ILoan.sol";
import {ICreditLine} from "./ICreditLine.sol";

/**
 * @title ITranchedPool
 * @notice Interface for a TranchedPool contract in the Lenda protocol.
 * @author Lenda Protocol
 */
interface ITranchedPool is ILoan {
  struct TrancheInfo {
    uint256 id;
    uint256 principalDeposited;
    uint256 principalSharePrice;
    uint256 interestSharePrice;
    uint256 lockedUntil;
  }
  struct PoolSlice {
    TrancheInfo seniorTranche;
    TrancheInfo juniorTranche;
    uint256 totalInterestAccrued;
    uint256 principalDeployed;
  }
  enum Tranches {
    Reserved,
    Senior,
    Junior
  }

  function initialize(
    address _config,
    address _borrower,
    uint256 _juniorFeePercent,
    uint256 _limit,
    uint256 _interestApr,
    ISchedule _schedule,
    uint256 _lateFeeApr,
    uint256 _fundableAt,
    uint256[] calldata _allowedUIDTypes,
    bool _seniorOnly
  ) external;

  function drawdownTo(address to, uint256 amount) external override;

  function pay(
    uint256 principalPayment,
    uint256 interestPayment
  ) external returns (PaymentAllocation memory);

  function getTranche(uint256 trancheId) external view returns (ITranchedPool.TrancheInfo memory);

  function poolSlices(uint256 index) external view returns (ITranchedPool.PoolSlice memory);

  function lockJuniorCapital() external;

  function lockPool() external;

  function initializeNextSlice(uint256 _fundableAt) external;

  function totalJuniorDeposits() external view returns (uint256);

  function assess() external;

  function numSlices() external view returns (uint256);

  event SharePriceUpdated(
    address indexed pool,
    uint256 indexed tranche,
    uint256 principalSharePrice,
    int256 principalDelta,
    uint256 interestSharePrice,
    int256 interestDelta
  );
  event CreditLineMigrated(ICreditLine indexed oldCreditLine, ICreditLine indexed newCreditLine);
  event TrancheLocked(address indexed pool, uint256 trancheId, uint256 lockedUntil);
  event SliceCreated(address indexed pool, uint256 sliceId);
}
