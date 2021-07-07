// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

interface IMetapool {
  function coins() external view returns (address[2] memory);

  function base_coins() external view returns (address[3] memory);
}

contract MockCurveRegistry {
  IMetapool pool;

  constructor(address pool_) {
    pool = IMetapool(pool_);
  }

  function get_pool_from_lp_token(address lp_token)
    external
    view
    returns (address)
  {
    return address(pool);
  }

  function get_underlying_coins(address pool_)
    external
    view
    returns (address[8] memory)
  {
    address[3] memory basePoolCoins = pool.base_coins();
    address[2] memory metaPoolCoins = pool.coins();
    address[8] memory coins = [
      metaPoolCoins[1],
      basePoolCoins[0],
      basePoolCoins[1],
      basePoolCoins[2],
      address(0x0),
      address(0x0),
      address(0x0),
      address(0x0)
    ];
    return coins;
  }
}
