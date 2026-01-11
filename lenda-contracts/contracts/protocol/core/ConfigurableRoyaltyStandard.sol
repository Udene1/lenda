// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ConfigurableRoyaltyStandard
 * @notice Library implementing the ERC2981 royalty standard logic.
 * @author Lenda Protocol
 */
library ConfigurableRoyaltyStandard {
  /// @dev bytes4(keccak256("royaltyInfo(uint256,uint256)")) == 0x2a55205a
  bytes4 internal constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

  uint256 internal constant _PERCENTAGE_DECIMALS = 1e18;

  struct RoyaltyParams {
    // The address that should receive royalties
    address receiver;
    // The percent of `salePrice` that should be taken for royalties.
    // Represented with `_PERCENTAGE_DECIMALS` where `_PERCENTAGE_DECIMALS` is 100%.
    uint256 royaltyPercent;
  }

  event RoyaltyParamsSet(address indexed sender, address newReceiver, uint256 newRoyaltyPercent);

  /**
   * @notice Called with the sale price to determine how much royalty is owed and to whom.
   * @param params The stored royalty parameters.
   * @param _tokenId The NFT asset queried for royalty information.
   * @param _salePrice The sale price of the NFT asset.
   * @return receiver Address that should receive royalties.
   * @return royaltyAmount The royalty payment amount for _salePrice.
   */
  function royaltyInfo(
    RoyaltyParams storage params,
    uint256 _tokenId,
    uint256 _salePrice
  ) internal view returns (address, uint256) {
    uint256 royaltyAmount = (_salePrice * params.royaltyPercent) / _PERCENTAGE_DECIMALS;
    return (params.receiver, royaltyAmount);
  }

  /**
   * @notice Set royalty params used in `royaltyInfo`.
   * @param params The stored royalty parameters.
   * @param newReceiver The new address which should receive royalties.
   * @param newRoyaltyPercent The new percent of salePrice for royalties.
   */
  function setRoyaltyParams(
    RoyaltyParams storage params,
    address newReceiver,
    uint256 newRoyaltyPercent
  ) internal {
    require(newReceiver != address(0), "Null receiver");
    params.receiver = newReceiver;
    params.royaltyPercent = newRoyaltyPercent;
    emit RoyaltyParamsSet(msg.sender, newReceiver, newRoyaltyPercent);
  }
}
