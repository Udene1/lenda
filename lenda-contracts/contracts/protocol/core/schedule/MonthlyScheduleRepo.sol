// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ISchedule} from "../../../interfaces/ISchedule.sol";
import {IMonthlyScheduleRepo} from "../../../interfaces/IMonthlyScheduleRepo.sol";
import {IPeriodMapper} from "../../../interfaces/IPeriodMapper.sol";

import {MonthlyPeriodMapper} from "./MonthlyPeriodMapper.sol";
import {Schedule} from "./Schedule.sol";

/**
 * @notice Repository for re-usable schedules that function on calendar month periods.
 */
contract MonthlyScheduleRepo is IMonthlyScheduleRepo {
  IPeriodMapper public immutable override periodMapper;

  mapping(bytes32 => address) private schedules;

  constructor() {
    periodMapper = new MonthlyPeriodMapper();
  }

  /// @notice Get the schedule with the requested params.
  function getSchedule(
    uint256 periodsInTerm,
    uint256 periodsPerPrincipalPeriod,
    uint256 periodsPerInterestPeriod,
    uint256 gracePrincipalPeriods
  ) external view override returns (ISchedule) {
    bytes32 scheduleId = getScheduleId(
      periodsInTerm,
      periodsPerPrincipalPeriod,
      periodsPerInterestPeriod,
      gracePrincipalPeriods
    );
    address schedule = schedules[scheduleId];
    require(schedule != address(0), "Schedule doesn't exist");
    return ISchedule(schedule);
  }

  /// @notice Add a schedule with the provided params to the repo
  function createSchedule(
    uint256 periodsInTerm,
    uint256 periodsPerPrincipalPeriod,
    uint256 periodsPerInterestPeriod,
    uint256 gracePrincipalPeriods
  ) external override returns (ISchedule) {
    bytes32 scheduleId = getScheduleId(
      periodsInTerm,
      periodsPerPrincipalPeriod,
      periodsPerInterestPeriod,
      gracePrincipalPeriods
    );

    address schedule = schedules[scheduleId];

    // No need to create it again if it already exists
    if (schedule != address(0)) {
      return ISchedule(schedule);
    }

    Schedule newSchedule = new Schedule(
      periodMapper,
      periodsInTerm,
      periodsPerPrincipalPeriod,
      periodsPerInterestPeriod,
      gracePrincipalPeriods
    );
    schedules[scheduleId] = address(newSchedule);
    return newSchedule;
  }

  function getScheduleId(
    uint256 periodsInTerm,
    uint256 periodsPerPrincipalPeriod,
    uint256 periodsPerInterestPeriod,
    uint256 gracePrincipalPeriods
  ) private pure returns (bytes32) {
    bytes memory concattedParams = abi.encode(
      periodsInTerm,
      periodsPerPrincipalPeriod,
      periodsPerInterestPeriod,
      gracePrincipalPeriods
    );
    return keccak256(concattedParams);
  }
}
