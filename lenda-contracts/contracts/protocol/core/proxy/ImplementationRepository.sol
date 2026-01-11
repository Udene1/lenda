// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseUpgradeablePausable} from "../BaseUpgradeablePausable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IImplementationRepository} from "../../../interfaces/IImplementationRepository.sol";

/**
 * @title ImplementationRepository
 * @notice Repository maintaining a collection of "lineages" of implementation contracts for UCU proxies.
 * @author Lenda Protocol
 */
contract ImplementationRepository is BaseUpgradeablePausable, IImplementationRepository {
  address internal constant INVALID_IMPL = address(0);
  uint256 internal constant INVALID_LINEAGE_ID = 0;

  /// @notice returns data that will be delegatedCalled when the given implementation
  ///           is upgraded to
  mapping(address => bytes) public override upgradeDataFor;

  /// @dev mapping from one implementation to the succeeding implementation
  mapping(address => address) internal _nextImplementationOf;

  /// @notice Returns the id of the lineage a given implementation belongs to
  mapping(address => uint256) public override lineageIdOf;

  /// @dev internal because we expose this through the `currentImplementation(uint256)` api
  mapping(uint256 => address) internal _currentOfLineage;

  /// @notice Returns the id of the most recently created lineage
  uint256 public override currentLineageId;

  // //////// External ////////////////////////////////////////////////////////////

  /**
   * @notice initialize the repository's state
   * @param _owner owner of the repository
   * @param implementation initial implementation in the repository
   */
  function initialize(address _owner, address implementation) external initializer {
    __BaseUpgradeablePausable__init(_owner);
    _createLineage(implementation);
    require(currentLineageId != INVALID_LINEAGE_ID, "Failed to create lineage");
  }

  /// @inheritdoc IImplementationRepository
  function setUpgradeDataFor(
    address implementation,
    bytes calldata data
  ) external override onlyAdmin whenNotPaused {
    _setUpgradeDataFor(implementation, data);
  }

  /// @inheritdoc IImplementationRepository
  function createLineage(
    address implementation
  ) external override onlyAdmin whenNotPaused returns (uint256) {
    return _createLineage(implementation);
  }

  /// @inheritdoc IImplementationRepository
  function append(address implementation) external override onlyAdmin whenNotPaused {
    _append(implementation, currentLineageId);
  }

  /// @inheritdoc IImplementationRepository
  function append(
    address implementation,
    uint256 lineageId
  ) external override onlyAdmin whenNotPaused {
    _append(implementation, lineageId);
  }

  /// @inheritdoc IImplementationRepository
  function remove(address toRemove, address previous) external override onlyAdmin whenNotPaused {
    _remove(toRemove, previous);
  }

  // //////// External view ////////////////////////////////////////////////////////////

  /// @inheritdoc IImplementationRepository
  function hasNext(address implementation) external view override returns (bool) {
    return _nextImplementationOf[implementation] != INVALID_IMPL;
  }

  /// @inheritdoc IImplementationRepository
  function has(address implementation) external view override returns (bool) {
    return _has(implementation);
  }

  /// @inheritdoc IImplementationRepository
  function nextImplementationOf(
    address implementation
  ) external view override whenNotPaused returns (address) {
    return _nextImplementationOf[implementation];
  }

  /// @inheritdoc IImplementationRepository
  function lineageExists(uint256 lineageId) external view override returns (bool) {
    return _lineageExists(lineageId);
  }

  /// @inheritdoc IImplementationRepository
  function currentImplementation(
    uint256 lineageId
  ) external view override whenNotPaused returns (address) {
    return _currentImplementation(lineageId);
  }

  /// @inheritdoc IImplementationRepository
  function currentImplementation() external view override whenNotPaused returns (address) {
    return _currentImplementation(currentLineageId);
  }

  // //////// Internal ////////////////////////////////////////////////////////////

  function _setUpgradeDataFor(address implementation, bytes memory data) internal {
    require(_has(implementation), "unknown impl");
    upgradeDataFor[implementation] = data;
    emit UpgradeDataSet(implementation, data);
  }

  function _createLineage(address implementation) internal virtual returns (uint256) {
    require(Address.isContract(implementation), "not a contract");
    currentLineageId += 1;

    _currentOfLineage[currentLineageId] = implementation;
    lineageIdOf[implementation] = currentLineageId;

    emit Added(currentLineageId, implementation, address(0));
    return currentLineageId;
  }

  function _currentImplementation(uint256 lineageId) internal view returns (address) {
    return _currentOfLineage[lineageId];
  }

  function _has(address implementation) internal view virtual returns (bool) {
    return lineageIdOf[implementation] != INVALID_LINEAGE_ID;
  }

  function _append(address implementation, uint256 lineageId) internal virtual {
    require(Address.isContract(implementation), "not a contract");
    require(!_has(implementation), "exists");
    require(_lineageExists(lineageId), "invalid lineageId");
    require(_currentOfLineage[lineageId] != INVALID_IMPL, "empty lineage");

    address oldImplementation = _currentOfLineage[lineageId];
    _currentOfLineage[lineageId] = implementation;
    lineageIdOf[implementation] = lineageId;
    _nextImplementationOf[oldImplementation] = implementation;

    emit Added(lineageId, implementation, oldImplementation);
  }

  function _remove(address toRemove, address previous) internal virtual {
    require(toRemove != INVALID_IMPL && previous != INVALID_IMPL, "ZERO");
    require(_nextImplementationOf[previous] == toRemove, "Not prev");

    uint256 lineageId = lineageIdOf[toRemove];

    if (toRemove == _currentOfLineage[lineageId]) {
      _currentOfLineage[lineageId] = previous;
    }

    _setUpgradeDataFor(toRemove, "");
    _nextImplementationOf[previous] = _nextImplementationOf[toRemove];
    _nextImplementationOf[toRemove] = INVALID_IMPL;
    lineageIdOf[toRemove] = INVALID_LINEAGE_ID;
    emit Removed(lineageId, toRemove);
  }

  function _lineageExists(uint256 lineageId) internal view returns (bool) {
    return lineageId != INVALID_LINEAGE_ID && lineageId <= currentLineageId;
  }
}
