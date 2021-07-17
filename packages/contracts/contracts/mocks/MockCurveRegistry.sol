// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

interface IMetapool {
  function coins() external view returns (address[2] memory);

  function base_coins() external view returns (address[3] memory);
}

contract MockCurveRegistry {
  IMetapool pool;
  address basePool;
  address threeCrv;

  constructor(address metaPool_, address basePool_, address threeCrv_) {
    pool = IMetapool(metaPool_);
    basePool = basePool_;
    threeCrv = threeCrv_;
  }

  function get_lp_token(address pool_)
    external
    view
    returns (address)
  {
    if (pool_ == basePool) {
      return pool.coins()[1];
    }
    return threeCrv;
  }

  function get_pool_from_lp_token(address lp_token)
    external
    view
    returns (address)
  {
    if (lp_token == pool.coins()[1]) {
      return basePool;
    }
    return address(pool);
  }

  function get_coins(address pool_)
    external
    view
    returns (address[8] memory)
  {
    address[2] memory metaPoolCoins = pool.coins();
    address[8] memory coins = [
      metaPoolCoins[0],
      metaPoolCoins[1],
      address(0x0),
      address(0x0),
      address(0x0),
      address(0x0),
      address(0x0),
      address(0x0)
    ];
    return coins;
  }

  function get_underlying_coins(address pool_)
    external
    view
    returns (address[8] memory)
  {
    address[3] memory basePoolCoins = pool.base_coins();
    address[2] memory metaPoolCoins = pool.coins();
    address[8] memory coins = [
      metaPoolCoins[0],
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
