// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ISchedule} from "./ISchedule.sol";
import {ITranchedPool} from "./ITranchedPool.sol";
import {ICreditLine} from "./ICreditLine.sol";

/**
 * @title ILendaFactory
 * @notice Interface for LendaFactory contract
 * @author Lenda Protocol
 */
interface ILendaFactory {
  function createCreditLine() external returns (ICreditLine);

  function createPool(
    address _borrower,
    uint256 _juniorFeePercent,
    uint256 _limit,
    uint256 _interestApr,
    ISchedule _schedule,
    uint256 _lateFeeApr,
    uint256 _fundableAt,
    uint256[] calldata _allowedUIDTypes,
    bool _seniorOnly
  ) external returns (ITranchedPool pool);

  function createBorrower(address owner) external returns (address);
}
