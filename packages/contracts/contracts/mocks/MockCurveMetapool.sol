// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "./MockERC20.sol";

contract MockCurveMetapool {
  MockERC20 lpToken;
  MockERC20 token;
  MockERC20 threeCrv;
  MockERC20 dai;
  MockERC20 usdc;
  MockERC20 usdt;

  uint256 virtualPrice = 1e18;

  uint256 withdrawalSlippageBps = 10;

  uint256 BPS_DENOMINATOR = 10000;

  constructor(
    address token_,
    address lpToken_,
    address threeCrv_,
    address dai_,
    address usdc_,
    address usdt_
  ) {
    token = MockERC20(token_);
    lpToken = MockERC20(lpToken_);
    threeCrv = MockERC20(threeCrv_);
    dai = MockERC20(dai_);
    usdc = MockERC20(usdc_);
    usdt = MockERC20(usdt_);
  }

  function coins() external view returns (address[2] memory) {
    address[2] memory coins = [address(threeCrv), address(token)];
    return coins;
  }

  function base_coins() external view returns (address[3] memory) {
    address[3] memory coins = [address(dai), address(usdc), address(usdt)];
    return coins;
  }

  function get_virtual_price() external view returns (uint256) {
    return virtualPrice;
  }

  function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amounts)
    external
    returns (uint256)
  {
    token.transferFrom(msg.sender, address(this), amounts[1]);
    assert(amounts[1] > min_mint_amounts);
    lpToken.mint(msg.sender, amounts[1]);
    return amounts[1];
  }

  function remove_liquidity_one_coin(
    uint256 amount,
    int128 i,
    uint256 min_underlying_amount
  ) external returns (uint256) {
    lpToken.transferFrom(msg.sender, address(this), amount);

    uint256 slippage = (amount * withdrawalSlippageBps) / 10000;
    uint256 transferOut = amount - slippage;

    token.approve(address(this), transferOut);
    token.mint(address(this), transferOut);
    token.transferFrom(address(this), msg.sender, transferOut);
    return transferOut;
  }

  // Test helpers

  function setVirtualPrice(uint256 virtualPrice_) external {
    virtualPrice = virtualPrice_;
  }

  function setWithdrawalSlippage(uint256 withdrawalSlippageBps_) external {
    withdrawalSlippageBps = withdrawalSlippageBps_;
  }
}
