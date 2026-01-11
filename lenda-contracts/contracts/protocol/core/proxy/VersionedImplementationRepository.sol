// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IVersioned} from "../../../interfaces/IVersioned.sol";
import {IVersionedImplementationRepository} from "../../../interfaces/IVersionedImplementationRepository.sol";
import {ImplementationRepository as Repo} from "./ImplementationRepository.sol";

/**
 * @title VersionedImplementationRepository
 * @notice Repository for implementations tagged with versions.
 * @author Lenda Protocol
 */
contract VersionedImplementationRepository is Repo, IVersionedImplementationRepository {
  /// @dev Packed version [major, minor, patch] -> implementation address
  mapping(bytes => address) internal _byVersion;

  // // EXTERNAL //////////////////////////////////////////////////////////////////

  /// @inheritdoc IVersionedImplementationRepository
  function getByVersion(uint8[3] calldata version) external view override returns (address) {
    return _byVersion[abi.encodePacked(version)];
  }

  /// @inheritdoc IVersionedImplementationRepository
  function hasVersion(uint8[3] calldata version) external view override returns (bool) {
    return _hasVersion(version);
  }

  // // INTERNAL //////////////////////////////////////////////////////////////////

  function _append(address implementation, uint256 lineageId) internal override {
    uint8[3] memory version = IVersioned(implementation).getVersion();
    _insertVersion(version, implementation);
    super._append(implementation, lineageId);
  }

  function _createLineage(address implementation) internal override returns (uint256) {
    uint8[3] memory version = IVersioned(implementation).getVersion();
    _insertVersion(version, implementation);
    return super._createLineage(implementation);
  }

  function _remove(address toRemove, address previous) internal override {
    uint8[3] memory version = IVersioned(toRemove).getVersion();
    _removeVersion(version);
    super._remove(toRemove, previous);
  }

  function _insertVersion(uint8[3] memory version, address impl) internal {
    require(!_hasVersion(version), "exists");
    _byVersion[abi.encodePacked(version)] = impl;
    emit VersionAdded(version, impl);
  }

  function _removeVersion(uint8[3] memory version) internal {
    address toRemove = _byVersion[abi.encodePacked(version)];
    _byVersion[abi.encodePacked(version)] = INVALID_IMPL;
    emit VersionRemoved(version, toRemove);
  }

  function _hasVersion(uint8[3] memory version) internal view returns (bool) {
    return _byVersion[abi.encodePacked(version)] != INVALID_IMPL;
  }

  event VersionAdded(uint8[3] indexed version, address indexed impl);
  event VersionRemoved(uint8[3] indexed version, address indexed impl);
}
