// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ITranchedPool} from "../../interfaces/ITranchedPool.sol";
import {ILoan, LoanType} from "../../interfaces/ILoan.sol";
import {IRequiresUID} from "../../interfaces/IRequiresUID.sol";
import {IERC20withDec} from "../../interfaces/IERC20withDec.sol";
import {ICreditLine} from "../../interfaces/ICreditLine.sol";
import {ITranchedCreditLineInitializable} from "../../interfaces/ITranchedCreditLineInitializable.sol";
import {IBackerRewards} from "../../interfaces/IBackerRewards.sol";
import {IPoolTokens} from "../../interfaces/IPoolTokens.sol";
import {IVersioned} from "../../interfaces/IVersioned.sol";
import {ISchedule} from "../../interfaces/ISchedule.sol";
import {LendaConfig} from "./LendaConfig.sol";
import {BaseUpgradeablePausable} from "./BaseUpgradeablePausable.sol";
import {LendaConfigHelper} from "./LendaConfigHelper.sol";
import {SafeERC20Transfer} from "../../library/SafeERC20Transfer.sol";
import {TranchingLogic} from "./TranchingLogic.sol";

interface IERC20Permit {
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
}

/// @title The main contract to faciliate lending. Backers and the Senior Pool fund the loan
///   through this contract. The borrower draws down on and pays back a loan through this contract.
/// @author Lenda Protocol
contract TranchedPool is BaseUpgradeablePausable, ITranchedPool, IRequiresUID, IVersioned {
  LendaConfig public config;

  using LendaConfigHelper for LendaConfig;
  using TranchingLogic for ITranchedPool.PoolSlice;
  using TranchingLogic for ITranchedPool.TrancheInfo;
  using SafeERC20Transfer for IERC20withDec;

  bytes32 public constant LOCKER_ROLE = keccak256("LOCKER_ROLE");
  bytes32 public constant SENIOR_ROLE = keccak256("SENIOR_ROLE");
  uint8 internal constant MAJOR_VERSION = 1;
  uint8 internal constant MINOR_VERSION = 0;
  uint8 internal constant PATCH_VERSION = 1;

  ICreditLine public override creditLine;
  uint256 public override createdAt;
  uint256 public juniorFeePercent;
  bool public drawdownsPaused;
  uint256[] public allowedUIDTypes;
  uint256 public totalDeployed;
  uint256 public fundableAt;
  bool public seniorOnly;

  mapping(uint256 => ITranchedPool.PoolSlice) internal _poolSlices;

  /// @inheritdoc ITranchedPool
  uint256 public override numSlices;

  /// @inheritdoc ITranchedPool
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
  ) public override initializer {
    require(address(_config) != address(0) && address(_borrower) != address(0), "ZERO");
    require(_juniorFeePercent <= 100, "JF");

    config = LendaConfig(_config);
    address owner = config.protocolAdminAddress();
    __BaseUpgradeablePausable__init(owner);
    _initializeNextSlice(_fundableAt);
    _createAndSetCreditLine(_borrower, _limit, _interestApr, _schedule, _lateFeeApr);

    createdAt = block.timestamp;
    juniorFeePercent = _juniorFeePercent;
    if (_allowedUIDTypes.length == 0) {
      uint256[] memory defaultAllowedUIDTypes = new uint256[](1);
      defaultAllowedUIDTypes[0] = config.getGo().ID_TYPE_0();
      allowedUIDTypes = defaultAllowedUIDTypes;
    } else {
      allowedUIDTypes = _allowedUIDTypes;
    }

    _setupRole(LOCKER_ROLE, _borrower);
    _setupRole(LOCKER_ROLE, owner);
    _setRoleAdmin(LOCKER_ROLE, OWNER_ROLE);
    _setRoleAdmin(SENIOR_ROLE, OWNER_ROLE);

    // Give the senior pool the ability to deposit into the senior pool
    _setupRole(SENIOR_ROLE, address(config.getSeniorPool()));
    seniorOnly = _seniorOnly;
  }

  function setAllowedUIDTypes(uint256[] calldata ids) external onlyLocker {
    require(
      _poolSlices[0].juniorTranche.principalDeposited == 0 &&
        _poolSlices[0].seniorTranche.principalDeposited == 0,
      "has balance"
    );
    allowedUIDTypes = ids;
  }

  function getAllowedUIDTypes() external view override returns (uint256[] memory) {
    return allowedUIDTypes;
  }

  /// @notice Intentionable no-op. Included to be compatible with the v1 pool interface
  // solhint-disable-next-line no-empty-blocks
  function assess() external override whenNotPaused {}

  /// @inheritdoc ILoan
  function deposit(
    uint256 tranche,
    uint256 amount
  ) public override nonReentrant whenNotPaused returns (uint256) {
    ITranchedPool.TrancheInfo storage trancheInfo = _getTrancheInfo(tranche);
    require(trancheInfo.lockedUntil == 0, "TL");
    require(amount > 0, "IA");
    require(hasAllowedUID(msg.sender), "NA");
    require(block.timestamp >= fundableAt, "Not open");
    // senior tranche ids are always odd numbered
    if (TranchingLogic.isSeniorTrancheId(trancheInfo.id)) {
      require(hasRole(SENIOR_ROLE, _msgSender()), "NA");
    }

    trancheInfo.principalDeposited = trancheInfo.principalDeposited + amount;
    uint256 tokenId = config.getPoolTokens().mint(
      IPoolTokens.MintParams({tranche: tranche, principalAmount: amount}),
      msg.sender
    );

    config.getUSDC().safeERC20TransferFrom(msg.sender, address(this), amount);
    emit DepositMade(msg.sender, tranche, tokenId, amount);
    return tokenId;
  }

  function depositWithPermit(
    uint256 tranche,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public override whenNotPaused returns (uint256 tokenId) {
    IERC20Permit(config.usdcAddress()).permit(msg.sender, address(this), amount, deadline, v, r, s);
    return deposit(tranche, amount);
  }

  /// @inheritdoc ILoan
  function withdraw(
    uint256 tokenId,
    uint256 amount
  ) public override nonReentrant whenNotPaused returns (uint256, uint256) {
    IPoolTokens.TokenInfo memory tokenInfo = config.getPoolTokens().getTokenInfo(tokenId);
    ITranchedPool.TrancheInfo storage trancheInfo = _getTrancheInfo(tokenInfo.tranche);

    return _withdraw(trancheInfo, tokenInfo, tokenId, amount);
  }

  /// @inheritdoc ILoan
  function withdrawMultiple(
    uint256[] calldata tokenIds,
    uint256[] calldata amounts
  ) public override {
    require(tokenIds.length == amounts.length, "LEN");

    for (uint256 i = 0; i < amounts.length; i++) {
      withdraw(tokenIds[i], amounts[i]);
    }
  }

  /// @inheritdoc ILoan
  function withdrawMax(
    uint256 tokenId
  )
    external
    override
    nonReentrant
    whenNotPaused
    returns (uint256 interestWithdrawn, uint256 principalWithdrawn)
  {
    IPoolTokens.TokenInfo memory tokenInfo = config.getPoolTokens().getTokenInfo(tokenId);
    ITranchedPool.TrancheInfo storage trancheInfo = _getTrancheInfo(tokenInfo.tranche);

    (uint256 interestRedeemable, uint256 principalRedeemable) = TranchingLogic
      .redeemableInterestAndPrincipal(trancheInfo, tokenInfo);

    uint256 amount = interestRedeemable + principalRedeemable;

    return _withdraw(trancheInfo, tokenInfo, tokenId, amount);
  }

  /// @inheritdoc ILoan
  function drawdown(uint256 amount) external override onlyLocker whenNotPaused {
    drawdownTo(msg.sender, amount);
  }

  function drawdownTo(address to, uint256 amount) public override onlyLocker whenNotPaused {
    require(!drawdownsPaused, "DP");
    if (!_locked()) {
      _lockPool();
    }
    ITranchedPool.PoolSlice storage currentSlice = _poolSlices[numSlices - 1];
    uint256 amountAvailable = TranchingLogic.sharePriceToUsdc(
      currentSlice.juniorTranche.principalSharePrice,
      currentSlice.juniorTranche.principalDeposited
    );
    amountAvailable = amountAvailable +
      TranchingLogic.sharePriceToUsdc(
        currentSlice.seniorTranche.principalSharePrice,
        currentSlice.seniorTranche.principalDeposited
      );

    require(amount <= amountAvailable, "IF");

    creditLine.drawdown(amount);

    uint256 amountRemaining = amountAvailable - amount;
    uint256 oldJuniorPrincipalSharePrice = currentSlice.juniorTranche.principalSharePrice;
    uint256 oldSeniorPrincipalSharePrice = currentSlice.seniorTranche.principalSharePrice;
    currentSlice.juniorTranche.principalSharePrice = currentSlice
      .juniorTranche
      .calculateExpectedSharePrice(amountRemaining, currentSlice);
    currentSlice.seniorTranche.principalSharePrice = currentSlice
      .seniorTranche
      .calculateExpectedSharePrice(amountRemaining, currentSlice);
    currentSlice.principalDeployed = currentSlice.principalDeployed + amount;
    totalDeployed = totalDeployed + amount;

    IBackerRewards backerRewards = IBackerRewards(config.backerRewardsAddress());
    backerRewards.onTranchedPoolDrawdown(numSlices - 1);
    config.getUSDC().safeERC20Transfer(to, amount);
    emit DrawdownMade(to, amount);
    emit SharePriceUpdated(
      address(this),
      currentSlice.juniorTranche.id,
      currentSlice.juniorTranche.principalSharePrice,
      int256(oldJuniorPrincipalSharePrice) - int256(currentSlice.juniorTranche.principalSharePrice),
      currentSlice.juniorTranche.interestSharePrice,
      0
    );
    emit SharePriceUpdated(
      address(this),
      currentSlice.seniorTranche.id,
      currentSlice.seniorTranche.principalSharePrice,
      int256(oldSeniorPrincipalSharePrice) - int256(currentSlice.seniorTranche.principalSharePrice),
      currentSlice.seniorTranche.interestSharePrice,
      0
    );
  }

  function NUM_TRANCHES_PER_SLICE() external pure returns (uint256) {
    return TranchingLogic.NUM_TRANCHES_PER_SLICE;
  }

  /// @inheritdoc ITranchedPool
  function lockJuniorCapital() external override onlyLocker whenNotPaused {
    _lockJuniorCapital(numSlices - 1);
  }

  /// @inheritdoc ITranchedPool
  function lockPool() external override onlyLocker whenNotPaused {
    _lockPool();
  }

  /// @inheritdoc ILoan
  function setFundableAt(uint256 newFundableAt) external override onlyLocker {
    fundableAt = newFundableAt;
  }

  /// @inheritdoc ITranchedPool
  function initializeNextSlice(uint256 _fundableAt) external override onlyLocker whenNotPaused {
    require(_locked(), "NL");
    require(!creditLine.isLate(), "LP");
    require(creditLine.withinPrincipalGracePeriod(), "GP");
    _initializeNextSlice(_fundableAt);
    emit SliceCreated(address(this), numSlices - 1);
  }

  /// @inheritdoc ILoan
  function getAmountsOwed(
    uint256 timestamp
  )
    external
    view
    override
    returns (uint256 interestOwed, uint256 interestAccrued, uint256 principalOwed)
  {
    require(timestamp >= block.timestamp, "IT");
    require(creditLine.termEndTime() > 0, "LI");

    return (
      creditLine.interestOwedAt(timestamp),
      creditLine.interestAccruedAt(timestamp),
      creditLine.principalOwedAt(timestamp)
    );
  }

  /// @inheritdoc ILoan
  function pay(
    uint256 amount
  ) external override nonReentrant whenNotPaused returns (PaymentAllocation memory) {
    require(amount > 0, "ZA");
    uint256 maxPayableAmount = creditLine.interestAccrued() + creditLine.interestOwed() +
      creditLine.balance();
    uint256 amountToPay = Math.min(amount, maxPayableAmount);
    config.getUSDC().safeERC20TransferFrom(msg.sender, address(this), amountToPay);

    PaymentAllocation memory pa = _pay(amount);

    assert(pa.paymentRemaining == 0);
    return pa;
  }

  /// @inheritdoc ITranchedPool
  function pay(
    uint256 principalAmount,
    uint256 interestAmount
  ) external override nonReentrant whenNotPaused returns (PaymentAllocation memory) {
    uint256 totalPayment = principalAmount + interestAmount;
    require(totalPayment > 0, "ZA");

    uint256 principalToPay = Math.min(principalAmount, creditLine.balance());

    uint256 maxPayableInterest = creditLine.interestAccrued() + creditLine.interestOwed();
    uint256 interestToPay = Math.min(interestAmount, maxPayableInterest);
    config.getUSDC().safeERC20TransferFrom(
      msg.sender,
      address(this),
      principalToPay + interestToPay
    );
    PaymentAllocation memory pa = _pay(principalToPay, interestToPay);

    assert(pa.paymentRemaining == 0);
    return pa;
  }

  /// @notice Pauses the pool and sweeps any remaining funds to the treasury reserve.
  function emergencyShutdown() public onlyAdmin {
    if (!paused()) {
      pause();
    }

    IERC20withDec usdc = config.getUSDC();
    address reserveAddress = config.reserveAddress();
    uint256 poolBalance = usdc.balanceOf(address(this));
    if (poolBalance > 0) {
      config.getUSDC().safeERC20Transfer(reserveAddress, poolBalance);
    }

    uint256 clBalance = usdc.balanceOf(address(creditLine));
    if (clBalance > 0) {
      usdc.safeERC20TransferFrom(address(creditLine), reserveAddress, clBalance);
    }
    emit EmergencyShutdown(address(this));
  }

  /// @notice Pauses all drawdowns (but not deposits/withdraws)
  function pauseDrawdowns() public onlyAdmin {
    drawdownsPaused = true;
    emit DrawdownsPaused(address(this));
  }

  /// @notice Unpause drawdowns
  function unpauseDrawdowns() public onlyAdmin {
    drawdownsPaused = false;
    emit DrawdownsUnpaused(address(this));
  }

  // CreditLine proxy method
  function setLimit(uint256 newAmount) external onlyAdmin {
    return creditLine.setLimit(newAmount);
  }

  function setMaxLimit(uint256 newAmount) external onlyAdmin {
    return creditLine.setMaxLimit(newAmount);
  }

  /// @inheritdoc ITranchedPool
  function getTranche(
    uint256 tranche
  ) public view override returns (ITranchedPool.TrancheInfo memory) {
    return _getTrancheInfo(tranche);
  }

  /// @inheritdoc ITranchedPool
  function poolSlices(
    uint256 index
  ) external view override returns (ITranchedPool.PoolSlice memory) {
    return _poolSlices[index];
  }

  /// @inheritdoc ITranchedPool
  function totalJuniorDeposits() external view override returns (uint256) {
    uint256 total;
    for (uint256 i = 0; i < numSlices; i++) {
      total = total + _poolSlices[i].juniorTranche.principalDeposited;
    }
    return total;
  }

  /// @inheritdoc ILoan
  function getLoanType() external view override returns (LoanType) {
    return LoanType.TranchedPool;
  }

  /// @inheritdoc ILoan
  function availableToWithdraw(uint256 tokenId) public view override returns (uint256, uint256) {
    IPoolTokens.TokenInfo memory tokenInfo = config.getPoolTokens().getTokenInfo(tokenId);
    ITranchedPool.TrancheInfo storage trancheInfo = _getTrancheInfo(tokenInfo.tranche);

    if (block.timestamp > trancheInfo.lockedUntil) {
      return TranchingLogic.redeemableInterestAndPrincipal(trancheInfo, tokenInfo);
    } else {
      return (0, 0);
    }
  }

  function hasAllowedUID(address sender) public view override returns (bool) {
    return config.getGo().goOnlyIdTypes(sender, allowedUIDTypes);
  }

  /* Internal functions  */

  function _pay(
    uint256 principalPayment,
    uint256 interestPayment
  ) internal returns (PaymentAllocation memory) {
    require(_locked(), "NL");

    uint256 totalInterestAccruedAtLastCheckpoint = creditLine.totalInterestAccruedAt(
      creditLine.interestAccruedAsOf()
    );
    PaymentAllocation memory pa = creditLine.pay(principalPayment, interestPayment);
    uint256 interestAccruedSinceLastCheckpoint = creditLine.totalInterestAccrued() -
      totalInterestAccruedAtLastCheckpoint;

    distributeToSlicesAndAllocateBackerRewards(interestAccruedSinceLastCheckpoint, pa);
    return pa;
  }

  function _pay(uint256 paymentAmount) internal returns (PaymentAllocation memory) {
    require(_locked(), "NL");

    uint256 interestAccrued = creditLine.totalInterestAccruedAt(creditLine.interestAccruedAsOf());
    PaymentAllocation memory pa = creditLine.pay(paymentAmount);
    interestAccrued = creditLine.totalInterestAccrued() - interestAccrued;

    distributeToSlicesAndAllocateBackerRewards(interestAccrued, pa);
    return pa;
  }

  function distributeToSlicesAndAllocateBackerRewards(
    uint256 interestAccrued,
    PaymentAllocation memory pa
  ) internal {
    uint256[] memory principalPaymentsPerSlice = new uint256[](numSlices);
    for (uint256 i = 0; i < numSlices; i++) {
      ITranchedPool.PoolSlice storage slice = _poolSlices[i];
      uint256 interestForSlice = TranchingLogic.scaleByFraction(
        interestAccrued,
        slice.principalDeployed,
        totalDeployed
      );
      principalPaymentsPerSlice[i] = TranchingLogic.scaleByFraction(
        pa.principalPayment + pa.additionalBalancePayment,
        slice.principalDeployed,
        totalDeployed
      );
      _poolSlices[i].totalInterestAccrued = _poolSlices[i].totalInterestAccrued +
        interestForSlice;
    }

    uint256 interestPayment = pa.owedInterestPayment + pa.accruedInterestPayment;
    uint256 principalPayment = pa.principalPayment + pa.additionalBalancePayment;
    if (interestPayment > 0 || principalPayment > 0) {
      uint256 reserveAmount = _collectInterestAndPrincipal(interestPayment, principalPayment);

      uint256 principalPaymentsToSlices = 0;
      for (uint256 i = 0; i < numSlices; i++) {
        _poolSlices[i].principalDeployed = _poolSlices[i].principalDeployed -
          principalPaymentsPerSlice[i];
        principalPaymentsToSlices = principalPaymentsToSlices + principalPaymentsPerSlice[i];
      }

      totalDeployed = totalDeployed - principalPaymentsToSlices;

      config.getBackerRewards().allocateRewards(interestPayment);

      emit PaymentApplied(
        creditLine.borrower(),
        address(this),
        pa.owedInterestPayment + pa.accruedInterestPayment,
        principalPayment,
        pa.paymentRemaining,
        reserveAmount
      );
    }
  }

  function _collectInterestAndPrincipal(
    uint256 interest,
    uint256 principal
  ) internal returns (uint256) {
    uint256 totalReserveAmount = TranchingLogic.applyToAllSlices(
      _poolSlices,
      numSlices,
      interest,
      principal,
      100 / config.getReserveDenominator(),
      totalDeployed,
      creditLine,
      juniorFeePercent
    );

    config.getUSDC().safeERC20Transfer(config.reserveAddress(), totalReserveAmount);

    emit ReserveFundsCollected(address(this), totalReserveAmount);

    return totalReserveAmount;
  }

  function _createAndSetCreditLine(
    address _borrower,
    uint256 _maxLimit,
    uint256 _interestApr,
    ISchedule _schedule,
    uint256 _lateFeeApr
  ) internal {
    creditLine = ICreditLine(config.getLendaFactory().createCreditLine());
    ITranchedCreditLineInitializable(address(creditLine)).initialize(
      address(config),
      address(this),
      _borrower,
      _maxLimit,
      _interestApr,
      _schedule,
      _lateFeeApr
    );
  }

  function _withdraw(
    ITranchedPool.TrancheInfo storage trancheInfo,
    IPoolTokens.TokenInfo memory tokenInfo,
    uint256 tokenId,
    uint256 amount
  ) internal returns (uint256, uint256) {
    require(
      config.getPoolTokens().isApprovedOrOwner(msg.sender, tokenId) && hasAllowedUID(msg.sender),
      "NA"
    );
    require(amount > 0, "ZA");
    (uint256 interestRedeemable, uint256 principalRedeemable) = TranchingLogic
      .redeemableInterestAndPrincipal(trancheInfo, tokenInfo);
    uint256 netRedeemable = interestRedeemable + principalRedeemable;

    require(amount <= netRedeemable, "IA");
    require(block.timestamp > trancheInfo.lockedUntil, "TL");

    uint256 interestToRedeem = 0;
    uint256 principalToRedeem = 0;

    if (trancheInfo.lockedUntil == 0) {
      trancheInfo.principalDeposited = trancheInfo.principalDeposited - amount;

      principalToRedeem = amount;

      config.getPoolTokens().withdrawPrincipal(tokenId, principalToRedeem);
    } else {
      interestToRedeem = Math.min(interestRedeemable, amount);
      principalToRedeem = Math.min(principalRedeemable, amount - interestToRedeem);

      config.getPoolTokens().redeem(tokenId, principalToRedeem, interestToRedeem);
    }

    config.getUSDC().safeERC20Transfer(msg.sender, principalToRedeem + interestToRedeem);

    emit WithdrawalMade(
      msg.sender,
      tokenInfo.tranche,
      tokenId,
      interestToRedeem,
      principalToRedeem
    );

    return (interestToRedeem, principalToRedeem);
  }

  function _lockJuniorCapital(uint256 sliceId) internal {
    require(!_locked() && _poolSlices[sliceId].juniorTranche.lockedUntil == 0, "TL");
    TranchingLogic.lockTranche(_poolSlices[sliceId].juniorTranche, config);
  }

  function _lockPool() internal {
    ITranchedPool.PoolSlice storage slice = _poolSlices[numSlices - 1];
    require(slice.juniorTranche.lockedUntil > 0 || seniorOnly, "NL");
    require(slice.seniorTranche.lockedUntil == 0, "TL");

    uint256 currentTotal = slice.juniorTranche.principalDeposited +
      slice.seniorTranche.principalDeposited;
    creditLine.setLimit(Math.min(creditLine.limit() + currentTotal, creditLine.maxLimit()));

    TranchingLogic.lockTranche(slice.juniorTranche, config);
    TranchingLogic.lockTranche(slice.seniorTranche, config);
  }

  function _initializeNextSlice(uint256 newFundableAt) internal {
    require(numSlices < 5, "SL");
    TranchingLogic.initializeNextSlice(_poolSlices, numSlices);
    numSlices = numSlices + 1;
    fundableAt = newFundableAt;
  }

  function _locked() internal view returns (bool) {
    return numSlices == 0 || _poolSlices[numSlices - 1].seniorTranche.lockedUntil > 0;
  }

  function _getTrancheInfo(
    uint256 trancheId
  ) internal view returns (ITranchedPool.TrancheInfo storage) {
    require(
      trancheId > 0 && trancheId <= numSlices * TranchingLogic.NUM_TRANCHES_PER_SLICE,
      "invalid tranche"
    );
    uint256 sliceId = TranchingLogic.trancheIdToSliceIndex(trancheId);
    ITranchedPool.PoolSlice storage slice = _poolSlices[sliceId];
    ITranchedPool.TrancheInfo storage trancheInfo = TranchingLogic.isSeniorTrancheId(trancheId)
      ? slice.seniorTranche
      : slice.juniorTranche;
    return trancheInfo;
  }

  function getVersion() external pure override returns (uint8[3] memory version) {
    (version[0], version[1], version[2]) = (MAJOR_VERSION, MINOR_VERSION, PATCH_VERSION);
  }

  modifier onlyLocker() {
    require(hasRole(LOCKER_ROLE, msg.sender), "NA");
    _;
  }
}
