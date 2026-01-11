// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import {CountersUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

import {LendaConfig} from "./LendaConfig.sol";
import {LendaConfigHelper} from "./LendaConfigHelper.sol";
import {BaseUpgradeablePausable} from "./BaseUpgradeablePausable.sol";
import {ConfigurableRoyaltyStandard} from "./ConfigurableRoyaltyStandard.sol";
import {ITranchedPool} from "../../interfaces/ITranchedPool.sol";
import {IPoolTokens} from "../../interfaces/IPoolTokens.sol";
import {IBackerRewards} from "../../interfaces/IBackerRewards.sol";

/**
 * @title PoolTokens
 * @notice PoolTokens is an ERC721 compliant contract, which can represent
 *  junior tranche or senior tranche shares of any of the borrower pools.
 * @author Lenda Protocol
 */
contract PoolTokens is
  IPoolTokens,
  ERC721EnumerableUpgradeable,
  ERC721PausableUpgradeable,
  BaseUpgradeablePausable,
  IERC2981Upgradeable
{
  using CountersUpgradeable for CountersUpgradeable.Counter;
  using LendaConfigHelper for LendaConfig;

  LendaConfig public config;

  // tokenId => tokenInfo
  mapping(uint256 => TokenInfo) public tokens;
  // poolAddress => poolInfo
  mapping(address => PoolInfo) public pools;

  ConfigurableRoyaltyStandard.RoyaltyParams public royaltyParams;
  using ConfigurableRoyaltyStandard for ConfigurableRoyaltyStandard.RoyaltyParams;

  CountersUpgradeable.Counter public _tokenIdTracker;

  /*
    We are using our own initializer function so that OZ doesn't automatically
    set owner as msg.sender. Also, it lets us set our config contract
  */
  // solhint-disable-next-line func-name-mixedcase
  function __initialize__(address owner, LendaConfig _config) external initializer {
    require(
      owner != address(0) && address(_config) != address(0),
      "Owner and config addresses cannot be empty"
    );

    __BaseUpgradeablePausable__init(owner);
    __ERC721_init("Lenda Pool Tokens", "LENDA-PT");
    __ERC721Enumerable_init();
    __ERC721Pausable_init();

    config = _config;

    _setRoleAdmin(PAUSER_ROLE, OWNER_ROLE);
  }

  /// @inheritdoc IPoolTokens
  function mint(
    MintParams calldata params,
    address to
  ) external virtual override onlyPool whenNotPaused returns (uint256 tokenId) {
    address poolAddress = _msgSender();

    PoolInfo storage pool = pools[poolAddress];
    pool.totalMinted = pool.totalMinted + params.principalAmount;

    tokenId = _createToken({
      principalAmount: params.principalAmount,
      tranche: params.tranche,
      principalRedeemed: 0,
      interestRedeemed: 0,
      poolAddress: poolAddress,
      mintTo: to
    });

    config.getBackerRewards().setPoolTokenAccRewardsPerPrincipalDollarAtMint(_msgSender(), tokenId);
  }

  /// @inheritdoc IPoolTokens
  function redeem(
    uint256 tokenId,
    uint256 principalRedeemed,
    uint256 interestRedeemed
  ) external virtual override onlyPool whenNotPaused {
    TokenInfo storage token = tokens[tokenId];
    address poolAddr = token.pool;
    require(token.pool != address(0), "Invalid tokenId");
    require(_msgSender() == poolAddr, "Only the token's pool can redeem");

    PoolInfo storage pool = pools[poolAddr];
    pool.totalPrincipalRedeemed = pool.totalPrincipalRedeemed + principalRedeemed;
    require(pool.totalPrincipalRedeemed <= pool.totalMinted, "Cannot redeem more than we minted");

    token.principalRedeemed = token.principalRedeemed + principalRedeemed;
    require(
      token.principalRedeemed <= token.principalAmount,
      "Cannot redeem more than principal-deposited amount for token"
    );
    token.interestRedeemed = token.interestRedeemed + interestRedeemed;

    emit TokenRedeemed(
      ownerOf(tokenId),
      poolAddr,
      tokenId,
      principalRedeemed,
      interestRedeemed,
      token.tranche
    );
  }

  /** @notice reduce a given pool token's principalAmount and principalRedeemed by a specified amount
   *  @dev uses safemath to prevent underflow
   *  @param tokenId id of token to decrease
   *  @param amount amount to decrease by
   */
  function reducePrincipalAmount(uint256 tokenId, uint256 amount) external onlyAdmin {
    TokenInfo storage tokenInfo = tokens[tokenId];
    tokenInfo.principalAmount = tokenInfo.principalAmount - amount;
    tokenInfo.principalRedeemed = tokenInfo.principalRedeemed - amount;
  }

  /// @inheritdoc IPoolTokens
  function withdrawPrincipal(
    uint256 tokenId,
    uint256 principalAmount
  ) external virtual override onlyPool whenNotPaused {
    TokenInfo storage token = tokens[tokenId];
    address poolAddr = token.pool;
    require(_msgSender() == poolAddr, "Invalid sender");
    require(token.principalRedeemed == 0, "Token redeemed");
    require(token.principalAmount >= principalAmount, "Insufficient principal");

    PoolInfo storage pool = pools[poolAddr];
    pool.totalMinted = pool.totalMinted - principalAmount;
    require(pool.totalPrincipalRedeemed <= pool.totalMinted, "Cannot withdraw more than redeemed");

    token.principalAmount = token.principalAmount - principalAmount;

    emit TokenPrincipalWithdrawn(
      ownerOf(tokenId),
      poolAddr,
      tokenId,
      principalAmount,
      token.tranche
    );
  }

  /// @inheritdoc IPoolTokens
  function burn(uint256 tokenId) external virtual override whenNotPaused {
    TokenInfo memory token = _getTokenInfo(tokenId);
    address owner = ownerOf(tokenId);
    require(_isApprovedOrOwner(_msgSender(), tokenId) || (_validPool(_msgSender()) && token.pool == _msgSender()), "NA");
    require(
      token.principalRedeemed == token.principalAmount,
      "Can only burn fully redeemed tokens"
    );
    // If we let you burn with claimable backer rewards then it would blackhole your rewards,
    // so you must claim all rewards before burning
    require(config.getBackerRewards().poolTokenClaimableRewards(tokenId) == 0, "rewards>0");
    _destroyAndBurn(owner, address(token.pool), tokenId);
  }

  function getTokenInfo(uint256 tokenId) external view virtual override returns (TokenInfo memory) {
    return _getTokenInfo(tokenId);
  }

  function getPoolInfo(address pool) external view override returns (PoolInfo memory) {
    return pools[pool];
  }

  /// @inheritdoc IPoolTokens
  function onPoolCreated(address newPool) external override onlyLendaFactory {
    pools[newPool].created = true;
  }

  /**
   * @notice Returns a boolean representing whether the spender is the owner or the approved spender of the token
   * @param spender The address to check
   * @param tokenId The token id to check for
   * @return True if approved to redeem/transfer/burn the token, false if not
   */
  function isApprovedOrOwner(
    address spender,
    uint256 tokenId
  ) external view override returns (bool) {
    return _isApprovedOrOwner(spender, tokenId);
  }

  /**
   * @inheritdoc IPoolTokens
   */
  function splitToken(
    uint256 tokenId,
    uint256 newPrincipal1
  ) external override returns (uint256 tokenId1, uint256 tokenId2) {
    require(_isApprovedOrOwner(msg.sender, tokenId), "NA");
    TokenInfo memory tokenInfo = _getTokenInfo(tokenId);
    require(0 < newPrincipal1 && newPrincipal1 < tokenInfo.principalAmount, "IA");

    IBackerRewards.BackerRewardsTokenInfo memory backerRewardsTokenInfo = config
      .getBackerRewards()
      .getTokenInfo(tokenId);

    address tokenOwner = ownerOf(tokenId);
    _destroyAndBurn(tokenOwner, address(tokenInfo.pool), tokenId);

    (tokenId1, tokenId2) = _createSplitTokens(tokenInfo, tokenOwner, newPrincipal1);
    _setBackerRewardsForSplitTokens(
      tokenInfo,
      backerRewardsTokenInfo,
      tokenId1,
      tokenId2,
      newPrincipal1
    );

    emit TokenSplit({
      owner: tokenOwner,
      pool: tokenInfo.pool,
      tokenId: tokenId,
      newTokenId1: tokenId1,
      newPrincipal1: newPrincipal1,
      newTokenId2: tokenId2,
      newPrincipal2: tokenInfo.principalAmount - newPrincipal1
    });
  }

  /// @notice Initialize the backer rewards metadata for split tokens
  function _setBackerRewardsForSplitTokens(
    TokenInfo memory tokenInfo,
    IBackerRewards.BackerRewardsTokenInfo memory backerRewardsTokenInfo,
    uint256 newTokenId1,
    uint256 newTokenId2,
    uint256 newPrincipal1
  ) internal {
    uint256 rewardsClaimed1 = (backerRewardsTokenInfo.rewardsClaimed * newPrincipal1) /
      tokenInfo.principalAmount;

    config.getBackerRewards().setBackerRewardsTokenInfoOnSplit({
      originalBackerRewardsTokenInfo: backerRewardsTokenInfo,
      newTokenId: newTokenId1,
      newRewardsClaimed: rewardsClaimed1
    });

    config.getBackerRewards().setBackerRewardsTokenInfoOnSplit({
      originalBackerRewardsTokenInfo: backerRewardsTokenInfo,
      newTokenId: newTokenId2,
      newRewardsClaimed: backerRewardsTokenInfo.rewardsClaimed - rewardsClaimed1
    });
  }

  /// @notice Split tokenId into two new tokens. Assumes that newPrincipal1 is valid for the token's principalAmount
  function _createSplitTokens(
    TokenInfo memory tokenInfo,
    address tokenOwner,
    uint256 newPrincipal1
  ) internal returns (uint256 newTokenId1, uint256 newTokenId2) {
    // All new vals are proportional to the new token's principal
    uint256 principalRedeemed1 = (tokenInfo.principalRedeemed * newPrincipal1) /
      tokenInfo.principalAmount;
    uint256 interestRedeemed1 = (tokenInfo.interestRedeemed * newPrincipal1) /
      tokenInfo.principalAmount;

    newTokenId1 = _createToken(
      newPrincipal1,
      tokenInfo.tranche,
      principalRedeemed1,
      interestRedeemed1,
      tokenInfo.pool,
      tokenOwner
    );

    newTokenId2 = _createToken(
      tokenInfo.principalAmount - newPrincipal1,
      tokenInfo.tranche,
      tokenInfo.principalRedeemed - principalRedeemed1,
      tokenInfo.interestRedeemed - interestRedeemed1,
      tokenInfo.pool,
      tokenOwner
    );
  }

  /// @inheritdoc IPoolTokens
  function validPool(address sender) public view virtual override returns (bool) {
    return _validPool(sender);
  }

  /**
   * @notice Mint the token and save its metadata to storage
   * @return tokenId id of the created token
   */
  function _createToken(
    uint256 principalAmount,
    uint256 tranche,
    uint256 principalRedeemed,
    uint256 interestRedeemed,
    address poolAddress,
    address mintTo
  ) internal returns (uint256 tokenId) {
    _tokenIdTracker.increment();
    tokenId = _tokenIdTracker.current();

    tokens[tokenId] = TokenInfo({
      pool: poolAddress,
      tranche: tranche,
      principalAmount: principalAmount,
      principalRedeemed: principalRedeemed,
      interestRedeemed: interestRedeemed
    });

    _mint(mintTo, tokenId);

    emit TokenMinted({
      owner: mintTo,
      pool: poolAddress,
      tokenId: tokenId,
      amount: principalAmount,
      tranche: tranche
    });
  }

  function _destroyAndBurn(address owner, address pool, uint256 tokenId) internal {
    delete tokens[tokenId];
    _burn(tokenId);
    config.getBackerRewards().clearTokenInfo(tokenId);
    emit TokenBurned(owner, pool, tokenId);
  }

  function _validPool(address poolAddress) internal view virtual returns (bool) {
    return pools[poolAddress].created;
  }

  function _getTokenInfo(uint256 tokenId) internal view returns (TokenInfo memory) {
    return tokens[tokenId];
  }

  /// @inheritdoc IERC2981Upgradeable
  function royaltyInfo(
    uint256 _tokenId,
    uint256 _salePrice
  ) external view override returns (address, uint256) {
    return royaltyParams.royaltyInfo(_tokenId, _salePrice);
  }

  function setRoyaltyParams(address newReceiver, uint256 newRoyaltyPercent) external onlyAdmin {
    royaltyParams.setRoyaltyParams(newReceiver, newRoyaltyPercent);
  }

  // --- Overrides required by Solidity ---

  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC721EnumerableUpgradeable, AccessControlUpgradeable, IERC165Upgradeable, ERC721Upgradeable) returns (bool) {
    return
      interfaceId == type(IERC2981Upgradeable).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId,
    uint256 batchSize
  ) internal override(ERC721EnumerableUpgradeable, ERC721PausableUpgradeable) {
    super._beforeTokenTransfer(from, to, tokenId, batchSize);
  }

  function ownerOf(uint256 tokenId) public view override(ERC721Upgradeable, IERC721Upgradeable) returns (address) {
    return super.ownerOf(tokenId);
  }

  function balanceOf(address owner) public view override(ERC721Upgradeable, IERC721Upgradeable) returns (uint256) {
    return super.balanceOf(owner);
  }

  function isApprovedForAll(address owner, address operator) public view override(ERC721Upgradeable, IERC721Upgradeable) returns (bool) {
    return super.isApprovedForAll(owner, operator);
  }

  function getApproved(uint256 tokenId) public view override(ERC721Upgradeable, IERC721Upgradeable) returns (address) {
    return super.getApproved(tokenId);
  }

  function setApprovalForAll(address operator, bool approved) public override(ERC721Upgradeable, IERC721Upgradeable) {
    super.setApprovalForAll(operator, approved);
  }

  function transferFrom(address from, address to, uint256 tokenId) public override(ERC721Upgradeable, IERC721Upgradeable) {
    super.transferFrom(from, to, tokenId);
  }

  function safeTransferFrom(address from, address to, uint256 tokenId) public override(ERC721Upgradeable, IERC721Upgradeable) {
    super.safeTransferFrom(from, to, tokenId);
  }

  function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721Upgradeable, IERC721Upgradeable) {
    super.safeTransferFrom(from, to, tokenId, data);
  }

  function totalSupply() public view override(ERC721EnumerableUpgradeable, IERC721EnumerableUpgradeable) returns (uint256) {
    return super.totalSupply();
  }

  function tokenByIndex(uint256 index) public view override(ERC721EnumerableUpgradeable, IERC721EnumerableUpgradeable) returns (uint256) {
    return super.tokenByIndex(index);
  }

  function tokenOfOwnerByIndex(address owner, uint256 index) public view override(ERC721EnumerableUpgradeable, IERC721EnumerableUpgradeable) returns (uint256) {
    return super.tokenOfOwnerByIndex(owner, index);
  }

  modifier onlyLendaFactory() {
    require(_msgSender() == config.lendaFactoryAddress(), "Only Lenda factory is allowed");
    _;
  }

  modifier onlyPool() {
    require(_validPool(_msgSender()), "Invalid pool!");
    _;
  }
}
