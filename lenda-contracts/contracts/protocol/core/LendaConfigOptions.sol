// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


/**
 * @title LendaConfigOptions
 * @notice A central place for enumerating the configurable options of our LendaConfig contract
 * @author Lenda Protocol
 */

library LendaConfigOptions {
  // NEVER EVER CHANGE THE ORDER OF THESE!
  // You can rename or append. But NEVER change the order.
  enum Numbers {
    TransactionLimit,
    TotalFundsLimit,
    MaxUnderwriterLimit,
    ReserveDenominator,
    WithdrawFeeDenominator,
    LatenessGracePeriodInDays,
    LatenessMaxDays,
    DrawdownPeriodInSeconds,
    TransferRestrictionPeriodInDays,
    LeverageRatio,
    SeniorPoolWithdrawalCancelationFeeInBps
  }

  enum Addresses {
    Pool, // 0 deprecated
    CreditLineImplementation, // 1
    LendaFactory, // 2 (was GoldfinchFactory)
    CreditDesk, // 3 deprecated
    Fidu, // 4
    USDC, // 5
    TreasuryReserve, // 6
    ProtocolAdmin, // 7
    OneInch, // 8
    TrustedForwarder, // 9 deprecated
    CUSDCContract, // 10
    LendaConfig, // 11 (was GoldfinchConfig)
    PoolTokens, // 12
    TranchedPoolImplementation, // 13
    SeniorPool, // 14
    SeniorPoolStrategy, // 15
    MigratedTranchedPoolImplementation, // 16
    BorrowerImplementation, // 17
    GFI, // 18
    Go, // 19
    BackerRewards, // 20
    StakingRewards, // 21
    FiduUSDCCurveLP, // 22
    TranchedPoolImplementationRepository, // 23
    WithdrawalRequestToken, // 24
    MonthlyScheduleRepo, // 25
    CallableLoanImplementationRepository, // 26
    BorrowerProfile, // 27
    LendaRewards, // 28
    LendaMetadataRegistry // 29
  }
}
