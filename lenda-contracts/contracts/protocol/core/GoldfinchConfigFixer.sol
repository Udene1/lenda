// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {GoldfinchConfig} from "./GoldfinchConfig.sol";

contract GoldfinchConfigFixer is GoldfinchConfig {
    function forceSetAddress(uint256 addressIndex, address newAddress) public onlyAdmin {
        emit AddressUpdated(msg.sender, addressIndex, addresses[addressIndex], newAddress);
        addresses[addressIndex] = newAddress;
    }
}
