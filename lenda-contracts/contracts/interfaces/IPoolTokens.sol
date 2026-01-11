// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";

/**
 * @title IPoolTokens
 * @notice Interface for the PoolTokens NFT contract in the Lenda protocol.
 * @author Lenda Protocol
 */
interface IPoolTokens is IERC721EnumerableUpgradeable {
  struct TokenInfo {
    address pool;
    uint256 tranche;
    uint256 principalAmount;
    uint256 principalRedeemed;
    uint256 interestRedeemed;
  }

  struct MintParams {
    uint256 principalAmount;
    uint256 tranche;
  }

  struct PoolInfo {
    uint256 totalMinted;
    uint256 totalPrincipalRedeemed;
    bool created;
  }

  function mint(MintParams calldata params, address to) external returns (uint256);

  function redeem(uint256 tokenId, uint256 principalRedeemed, uint256 interestRedeemed) external;

  function withdrawPrincipal(uint256 tokenId, uint256 principalAmount) external;

  function burn(uint256 tokenId) external;

  function onPoolCreated(address newPool) external;

  function getTokenInfo(uint256 tokenId) external view returns (TokenInfo memory);

  function getPoolInfo(address pool) external view returns (PoolInfo memory);

  function validPool(address pool) external view returns (bool);

  function isApprovedOrOwner(address spender, uint256 tokenId) external view returns (bool);

  function splitToken(
    uint256 tokenId,
    uint256 newPrincipal1
  ) external returns (uint256 tokenId1, uint256 tokenId2);

  event TokenMinted(
    address indexed owner,
    address indexed pool,
    uint256 indexed tokenId,
    uint256 amount,
    uint256 tranche
  );

  event TokenRedeemed(
    address indexed owner,
    address indexed pool,
    uint256 indexed tokenId,
    uint256 principalRedeemed,
    uint256 interestRedeemed,
    uint256 tranche
  );

  event TokenBurned(address indexed owner, address indexed pool, uint256 indexed tokenId);

  event TokenSplit(
    address indexed owner,
    address indexed pool,
    uint256 indexed tokenId,
    uint256 newTokenId1,
    uint256 newPrincipal1,
    uint256 newTokenId2,
    uint256 newPrincipal2
  );

  event TokenPrincipalWithdrawn(
    address indexed owner,
    address indexed pool,
    uint256 indexed tokenId,
    uint256 principalWithdrawn,
    uint256 tranche
  );
}
