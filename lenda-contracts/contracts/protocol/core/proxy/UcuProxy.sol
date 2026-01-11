// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IImplementationRepository as IRepo} from "../../../interfaces/IImplementationRepository.sol";
import {Proxy} from "@openzeppelin/contracts/proxy/Proxy.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC173} from "../../../interfaces/IERC173.sol";
import {IUcuProxy} from "../../../interfaces/IUcuProxy.sol";

/**
 * @title UcuProxy
 * @notice User Controlled Upgrade (UCU) Proxy.
 * @author Lenda Protocol
 */
contract UcuProxy is IUcuProxy, Proxy {
  /// @dev Storage slot with the address of the current implementation.
  /// This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1
  bytes32 private constant _IMPLEMENTATION_SLOT =
    0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

  // result of `bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1)`
  bytes32 private constant _ADMIN_SLOT =
    0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

  // result of `bytes32(uint256(keccak256('eipxxxx.proxy.repository')) - 1)`
  bytes32 private constant _REPOSITORY_SLOT =
    0x007037545499569801a5c0bd8dbf5fccb13988c7610367d129f45ee69b1624f8;

  // ///////////////////// EXTERNAL ///////////////////////////////////////////////////////////////////////////

  constructor(IRepo _repository, address _owner, uint256 _lineageId) {
    require(_owner != address(0), "bad owner");
    _setOwner(_owner);
    _setRepository(_repository);
    address currentImpl = _repository.currentImplementation(_lineageId);
    _upgradeToAndCall(currentImpl, "");
  }

  /// @inheritdoc IUcuProxy
  function upgradeImplementation() external override onlyOwner {
    _upgradeImplementation();
  }

  /// @inheritdoc IERC173
  function transferOwnership(address newOwner) external override onlyOwner {
    _setOwner(newOwner);
  }

  /// @inheritdoc IERC173
  function owner() external view override returns (address) {
    return _getOwner();
  }

  /// @inheritdoc IUcuProxy
  function getRepository() external view override returns (IRepo) {
    return _getRepository();
  }

  // ///////////////////////// INTERNAL //////////////////////////////////////////////////////////////////////

  function _upgradeImplementation() internal {
    IRepo repo = _getRepository();
    address nextImpl = repo.nextImplementationOf(_implementation());
    bytes memory data = repo.upgradeDataFor(nextImpl);
    _upgradeToAndCall(nextImpl, data);
  }

  function _implementation() internal view override returns (address impl) {
    assembly {
      impl := sload(_IMPLEMENTATION_SLOT)
    }
  }

  function _upgradeToAndCall(address newImplementation, bytes memory data) internal virtual {
    _setImplementationAndCall(newImplementation, data);
    emit Upgraded(newImplementation);
  }

  function _setImplementationAndCall(address newImplementation, bytes memory data) internal {
    require(Address.isContract(newImplementation), "no upgrade");

    assembly {
      sstore(_IMPLEMENTATION_SLOT, newImplementation)
    }

    if (data.length > 0) {
      (bool success, ) = newImplementation.delegatecall(data);
      if (!success) {
        assembly {
          let returnDataSize := returndatasize()
          returndatacopy(0, 0, returnDataSize)
          revert(0, returnDataSize)
        }
      }
    }
  }

  function _setRepository(IRepo newRepository) internal {
    require(Address.isContract(address(newRepository)), "bad repo");
    assembly {
      sstore(_REPOSITORY_SLOT, newRepository)
    }
  }

  function _getRepository() internal view returns (IRepo repo) {
    assembly {
      repo := sload(_REPOSITORY_SLOT)
    }
  }

  function _getOwner() internal view returns (address adminAddress) {
    assembly {
      adminAddress := sload(_ADMIN_SLOT)
    }
  }

  function _setOwner(address newOwner) internal {
    address previousOwner = _getOwner();
    assembly {
      sstore(_ADMIN_SLOT, newOwner)
    }
    emit OwnershipTransferred(previousOwner, newOwner);
  }

  modifier onlyOwner() {
    require(msg.sender == _getOwner(), "NA");
    _;
  }

}
