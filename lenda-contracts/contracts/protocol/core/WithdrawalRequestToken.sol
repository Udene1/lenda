// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import {LendaConfig} from "./LendaConfig.sol";
import {LendaConfigHelper} from "./LendaConfigHelper.sol";
import {IWithdrawalRequestToken} from "../../interfaces/IWithdrawalRequestToken.sol";
import {HasAdmin} from "./HasAdmin.sol";

/**
 * @title WithdrawalRequestToken
 * @notice NFT representing a withdrawal request from the Senior Pool.
 * @author Lenda Protocol
 */
contract WithdrawalRequestToken is
  IWithdrawalRequestToken,
  ERC721EnumerableUpgradeable,
  ERC721PausableUpgradeable,
  HasAdmin
{
  using LendaConfigHelper for LendaConfig;

  LendaConfig private config;
  uint256 private _tokenIdCounter;

  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  /**
   * @notice Initializer for the WithdrawalRequestToken.
   * @param owner The address that will be granted high-level roles.
   * @param _config The LendaConfig address.
   */
  function __initialize__(address owner, LendaConfig _config) external initializer {
    require(
      owner != address(0) && address(_config) != address(0),
      "Owner and config addresses cannot be empty"
    );

    __ERC721_init("Lenda SeniorPool Withdrawal Tokens", "LENDA-WITHDRAW");
    __ERC721Enumerable_init();
    __ERC721Pausable_init();
    __AccessControl_init();

    config = _config;

    _grantRole(PAUSER_ROLE, owner);
    _grantRole(OWNER_ROLE, owner);
    _grantRole(DEFAULT_ADMIN_ROLE, owner);

    _setRoleAdmin(PAUSER_ROLE, OWNER_ROLE);
    _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
  }

  /// @inheritdoc IWithdrawalRequestToken
  function mint(address receiver) external override onlySeniorPool returns (uint256) {
    _tokenIdCounter++;
    uint256 newTokenId = _tokenIdCounter;
    _safeMint(receiver, newTokenId);
    return newTokenId;
  }

  /// @inheritdoc IWithdrawalRequestToken
  function burn(uint256 tokenId) external override onlySeniorPool {
    _burn(tokenId);
  }

  function pause() external onlyRole(PAUSER_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  // --- Overrides required by Solidity ---

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId,
    uint256 batchSize
  ) internal override(ERC721EnumerableUpgradeable, ERC721PausableUpgradeable) {
    super._beforeTokenTransfer(from, to, tokenId, batchSize);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC721EnumerableUpgradeable, AccessControlUpgradeable, IERC165Upgradeable, ERC721Upgradeable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function ownerOf(uint256 tokenId) public view override(ERC721Upgradeable, IERC721Upgradeable) returns (address) {
    return super.ownerOf(tokenId);
  }

  function isApprovedForAll(address owner, address operator) public view override(ERC721Upgradeable, IERC721Upgradeable) returns (bool) {
    return super.isApprovedForAll(owner, operator);
  }

  function balanceOf(address owner) public view override(ERC721Upgradeable, IERC721Upgradeable) returns (uint256) {
    return super.balanceOf(owner);
  }

  function getApproved(uint256 tokenId) public view override(ERC721Upgradeable, IERC721Upgradeable) returns (address) {
    return super.getApproved(tokenId);
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

  // --- Disabled Transfers ---

  function approve(address, uint256) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
    revert("Disabled");
  }

  function setApprovalForAll(address, bool) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
    revert("Disabled");
  }

  function transferFrom(address, address, uint256) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
    revert("Disabled");
  }

  function safeTransferFrom(address, address, uint256) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
    revert("Disabled");
  }

  function safeTransferFrom(
    address,
    address,
    uint256,
    bytes memory
  ) public virtual override(ERC721Upgradeable, IERC721Upgradeable) {
    revert("Disabled");
  }

  modifier onlySeniorPool() {
    require(msg.sender == address(config.getSeniorPool()), "Only SeniorPool can call this");
    _;
  }
}
