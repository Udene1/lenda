// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./protocol/core/LendaConfig.sol";

/**
 * @title LayoutHelper
 * @notice Helper contract for inspecting storage slots, specifically for LendaConfig.
 * @author Lenda Protocol
 */
contract LayoutHelper is LendaConfig {
    /**
     * @notice Returns the storage slot of the `addresses` mapping.
     * @return slot The storage slot index.
     */
    function getAddressesSlot() public pure returns (uint256 slot) {
        assembly {
            slot := addresses.slot
        }
    }
}
