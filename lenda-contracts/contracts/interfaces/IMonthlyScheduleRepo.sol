// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ISchedule} from "./ISchedule.sol";
import {IPeriodMapper} from "./IPeriodMapper.sol";

/**
 * @title IMonthlyScheduleRepo
 * @notice Interface for a repository of pre-defined monthly payment schedules.
 * @author Lenda Protocol
 */
interface IMonthlyScheduleRepo {
  function periodMapper() external view returns (IPeriodMapper);

  function getSchedule(
    uint256 periodsInTerm,
    uint256 periodsPerPrincipalPeriod,
    uint256 periodsPerInterestPeriod,
    uint256 gracePrincipalPeriods
  ) external view returns (ISchedule);

  /**
   * @notice Add a schedule with the provided params to the repo
   * @return schedule the schedule
   */
  function createSchedule(
    uint256 periodsInTerm,
    uint256 periodsPerPrincipalPeriod,
    uint256 periodsPerInterestPeriod,
    uint256 gracePrincipalPeriods
  ) external returns (ISchedule);
}
