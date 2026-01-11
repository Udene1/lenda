// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IPeriodMapper} from "../../../interfaces/IPeriodMapper.sol";
import {ISchedule} from "../../../interfaces/ISchedule.sol";
import {SafeMath} from "../../../library/SafeMath.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Schedule
 * @notice A contract meant to be re-used between tranched pools to determine when payments are due
 *         using some period mapper contract that maps timestamps to real world concepts of time (months).
 * @author Lenda Protocol
 */
contract Schedule is ISchedule {
  using SafeMath for uint256;

  /// @notice the payment date schedule
  IPeriodMapper public immutable periodMapper;

  /// @notice the number of periods in the term of the loan
  uint256 public immutable override periodsInTerm;

  /// @notice the number of payment periods that need to pass before interest
  ///         comes due
  uint256 public immutable override periodsPerInterestPeriod;

  /// @notice the number of payment periods that need to pass before principal
  ///         comes due
  uint256 public immutable override periodsPerPrincipalPeriod;

  /// @notice the number of principal periods where no principal will be due
  uint256 public immutable override gracePrincipalPeriods;

  /**
   * @param _periodMapper contract that maps timestamps to periods
   * @param _periodsInTerm the number of periods in the term of the loan
   * @param _periodsPerPrincipalPeriod the number of payment periods that need to pass before principal
   *         comes due
   * @param _periodsPerInterestPeriod the number of payment periods that need to pass before interest
   *         comes due.
   * @param _gracePrincipalPeriods principal periods where principal will not be due
   */
  constructor(
    IPeriodMapper _periodMapper,
    uint256 _periodsInTerm,
    uint256 _periodsPerPrincipalPeriod,
    uint256 _periodsPerInterestPeriod,
    uint256 _gracePrincipalPeriods
  ) {
    require(address(_periodMapper) != address(0), "Z");

    require(_periodsInTerm > 0, "Z");
    require(_periodsPerPrincipalPeriod > 0, "Z");
    require(_periodsPerInterestPeriod > 0, "Z");

    require(_periodsInTerm % _periodsPerPrincipalPeriod == 0, "PPPP");
    require(_periodsInTerm % _periodsPerInterestPeriod == 0, "PPIP");

    uint256 nPrincipalPeriods = _periodsInTerm / _periodsPerPrincipalPeriod;
    require(_gracePrincipalPeriods < nPrincipalPeriods, "GPP");

    periodMapper = _periodMapper;
    periodsInTerm = _periodsInTerm;
    periodsPerPrincipalPeriod = _periodsPerPrincipalPeriod;
    periodsPerInterestPeriod = _periodsPerInterestPeriod;
    gracePrincipalPeriods = _gracePrincipalPeriods;
  }

  /// @inheritdoc ISchedule
  function interestPeriodAt(
    uint256 startTime,
    uint256 timestamp
  ) public view override returns (uint256) {
    return Math.min(_periodToInterestPeriod(periodAt(startTime, timestamp)), totalInterestPeriods());
  }

  /// @inheritdoc ISchedule
  function periodAt(uint256 startTime, uint256 timestamp) public view override returns (uint256) {
    uint256 currentAbsPeriod = periodMapper.periodOf(timestamp);
    uint256 startPeriod = _termStartAbsolutePeriod(startTime);

    return Math.min(currentAbsPeriod.saturatingSub(startPeriod), periodsInTerm);
  }

  /// @inheritdoc ISchedule
  function principalPeriodAt(
    uint256 startTime,
    uint256 timestamp
  ) public view override returns (uint256) {
    return Math.min(_periodToPrincipalPeriod(periodAt(startTime, timestamp)), totalPrincipalPeriods());
  }

  /// @inheritdoc ISchedule
  function withinPrincipalGracePeriodAt(
    uint256 startTime,
    uint256 timestamp
  ) public view override returns (bool) {
    return
      timestamp < startTime ||
      (timestamp >= startTime &&
        (periodAt(startTime, timestamp) / periodsPerPrincipalPeriod) < gracePrincipalPeriods);
  }

  /// @inheritdoc ISchedule
  function nextDueTimeAt(
    uint256 startTime,
    uint256 timestamp
  ) external view override returns (uint256) {
    return
      Math.min(
        nextPrincipalDueTimeAt(startTime, timestamp),
        nextInterestDueTimeAt(startTime, timestamp)
      );
  }

  /// @inheritdoc ISchedule
  function previousDueTimeAt(
    uint256 startTime,
    uint256 timestamp
  ) external view override returns (uint256) {
    return
      Math.max(
        previousInterestDueTimeAt(startTime, timestamp),
        previousPrincipalDueTimeAt(startTime, timestamp)
      );
  }

  /// @inheritdoc ISchedule
  function totalPrincipalPeriods() public view override returns (uint256) {
    return (periodsInTerm / periodsPerPrincipalPeriod) - gracePrincipalPeriods;
  }

  /// @inheritdoc ISchedule
  function totalInterestPeriods() public view override returns (uint256) {
    return periodsInTerm / periodsPerInterestPeriod;
  }

  /// @inheritdoc ISchedule
  function termEndTime(uint256 startTime) external view override returns (uint256) {
    uint256 endPeriod = _termEndAbsolutePeriod(startTime);
    return periodMapper.startOf(endPeriod);
  }

  /// @inheritdoc ISchedule
  function termStartTime(uint256 startTime) external view override returns (uint256) {
    uint256 startPeriod = _termStartAbsolutePeriod(startTime);
    return periodMapper.startOf(startPeriod);
  }

  /// @inheritdoc ISchedule
  function previousInterestDueTimeAt(
    uint256 startTime,
    uint256 timestamp
  ) public view override returns (uint256) {
    uint256 interestPeriod = interestPeriodAt(startTime, timestamp);
    return interestPeriod > 0 ? _startOfInterestPeriod(startTime, interestPeriod) : 0;
  }

  /// @inheritdoc ISchedule
  function previousPrincipalDueTimeAt(
    uint256 startTime,
    uint256 timestamp
  ) public view override returns (uint256) {
    uint256 principalPeriod = principalPeriodAt(startTime, timestamp);
    return principalPeriod > 0 ? _startOfPrincipalPeriod(startTime, principalPeriod) : 0;
  }

  /// @inheritdoc ISchedule
  function nextPrincipalDueTimeAt(
    uint256 startTime,
    uint256 timestamp
  ) public view override returns (uint256) {
    uint256 nextPrincipalPeriod = Math.min(
      totalPrincipalPeriods(),
      principalPeriodAt(startTime, timestamp) + 1
    );
    return _startOfPrincipalPeriod(startTime, nextPrincipalPeriod);
  }

  /// @inheritdoc ISchedule
  function nextInterestDueTimeAt(
    uint256 startTime,
    uint256 timestamp
  ) public view override returns (uint256) {
    uint256 nextInterestPeriod = Math.min(
      totalInterestPeriods(),
      interestPeriodAt(startTime, timestamp) + 1
    );
    return _startOfInterestPeriod(startTime, nextInterestPeriod);
  }

  /// @inheritdoc ISchedule
  function periodEndTime(uint256 startTime, uint256 period) public view override returns (uint256) {
    uint256 absPeriod = _periodToAbsolutePeriod(startTime, period);
    return periodMapper.startOf(absPeriod + 1);
  }

  //===============================================================================
  // Internal functions
  //===============================================================================

  function _termEndAbsolutePeriod(uint256 startTime) internal view returns (uint256) {
    return _termStartAbsolutePeriod(startTime) + periodsInTerm;
  }

  function _termStartAbsolutePeriod(uint256 startTime) internal view returns (uint256) {
    return periodMapper.periodOf(startTime) + 1;
  }

  function _periodToPrincipalPeriod(uint256 p) internal view returns (uint256) {
    return (p / periodsPerPrincipalPeriod).saturatingSub(gracePrincipalPeriods);
  }

  function _periodToInterestPeriod(uint256 p) internal view returns (uint256) {
    return p / periodsPerInterestPeriod;
  }

  function _interestPeriodToPeriod(uint256 p) internal view returns (uint256) {
    return p * periodsPerInterestPeriod;
  }

  function _principalPeriodToPeriod(uint256 p) internal view returns (uint256) {
    return p * periodsPerPrincipalPeriod;
  }

  function _periodToAbsolutePeriod(uint256 startTime, uint256 p) internal view returns (uint256) {
    return _termStartAbsolutePeriod(startTime) + p;
  }

  function _startOfPrincipalPeriod(
    uint256 startTime,
    uint256 principalPeriod
  ) internal view returns (uint256) {
    uint256 period = _principalPeriodToPeriod(principalPeriod + gracePrincipalPeriods);
    uint256 absPeriod = _periodToAbsolutePeriod(startTime, period);
    return periodMapper.startOf(absPeriod);
  }

  function _startOfInterestPeriod(
    uint256 startTime,
    uint256 interestPeriod
  ) internal view returns (uint256) {
    uint256 period = _interestPeriodToPeriod(interestPeriod);
    uint256 absPeriod = _periodToAbsolutePeriod(startTime, period);
    return periodMapper.startOf(absPeriod);
  }
}
