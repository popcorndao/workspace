pragma solidity >=0.7.0 <0.8.0;

interface CurveRegistry {
  function get_pool_from_lp_token(address lp_token)
    external
    view
    returns (address);
}
