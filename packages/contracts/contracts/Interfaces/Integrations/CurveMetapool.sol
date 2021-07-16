pragma solidity >=0.7.0 <0.8.0;

interface CurveMetapool {
  function get_virtual_price() external view returns (uint256);

  function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amounts)
    external
    returns (uint256);

  function remove_liquidity_one_coin(
    uint256 amount,
    int128 i,
    uint256 min_underlying_amount
  ) external returns (uint256);
}
