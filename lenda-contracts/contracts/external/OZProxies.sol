// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Re-export OpenZeppelin proxies so they can be compiled and deployed by Hardhat
import {TransparentUpgradeableProxy} from "openzeppelin-contracts-0-8-x/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "openzeppelin-contracts-0-8-x/proxy/transparent/ProxyAdmin.sol";
