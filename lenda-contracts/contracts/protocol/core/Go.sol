// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseUpgradeablePausable} from "./BaseUpgradeablePausable.sol";
import {LendaConfigHelper} from "./LendaConfigHelper.sol";
import {LendaConfig} from "./LendaConfig.sol";
import {IGo} from "../../interfaces/IGo.sol";
import {IUniqueIdentity} from "../../interfaces/IUniqueIdentity.sol";

/**
 * @title Go
 * @notice Central registry for "go-listing" (KYC/KYB status check).
 * @author Lenda Protocol
 */
contract Go is IGo, BaseUpgradeablePausable {
  bytes32 public constant ZAPPER_ROLE = keccak256("ZAPPER_ROLE");

  address public override uniqueIdentity;

  LendaConfig public config;
  using LendaConfigHelper for LendaConfig;

  LendaConfig public legacyGoList;
  uint256[11] public allIdTypes;
  event LendaConfigUpdated(address indexed who, address configAddress);

  function initialize(
    address owner,
    LendaConfig _config,
    address _uniqueIdentity
  ) public initializer {
    require(
      owner != address(0) && address(_config) != address(0) && _uniqueIdentity != address(0),
      "Owner and config and UniqueIdentity addresses cannot be empty"
    );
    __BaseUpgradeablePausable__init(owner);
    _performUpgrade();
    config = _config;
    uniqueIdentity = _uniqueIdentity;
  }

  function performUpgrade() external onlyAdmin {
    return _performUpgrade();
  }

  function _performUpgrade() internal {
    allIdTypes[0] = ID_TYPE_0;
    allIdTypes[1] = ID_TYPE_1;
    allIdTypes[2] = ID_TYPE_2;
    allIdTypes[3] = ID_TYPE_3;
    allIdTypes[4] = ID_TYPE_4;
    allIdTypes[5] = ID_TYPE_5;
    allIdTypes[6] = ID_TYPE_6;
    allIdTypes[7] = ID_TYPE_7;
    allIdTypes[8] = ID_TYPE_8;
    allIdTypes[9] = ID_TYPE_9;
    allIdTypes[10] = ID_TYPE_10;
  }

  /**
   * @notice sets the config that will be used as the source of truth for the go
   * list instead of the config currently associated. To use the associated config for to list, set the override
   * to the null address.
   */
  function setLegacyGoList(LendaConfig _legacyGoList) external onlyAdmin {
    legacyGoList = _legacyGoList;
  }

  /**
   * @notice Returns whether the provided account is:
   * 1. go-listed for use of the Lenda protocol for any of the provided UID token types
   * 2. is allowed to act on behalf of the go-listed EOA initiating this transaction
   * @param account The account whose go status to obtain
   * @param onlyIdTypes Array of id types to check balances
   * @return The account's go status
   */
  function goOnlyIdTypes(
    address account,
    uint256[] memory onlyIdTypes
  ) public view override returns (bool) {
    require(account != address(0), "Zero address is not go-listed");

    if (hasRole(ZAPPER_ROLE, account)) {
      return true;
    }

    LendaConfig legacyGoListConfig = _getLegacyGoList();
    for (uint256 i = 0; i < onlyIdTypes.length; ++i) {
      uint256 idType = onlyIdTypes[i];

      if (idType == ID_TYPE_0 && legacyGoListConfig.goList(account)) {
        return true;
      }

      uint256 accountIdBalance = IUniqueIdentity(uniqueIdentity).balanceOf(account, idType);
      if (accountIdBalance > 0) {
        return true;
      }

      /* solhint-disable avoid-tx-origin */
      uint256 txOriginIdBalance = IUniqueIdentity(uniqueIdentity).balanceOf(tx.origin, idType);
      if (txOriginIdBalance > 0) {
        return IUniqueIdentity(uniqueIdentity).isApprovedForAll(tx.origin, account);
      }
      /* solhint-enable avoid-tx-origin */
    }

    return false;
  }

  /**
   * @notice Returns a dynamic array of all UID types
   */
  function getAllIdTypes() public view returns (uint256[] memory) {
    uint256[] memory _allIdTypes = new uint256[](allIdTypes.length);
    for (uint256 i = 0; i < allIdTypes.length; i++) {
        _allIdTypes[i] = allIdTypes[i];
    }
    return _allIdTypes;
  }

  /**
   * @notice Returns a dynamic array of UID types accepted by the senior pool
   */
  function getSeniorPoolIdTypes() public pure returns (uint256[] memory) {
    uint256[] memory allowedSeniorPoolIdTypes = new uint256[](4);
    allowedSeniorPoolIdTypes[0] = ID_TYPE_0;
    allowedSeniorPoolIdTypes[1] = ID_TYPE_1;
    allowedSeniorPoolIdTypes[2] = ID_TYPE_3;
    allowedSeniorPoolIdTypes[3] = ID_TYPE_4;

    return allowedSeniorPoolIdTypes;
  }

  /**
   * @notice Returns whether the provided account is go-listed for any UID type
   * @param account The account whose go status to obtain
   * @return The account's go status
   */
  function go(address account) public view override returns (bool) {
    return goOnlyIdTypes(account, getAllIdTypes());
  }

  /**
   * @notice Returns whether the provided account is go-listed for use of the SeniorPool on the Lenda protocol.
   * @param account The account whose go status to obtain
   * @return The account's go status
   */
  function goSeniorPool(address account) public view override returns (bool) {
    return goOnlyIdTypes(account, getSeniorPoolIdTypes());
  }

  function _getLegacyGoList() internal view returns (LendaConfig) {
    return address(legacyGoList) == address(0) ? config : legacyGoList;
  }

  function initZapperRole() external onlyAdmin {
    _setRoleAdmin(ZAPPER_ROLE, OWNER_ROLE);
  }
}
