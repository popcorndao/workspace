// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./MockERC20.sol";

contract MockCurveMetapool {
  using SafeERC20 for MockERC20;

  MockERC20 public lpToken;
  MockERC20 public threeCrv;
  uint256 virtualPrice = 1e18;

  uint256 withdrawalSlippageBps = 10;

  uint256 BPS_DENOMINATOR = 10000;

  constructor(address lpToken_, address threeCrv_) {
    lpToken = MockERC20(lpToken_);
    threeCrv = MockERC20(threeCrv_);
  }

  function get_virtual_price() external view returns (uint256) {
    return virtualPrice;
  }

  function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amounts)
    external
    returns (uint256)
  {
    threeCrv.transferFrom(msg.sender, address(this), amounts[1]);
    require(amounts[1] > min_mint_amounts, "amount lower min");
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

    threeCrv.approve(address(this), transferOut);
    threeCrv.mint(address(this), transferOut);
    threeCrv.transferFrom(address(this), msg.sender, transferOut);
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
