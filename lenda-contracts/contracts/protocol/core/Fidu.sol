// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import {LendaConfigHelper} from "./LendaConfigHelper.sol";
import {LendaConfig} from "./LendaConfig.sol";
import {ISeniorPool} from "../../interfaces/ISeniorPool.sol";

/**
 * @title Fidu
 * @notice Fidu (symbol: FIDU) is Lenda's liquidity token, representing shares
 *  in the Pool. When you deposit, we mint a corresponding amount of Fidu, and when you withdraw, we
 *  burn Fidu. The share price of the Pool implicitly represents the "exchange rate" between Fidu
 *  and USDC (or whatever currencies the Pool may allow withdraws in during the future)
 * @author Lenda Protocol
 */
contract Fidu is
  ContextUpgradeable,
  AccessControlUpgradeable,
  ERC20Upgradeable,
  ERC20BurnableUpgradeable,
  ERC20PausableUpgradeable
{
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

  // $1 threshold to handle potential rounding errors, from differing decimals on Fidu and USDC;
  uint256 public constant ASSET_LIABILITY_MATCH_THRESHOLD = 1e6;
  LendaConfig public config;
  using LendaConfigHelper for LendaConfig;

  event LendaConfigUpdated(address indexed who, address configAddress);

  /*
    We are using our own initializer function so we can set the owner by passing it in.
  */
  // solhint-disable-next-line func-name-mixedcase
  function __initialize__(
    address owner,
    string calldata name,
    string calldata symbol,
    LendaConfig _config
  ) external initializer {
    __Context_init_unchained();
    __AccessControl_init_unchained();
    __ERC20_init_unchained(name, symbol);
    __ERC20Burnable_init_unchained();
    __Pausable_init_unchained();
    __ERC20Pausable_init_unchained();

    config = _config;

    _setupRole(MINTER_ROLE, owner);
    _setupRole(PAUSER_ROLE, owner);
    _setupRole(OWNER_ROLE, owner);

    _setRoleAdmin(MINTER_ROLE, OWNER_ROLE);
    _setRoleAdmin(PAUSER_ROLE, OWNER_ROLE);
    _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
  }

  /**
   * @dev Creates `amount` new tokens for `to`.
   *
   * See {ERC20-_mint}.
   *
   * Requirements:
   *
   * - the caller must have the `MINTER_ROLE`.
   */
  function mintTo(address to, uint256 amount) public {
    require(hasRole(MINTER_ROLE, _msgSender()), "Fidu: Must have minter role to mint");
    require(canMint(amount), "Cannot mint: it would create an asset/liability mismatch");
    _mint(to, amount);
  }

  /**
   * @dev Destroys `amount` tokens from `account`, deducting from the caller's allowance.
   */
  function burnFrom(address from, uint256 amount) public override {
    require(
      hasRole(MINTER_ROLE, _msgSender()),
      "Fidu: Must have minter role to burn"
    );
    require(canBurn(amount), "Cannot burn: it would create an asset/liability mismatch");
    _burn(from, amount);
  }

  // Internal functions

  // canMint assumes that the USDC that backs the new shares has already been sent to the Pool
  function canMint(uint256 newAmount) internal view returns (bool) {
    ISeniorPool seniorPool = config.getSeniorPool();
    uint256 liabilities = ((totalSupply() + newAmount) * seniorPool.sharePrice()) / fiduMantissa();
    uint256 liabilitiesInDollars = fiduToUSDC(liabilities);
    uint256 _assets = seniorPool.assets();
    if (_assets >= liabilitiesInDollars) {
      return true;
    } else {
      return (liabilitiesInDollars - _assets) <= ASSET_LIABILITY_MATCH_THRESHOLD;
    }
  }

  // canBurn assumes that the USDC that backed these shares has already been moved out the Pool
  function canBurn(uint256 amountToBurn) internal view returns (bool) {
    ISeniorPool seniorPool = config.getSeniorPool();
    uint256 liabilities = ((totalSupply() - amountToBurn) * seniorPool.sharePrice()) / fiduMantissa();
    uint256 liabilitiesInDollars = fiduToUSDC(liabilities);
    uint256 _assets = seniorPool.assets();
    if (_assets >= liabilitiesInDollars) {
      return true;
    } else {
      return (liabilitiesInDollars - _assets) <= ASSET_LIABILITY_MATCH_THRESHOLD;
    }
  }

  function fiduToUSDC(uint256 amount) internal pure returns (uint256) {
    return amount / (fiduMantissa() / usdcMantissa());
  }

  function fiduMantissa() internal pure returns (uint256) {
    return 10 ** 18;
  }

  function usdcMantissa() internal pure returns (uint256) {
    return 10 ** 6;
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
    super._beforeTokenTransfer(from, to, amount);
  }
}
