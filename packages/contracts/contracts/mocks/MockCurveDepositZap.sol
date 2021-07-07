// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "./MockERC20.sol";

import "hardhat/console.sol";

contract MockCurveDepositZap {
  MockERC20 token;
  MockERC20 lpToken;
  MockERC20 dai;
  MockERC20 usdc;
  MockERC20 usdt;
  uint256 withdrawalSlippageBps = 10;

  uint256 BPS_DENOMINATOR = 10000;
  MockERC20[] tokens;

  constructor(
    address token_,
    address lpToken_,
    address dai_,
    address usdc_,
    address usdt_
  ) {
    token = MockERC20(token_);
    lpToken = MockERC20(lpToken_);
    dai = MockERC20(dai_);
    usdc = MockERC20(usdc_);
    usdt = MockERC20(usdt_);
    tokens = [token, dai, usdc, usdt];
  }

  function add_liquidity(
    address pool,
    uint256[4] calldata amounts,
    uint256 min_mint_amounts
  ) external returns (uint256) {
    uint256 lpTokens;
    for (uint8 i = 0; i < tokens.length; i++) {
      tokens[i].transferFrom(msg.sender, address(this), amounts[i]);
      lpToken.mint(msg.sender, amounts[i]);
      lpTokens += amounts[i];
    }
    return lpTokens;
  }

  function remove_liquidity_one_coin(
    address pool,
    uint256 amount,
    int128 i,
    uint256 min_underlying_amount,
    address receiver
  ) external returns (uint256) {
    lpToken.transferFrom(msg.sender, address(this), amount);

    uint256 slippage = (amount * withdrawalSlippageBps) / 10000;
    uint256 transferOut = amount - slippage;

    uint256 i = uint256(i);
    tokens[i].approve(address(this), transferOut);
    tokens[i].mint(address(this), transferOut);
    tokens[i].transferFrom(address(this), receiver, transferOut);
    return transferOut;
  }

  function calc_withdraw_one_coin(uint256 amount, int128 i)
    external
    view
    returns (uint256)
  {
    uint256 slippage = (amount * withdrawalSlippageBps) / 10000;
    uint256 transferOut = amount - slippage;
    return transferOut;
  }

  // Test helpers

  function setWithdrawalSlippage(uint256 withdrawalSlippageBps_) external {
    withdrawalSlippageBps = withdrawalSlippageBps_;
  }
}
