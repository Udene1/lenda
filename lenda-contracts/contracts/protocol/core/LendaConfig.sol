// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {BaseUpgradeablePausable} from "./BaseUpgradeablePausable.sol";
import {ILendaConfig} from "../../interfaces/ILendaConfig.sol";
import {LendaConfigOptions} from "./LendaConfigOptions.sol";

/**
 * @title LendaConfig
 * @notice This contract stores mappings of useful "protocol config state", giving a central place
 *  for all other contracts to access it. For example, the TransactionLimit, or the PoolAddress.
 * @author Lenda Protocol
 */

contract LendaConfig is BaseUpgradeablePausable, ILendaConfig {
  bytes32 public constant GO_LISTER_ROLE = keccak256("GO_LISTER_ROLE");

  mapping(uint256 => address) public addresses;
  mapping(uint256 => uint256) public numbers;
  mapping(address => bool) public goList;

  event AddressUpdated(address owner, uint256 index, address oldValue, address newValue);
  event NumberUpdated(address owner, uint256 index, uint256 oldValue, uint256 newValue);

  event GoListed(address indexed member);
  event NoListed(address indexed member);

  bool public valuesInitialized;

  function initialize(address owner) public initializer {
    require(owner != address(0), "Owner address cannot be empty");

    __BaseUpgradeablePausable__init(owner);

    _setupRole(GO_LISTER_ROLE, owner);
    _setRoleAdmin(GO_LISTER_ROLE, OWNER_ROLE);
  }

  /// @notice Sets an address in the config. Allows updates (no initialization lock).
  function setAddress(uint256 addressIndex, address newAddress) public override onlyAdmin {
    emit AddressUpdated(msg.sender, addressIndex, addresses[addressIndex], newAddress);
    addresses[addressIndex] = newAddress;
  }

  /// @notice Sets a number in the config
  function setNumber(uint256 index, uint256 newNumber) public override onlyAdmin {
    emit NumberUpdated(msg.sender, index, numbers[index], newNumber);
    numbers[index] = newNumber;
  }

  function setTreasuryReserve(address newTreasuryReserve) public onlyAdmin {
    uint256 key = uint256(LendaConfigOptions.Addresses.TreasuryReserve);
    emit AddressUpdated(msg.sender, key, addresses[key], newTreasuryReserve);
    addresses[key] = newTreasuryReserve;
  }

  function setSeniorPoolStrategy(address newStrategy) public onlyAdmin {
    uint256 key = uint256(LendaConfigOptions.Addresses.SeniorPoolStrategy);
    emit AddressUpdated(msg.sender, key, addresses[key], newStrategy);
    addresses[key] = newStrategy;
  }

  function setCreditLineImplementation(address newAddress) public onlyAdmin {
    uint256 key = uint256(LendaConfigOptions.Addresses.CreditLineImplementation);
    emit AddressUpdated(msg.sender, key, addresses[key], newAddress);
    addresses[key] = newAddress;
  }

  function setTranchedPoolImplementation(address newAddress) public onlyAdmin {
    uint256 key = uint256(LendaConfigOptions.Addresses.TranchedPoolImplementation);
    emit AddressUpdated(msg.sender, key, addresses[key], newAddress);
    addresses[key] = newAddress;
  }

  function setLendaConfig(address newAddress) public onlyAdmin {
    uint256 key = uint256(LendaConfigOptions.Addresses.LendaConfig);
    emit AddressUpdated(msg.sender, key, addresses[key], newAddress);
    addresses[key] = newAddress;
  }

  function setMonthlyScheduleRepo(address newAddress) public onlyAdmin {
    uint256 key = uint256(LendaConfigOptions.Addresses.MonthlyScheduleRepo);
    emit AddressUpdated(msg.sender, key, addresses[key], newAddress);
    addresses[key] = newAddress;
  }

  function initializeFromOtherConfig(
    address _initialConfig,
    uint256 numbersLength,
    uint256 addressesLength
  ) public onlyAdmin {
    require(!valuesInitialized, "Already initialized values");
    ILendaConfig initialConfig = ILendaConfig(_initialConfig);
    for (uint256 i = 0; i < numbersLength; i++) {
      setNumber(i, initialConfig.getNumber(i));
    }
    for (uint256 i = 0; i < addressesLength; i++) {
      if (initialConfig.getAddress(i) != address(0)) {
        setAddress(i, initialConfig.getAddress(i));
      }
    }
    valuesInitialized = true;
  }

  function addToGoList(address _member) public onlyGoListerRole {
    goList[_member] = true;
    emit GoListed(_member);
  }

  function removeFromGoList(address _member) public onlyGoListerRole {
    goList[_member] = false;
    emit NoListed(_member);
  }

  function bulkAddToGoList(address[] calldata _members) external onlyGoListerRole {
    for (uint256 i = 0; i < _members.length; i++) {
      addToGoList(_members[i]);
    }
  }

  function bulkRemoveFromGoList(address[] calldata _members) external onlyGoListerRole {
    for (uint256 i = 0; i < _members.length; i++) {
      removeFromGoList(_members[i]);
    }
  }

  /// @notice Gets an address from the config
  function getAddress(uint256 index) public view override returns (address) {
    return addresses[index];
  }

  /// @notice Gets a number from the config
  function getNumber(uint256 index) public view override returns (uint256) {
    return numbers[index];
  }

  modifier onlyGoListerRole() {
    require(
      hasRole(GO_LISTER_ROLE, _msgSender()),
      "Must have go-lister role to perform this action"
    );
    _;
  }
}
