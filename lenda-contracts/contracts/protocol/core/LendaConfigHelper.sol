// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {ImplementationRepository} from "./proxy/ImplementationRepository.sol";
import {LendaConfigOptions} from "./LendaConfigOptions.sol";
import {LendaConfig} from "./LendaConfig.sol";
import {IFidu} from "../../interfaces/IFidu.sol";
import {IWithdrawalRequestToken} from "../../interfaces/IWithdrawalRequestToken.sol";
import {ISeniorPool} from "../../interfaces/ISeniorPool.sol";
import {ISeniorPoolStrategy} from "../../interfaces/ISeniorPoolStrategy.sol";
import {IERC20withDec} from "../../interfaces/IERC20withDec.sol";
import {ICUSDCContract} from "../../interfaces/ICUSDCContract.sol";
import {IPoolTokens} from "../../interfaces/IPoolTokens.sol";
import {IBackerRewards} from "../../interfaces/IBackerRewards.sol";
import {ILendaFactory} from "../../interfaces/ILendaFactory.sol";
import {IGo} from "../../interfaces/IGo.sol";

/**
 * @title LendaConfigHelper
 * @notice A convenience library for getting easy access to other contracts and constants within the
 *  protocol, through the use of the LendaConfig contract
 * @author Lenda Protocol
 */

library LendaConfigHelper {
  function getSeniorPool(LendaConfig config) internal view returns (ISeniorPool) {
    return ISeniorPool(seniorPoolAddress(config));
  }

  function getSeniorPoolStrategy(
    LendaConfig config
  ) internal view returns (ISeniorPoolStrategy) {
    return ISeniorPoolStrategy(seniorPoolStrategyAddress(config));
  }

  function getUSDC(LendaConfig config) internal view returns (IERC20withDec) {
    return IERC20withDec(usdcAddress(config));
  }

  function getFidu(LendaConfig config) internal view returns (IFidu) {
    return IFidu(fiduAddress(config));
  }

  function getCUSDCContract(LendaConfig config) internal view returns (ICUSDCContract) {
    return ICUSDCContract(cusdcContractAddress(config));
  }

  function getPoolTokens(LendaConfig config) internal view returns (IPoolTokens) {
    return IPoolTokens(poolTokensAddress(config));
  }

  function getBackerRewards(LendaConfig config) internal view returns (IBackerRewards) {
    return IBackerRewards(backerRewardsAddress(config));
  }

  function getLendaFactory(LendaConfig config) internal view returns (ILendaFactory) {
    return ILendaFactory(lendaFactoryAddress(config));
  }

  function getGFI(LendaConfig config) internal view returns (IERC20withDec) {
    return IERC20withDec(gfiAddress(config));
  }

  function getGo(LendaConfig config) internal view returns (IGo) {
    return IGo(goAddress(config));
  }

  function getTranchedPoolImplementationRepository(
    LendaConfig config
  ) internal view returns (ImplementationRepository) {
    return
      ImplementationRepository(
        config.getAddress(uint256(LendaConfigOptions.Addresses.TranchedPoolImplementationRepository))
      );
  }

  function getCallableLoanImplementationRepository(
    LendaConfig config
  ) internal view returns (ImplementationRepository) {
    return
      ImplementationRepository(
        config.getAddress(uint256(LendaConfigOptions.Addresses.CallableLoanImplementationRepository))
      );
  }

  function getWithdrawalRequestToken(
    LendaConfig config
  ) internal view returns (IWithdrawalRequestToken) {
    return
      IWithdrawalRequestToken(
        config.getAddress(uint256(LendaConfigOptions.Addresses.WithdrawalRequestToken))
      );
  }

  function oneInchAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.OneInch));
  }

  function creditLineImplementationAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.CreditLineImplementation));
  }

  function trustedForwarderAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.TrustedForwarder));
  }

  function configAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.LendaConfig));
  }

  function poolTokensAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.PoolTokens));
  }

  function backerRewardsAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.BackerRewards));
  }

  function seniorPoolAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.SeniorPool));
  }

  function seniorPoolStrategyAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.SeniorPoolStrategy));
  }

  function lendaFactoryAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.LendaFactory));
  }

  function gfiAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.GFI));
  }

  function fiduAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.Fidu));
  }

  function cusdcContractAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.CUSDCContract));
  }

  function usdcAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.USDC));
  }

  function tranchedPoolAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.TranchedPoolImplementation));
  }

  function reserveAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.TreasuryReserve));
  }

  function protocolAdminAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.ProtocolAdmin));
  }

  function borrowerImplementationAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.BorrowerImplementation));
  }

  function goAddress(LendaConfig config) internal view returns (address) {
    return config.getAddress(uint256(LendaConfigOptions.Addresses.Go));
  }

  function getReserveDenominator(LendaConfig config) internal view returns (uint256) {
    return config.getNumber(uint256(LendaConfigOptions.Numbers.ReserveDenominator));
  }

  function getWithdrawFeeDenominator(LendaConfig config) internal view returns (uint256) {
    return config.getNumber(uint256(LendaConfigOptions.Numbers.WithdrawFeeDenominator));
  }

  function getLatenessGracePeriodInDays(LendaConfig config) internal view returns (uint256) {
    return config.getNumber(uint256(LendaConfigOptions.Numbers.LatenessGracePeriodInDays));
  }

  function getLatenessMaxDays(LendaConfig config) internal view returns (uint256) {
    return config.getNumber(uint256(LendaConfigOptions.Numbers.LatenessMaxDays));
  }

  function getDrawdownPeriodInSeconds(LendaConfig config) internal view returns (uint256) {
    return config.getNumber(uint256(LendaConfigOptions.Numbers.DrawdownPeriodInSeconds));
  }

  function getTransferRestrictionPeriodInDays(
    LendaConfig config
  ) internal view returns (uint256) {
    return config.getNumber(uint256(LendaConfigOptions.Numbers.TransferRestrictionPeriodInDays));
  }

  function getLeverageRatio(LendaConfig config) internal view returns (uint256) {
    return config.getNumber(uint256(LendaConfigOptions.Numbers.LeverageRatio));
  }

  function getSeniorPoolWithdrawalCancelationFeeInBps(
    LendaConfig config
  ) internal view returns (uint256) {
    return config.getNumber(uint256(LendaConfigOptions.Numbers.SeniorPoolWithdrawalCancelationFeeInBps));
  }
}
