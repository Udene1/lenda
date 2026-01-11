// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeMath} from "../../library/SafeMath.sol";
import {LendaConfig} from "./LendaConfig.sol";
import {LendaConfigHelper} from "./LendaConfigHelper.sol";
import {BaseUpgradeablePausable} from "./BaseUpgradeablePausable.sol";
import {Accountant} from "./Accountant.sol";
import {IERC20withDec} from "../../interfaces/IERC20withDec.sol";
import {ILoan} from "../../interfaces/ITranchedPool.sol";
import {ITranchedPool} from "../../interfaces/ITranchedPool.sol";
import {ITranchedCreditLineInitializable} from "../../interfaces/ITranchedCreditLineInitializable.sol";
import {ICreditLine} from "../../interfaces/ICreditLine.sol";
import {ISchedule} from "../../interfaces/ISchedule.sol";

/**
 * @title CreditLine
 * @notice A contract that represents the agreement between Backers and
 *  a Borrower. Includes the terms of the loan, as well as the accounting state such as interest owed.
 *  A CreditLine instance belongs to a TranchedPool instance and is fully controlled by that TranchedPool
 *  instance. It should not operate in any standalone capacity and should generally be considered internal
 *  to the TranchedPool instance.
 * @author Lenda Protocol
 */

contract CreditLine is BaseUpgradeablePausable, ITranchedCreditLineInitializable, ICreditLine {
  using LendaConfigHelper for LendaConfig;
  using SafeMath for uint256;
  using PaymentScheduleLib for PaymentSchedule;

  uint256 internal constant INTEREST_DECIMALS = 1e18;
  uint256 internal constant SECONDS_PER_DAY = 60 * 60 * 24;
  uint256 internal constant SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;

  LendaConfig public config;

  // Credit line terms
  /// @inheritdoc ICreditLine
  address public override borrower;
  /// @inheritdoc ICreditLine
  uint256 public override currentLimit;
  /// @inheritdoc ICreditLine
  uint256 public override maxLimit;
  /// @inheritdoc ICreditLine
  uint256 public override interestApr;
  /// @inheritdoc ICreditLine
  uint256 public override lateFeeApr;

  // Accounting variables
  /// @inheritdoc ICreditLine
  uint256 public override balance;
  /// @inheritdoc ICreditLine
  uint256 public override totalInterestPaid;
  /// @inheritdoc ICreditLine
  uint256 public override lastFullPaymentTime;

  // Cumulative interest up to checkpointedAsOf
  uint256 internal _totalInterestAccrued;
  // Cumulative interest owed, i.e. a snapshot of _totalInterestAccrued up to
  // the last due time
  uint256 internal _totalInterestOwed;
  // The last time `_checkpoint()` was called
  uint256 internal _checkpointedAsOf;

  // Schedule variables
  PaymentSchedule public schedule;

  /*==============================================================================
  External functions
  =============================================================================*/

  /// @inheritdoc ITranchedCreditLineInitializable
  function initialize(
    address _config,
    address owner,
    address _borrower,
    uint256 _maxLimit,
    uint256 _interestApr,
    ISchedule _schedule,
    uint256 _lateFeeApr
  ) public override initializer {
    require(
      _config != address(0) && owner != address(0) && _borrower != address(0),
      "Zero address passed in"
    );
    __BaseUpgradeablePausable__init(owner);
    config = LendaConfig(_config);
    borrower = _borrower;
    maxLimit = _maxLimit;
    interestApr = _interestApr;
    lateFeeApr = _lateFeeApr;
    _checkpointedAsOf = block.timestamp;
    schedule.schedule = _schedule;

    // Unlock owner, which is a TranchedPool, for infinite amount
    config.getUSDC().approve(owner, type(uint256).max);
  }

  function pay(
    uint256 paymentAmount
  ) external override onlyAdmin returns (ITranchedPool.PaymentAllocation memory) {
    (uint256 interestAmount, uint256 principalAmount) = Accountant.splitPayment(
      paymentAmount,
      balance,
      interestOwed(),
      interestAccrued(),
      principalOwed()
    );

    return pay(principalAmount, interestAmount);
  }

  /// @inheritdoc ICreditLine
  function pay(
    uint256 principalPayment,
    uint256 interestPayment
  ) public override onlyAdmin returns (ILoan.PaymentAllocation memory) {
    _checkpoint();

    ITranchedPool.PaymentAllocation memory pa = Accountant.allocatePayment(
      Accountant.AllocatePaymentParams({
        principalPayment: principalPayment,
        interestPayment: interestPayment,
        balance: balance,
        interestOwed: interestOwed(),
        interestAccrued: interestAccrued(),
        principalOwed: principalOwed()
      })
    );

    uint256 totalInterestPayment = pa.owedInterestPayment + pa.accruedInterestPayment;
    uint256 totalPrincipalPayment = pa.principalPayment + pa.additionalBalancePayment;

    totalInterestPaid = totalInterestPaid + totalInterestPayment;
    balance = balance - totalPrincipalPayment;

    if (interestOwed() == 0 && principalOwed() == 0) {
      lastFullPaymentTime = block.timestamp;
    }

    return pa;
  }

  /// @inheritdoc ICreditLine
  function drawdown(uint256 amount) external override onlyAdmin {
    require(
      !schedule.isActive() || block.timestamp < termEndTime(),
      "Uninitialized or after termEndTime"
    );
    require(amount + balance <= limit() + totalPrincipalOwed(), "Exceeds limit"); // limit() subtracts principalOwed, so we add it back to get current available space under currentLimit
    // Wait, limit() is: return currentLimit.sub(totalPrincipalOwed());
    // So amount + balance <= currentLimit.sub(totalPrincipalOwed()) + totalPrincipalOwed() => amount + balance <= currentLimit
    // Actually, simple way: amount + balance <= currentLimit
    require(amount + balance <= currentLimit, "Cannot drawdown more than the limit");
    require(amount > 0, "Invalid drawdown amount");

    if (balance == 0) {
      lastFullPaymentTime = block.timestamp;
      if (!schedule.isActive()) {
        schedule.startAt(block.timestamp);
      }
    }

    _checkpoint();

    balance = balance + amount;
    require(!_isLate(block.timestamp), "Cannot drawdown when payments are past due");
  }

  // ------------------------------------------------------------------------------
  // Tranched Pool Proxy methods
  // ------------------------------------------------------------------------------

  function setLimit(uint256 newAmount) external override onlyAdmin {
    require(newAmount <= maxLimit, "Cannot be more than the max limit");
    currentLimit = newAmount;
  }

  function setMaxLimit(uint256 newAmount) external override onlyAdmin {
    maxLimit = newAmount;
  }

  /*==============================================================================
  External view functions
  =============================================================================*/
  function interestAccruedAsOf() public view virtual override returns (uint256) {
    return _checkpointedAsOf;
  }

  /// @inheritdoc ICreditLine
  function isLate() external view override returns (bool) {
    return _isLate(block.timestamp);
  }

  /// @inheritdoc ICreditLine
  function withinPrincipalGracePeriod() public view override returns (bool) {
    return schedule.withinPrincipalGracePeriodAt(block.timestamp);
  }

  /// @inheritdoc ICreditLine
  function interestOwed() public view virtual override returns (uint256) {
    return totalInterestOwed().saturatingSub(totalInterestPaid);
  }

  /// @inheritdoc ICreditLine
  function interestOwedAt(uint256 timestamp) public view override returns (uint256) {
    require(timestamp >= _checkpointedAsOf, "IT");
    return totalInterestOwedAt(timestamp).saturatingSub(totalInterestPaid);
  }

  /// @inheritdoc ICreditLine
  function totalInterestAccrued() public view override returns (uint256) {
    return totalInterestAccruedAt(block.timestamp);
  }

  /// @inheritdoc ICreditLine
  function totalInterestAccruedAt(uint256 timestamp) public view override returns (uint256) {
    require(timestamp >= _checkpointedAsOf, "IT");
    return _totalInterestAccrued + _interestAccruedOverPeriod(_checkpointedAsOf, timestamp);
  }

  /// @inheritdoc ICreditLine
  function totalInterestOwedAt(uint256 timestamp) public view override returns (uint256) {
    require(timestamp >= _checkpointedAsOf, "IT");
    if (timestamp > termEndTime()) {
      return totalInterestAccruedAt(timestamp);
    }

    uint256 mostRecentInterestDueTime = schedule.previousInterestDueTimeAt(timestamp);
    bool crossedPeriod = _checkpointedAsOf <= mostRecentInterestDueTime &&
      mostRecentInterestDueTime <= timestamp;
    return
      crossedPeriod
        ? _totalInterestAccrued + _interestAccruedOverPeriod(_checkpointedAsOf, mostRecentInterestDueTime)
        : _totalInterestOwed;
  }

  /// @inheritdoc ICreditLine
  function limit() public view override returns (uint256) {
    return currentLimit.saturatingSub(totalPrincipalOwed());
  }

  /// @inheritdoc ICreditLine
  function totalPrincipalPaid() public view override returns (uint256) {
    return currentLimit.saturatingSub(balance);
  }

  /// @inheritdoc ICreditLine
  function totalInterestOwed() public view override returns (uint256) {
    return totalInterestOwedAt(block.timestamp);
  }

  /// @inheritdoc ICreditLine
  function interestAccrued() public view override returns (uint256) {
    return interestAccruedAt(block.timestamp);
  }

  /// @inheritdoc ICreditLine
  function principalOwedAt(uint256 timestamp) public view override returns (uint256) {
    return totalPrincipalOwedAt(timestamp).saturatingSub(totalPrincipalPaid());
  }

  /// @inheritdoc ICreditLine
  function totalPrincipalOwedAt(uint256 timestamp) public view override returns (uint256) {
    if (!schedule.isActive()) {
      return 0;
    }

    uint256 currentPrincipalPeriod = schedule.principalPeriodAt(timestamp);
    uint256 totalPrincipalPeriods = schedule.totalPrincipalPeriods();
    return (currentLimit * currentPrincipalPeriod) / totalPrincipalPeriods;
  }

  /// @inheritdoc ICreditLine
  function principalOwed() public view override returns (uint256) {
    return totalPrincipalOwedAt(block.timestamp).saturatingSub(totalPrincipalPaid());
  }

  /// @inheritdoc ICreditLine
  function interestAccruedAt(uint256 timestamp) public view override returns (uint256) {
    require(timestamp >= _checkpointedAsOf, "IT");
    return
      totalInterestAccruedAt(timestamp).saturatingSub(
        Math.max(totalInterestPaid, totalInterestOwedAt(timestamp))
      );
  }

  /// @inheritdoc ICreditLine
  function nextDueTime() external view override returns (uint256) {
    return schedule.nextDueTimeAt(block.timestamp);
  }

  function nextDueTimeAt(uint256 timestamp) external view returns (uint256) {
    return schedule.nextDueTimeAt(timestamp);
  }

  /// @inheritdoc ICreditLine
  function termStartTime() public view override returns (uint256) {
    return schedule.termStartTime();
  }

  /// @inheritdoc ICreditLine
  function termEndTime() public view override returns (uint256) {
    return schedule.termEndTime();
  }

  /// @inheritdoc ICreditLine
  function totalPrincipalOwed() public view override returns (uint256) {
    return totalPrincipalOwedAt(block.timestamp);
  }

  /*==============================================================================
  Internal function
  =============================================================================*/

  function _checkpoint() internal {
    _totalInterestOwed = totalInterestOwed();
    _totalInterestAccrued = totalInterestAccrued();
    _checkpointedAsOf = block.timestamp;
  }

  /*==============================================================================
  Internal view functions
  =============================================================================*/

  function _interestAccruedOverPeriod(uint256 start, uint256 end) internal view returns (uint256) {
    uint256 secondsElapsed = end - start;
    uint256 totalInterestPerYear = (balance * interestApr) / INTEREST_DECIMALS;
    uint256 regularInterest = (totalInterestPerYear * secondsElapsed) / SECONDS_PER_YEAR;
    uint256 lateFeeInterest = _lateFeesAccuredOverPeriod(start, end);
    return regularInterest + lateFeeInterest;
  }

  function _lateFeesAccuredOverPeriod(uint256 start, uint256 end) internal view returns (uint256) {
    uint256 oldestUnpaidDueTime = schedule.nextDueTimeAt(lastFullPaymentTime);

    uint256 lateFeeStartsAt = Math.max(
      start,
      oldestUnpaidDueTime + (config.getLatenessGracePeriodInDays() * SECONDS_PER_DAY)
    );

    if (lateFeeStartsAt < end) {
      uint256 lateSecondsElapsed = end - lateFeeStartsAt;
      uint256 lateFeeInterestPerYear = (balance * lateFeeApr) / INTEREST_DECIMALS;
      return (lateFeeInterestPerYear * lateSecondsElapsed) / SECONDS_PER_YEAR;
    }

    return 0;
  }

  function _isLate(uint256 timestamp) internal view returns (bool) {
    uint256 oldestUnpaidDueTime = schedule.nextDueTimeAt(lastFullPaymentTime);
    return balance > 0 && timestamp > oldestUnpaidDueTime;
  }
}

