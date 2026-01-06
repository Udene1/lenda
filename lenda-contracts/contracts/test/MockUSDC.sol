// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() public ERC20("Mock USDC", "USDC") {
        _setupDecimals(6);
        _mint(msg.sender, 1000000 * 10**6);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
