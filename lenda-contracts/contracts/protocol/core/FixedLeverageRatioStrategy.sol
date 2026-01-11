// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseUpgradeablePausable} from "./BaseUpgradeablePausable.sol";
import {LendaConfigHelper} from "./LendaConfigHelper.sol";
import {LendaConfig} from "./LendaConfig.sol";
import {LeverageRatioStrategy} from "./LeverageRatioStrategy.sol";
import {ISeniorPoolStrategy} from "../../interfaces/ISeniorPoolStrategy.sol";
import {ISeniorPool} from "../../interfaces/ISeniorPool.sol";
import {ITranchedPool} from "../../interfaces/ITranchedPool.sol";

/**
 * @title FixedLeverageRatioStrategy
 * @notice Concrete implementation of LeverageRatioStrategy with a fixed ratio from config.
 * @author Lenda Protocol
 */
contract FixedLeverageRatioStrategy is LeverageRatioStrategy {
  LendaConfig public config;
  using LendaConfigHelper for LendaConfig;

  event LendaConfigUpdated(address indexed who, address configAddress);

  function initialize(address owner, LendaConfig _config) public initializer {
    require(
      owner != address(0) && address(_config) != address(0),
      "Owner and config addresses cannot be empty"
    );
    __BaseUpgradeablePausable__init(owner);
    config = _config;
  }

  function getLeverageRatio(ITranchedPool) public view override returns (uint256) {
    return config.getLeverageRatio();
  }
}