/**
 * @notice Convenience struct for passing startTime to all Schedule methods
 */
struct PaymentSchedule {
  ISchedule schedule;
  uint256 startTime;
}

library PaymentScheduleLib {
  using PaymentScheduleLib for PaymentSchedule;

  function startAt(PaymentSchedule storage s, uint256 timestamp) internal {
    assert(s.startTime == 0);
    s.startTime = timestamp;
  }

  function previousDueTimeAt(
    PaymentSchedule storage s,
    uint256 timestamp
  ) internal view isActiveMod(s) returns (uint256) {
    return s.schedule.previousDueTimeAt(s.startTime, timestamp);
  }

  function previousInterestDueTimeAt(
    PaymentSchedule storage s,
    uint256 timestamp
  ) internal view isActiveMod(s) returns (uint256) {
    return s.schedule.previousInterestDueTimeAt(s.startTime, timestamp);
  }

  function principalPeriodAt(
    PaymentSchedule storage s,
    uint256 timestamp
  ) internal view isActiveMod(s) returns (uint256) {
    return s.schedule.principalPeriodAt(s.startTime, timestamp);
  }

  function totalPrincipalPeriods(PaymentSchedule storage s) internal view returns (uint256) {
    return s.schedule.totalPrincipalPeriods();
  }

  function isActive(PaymentSchedule storage s) internal view returns (bool) {
    return s.startTime != 0;
  }

  function termEndTime(PaymentSchedule storage s) internal view returns (uint256) {
    return s.isActive() ? s.schedule.termEndTime(s.startTime) : 0;
  }

  function termStartTime(PaymentSchedule storage s) internal view returns (uint256) {
    return s.isActive() ? s.schedule.termStartTime(s.startTime) : 0;
  }

  function nextDueTimeAt(
    PaymentSchedule storage s,
    uint256 timestamp
  ) internal view returns (uint256) {
    return s.isActive() ? s.schedule.nextDueTimeAt(s.startTime, timestamp) : 0;
  }

  function withinPrincipalGracePeriodAt(
    PaymentSchedule storage s,
    uint256 timestamp
  ) internal view returns (bool) {
    return !s.isActive() || s.schedule.withinPrincipalGracePeriodAt(s.startTime, timestamp);
  }

  modifier isActiveMod(PaymentSchedule storage s) {
    require(s.isActive(), "NA");
    _;
  }
}
