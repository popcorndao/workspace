// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "hardhat/console.sol";

interface Curve3Pool {
  function add_liquidity(
    uint256[3] calldata amounts,
    uint256 min_mint_amounts
  ) external;

  function remove_liquidity_one_coin(
    uint256 burn_amount,
    int128 i,
    uint256 min_amount
  ) external;
}

interface CurveMetapool {
  function add_liquidity(
    uint256[2] calldata amounts,
    uint256 min_mint_amounts
  ) external returns (uint256);

  function remove_liquidity_one_coin(
    uint256 burn_amount,
    int128 i,
    uint256 min_amount
  ) external returns (uint256);
}

interface CurveDepositZap {
  function add_liquidity(
    address pool,
    uint256[4] calldata amounts,
    uint256 min_mint_amounts,
    address receiver
  ) external returns (uint256);

  function remove_liquidity_one_coin(
    address pool,
    uint256 burn_amount,
    int128 i,
    uint256 min_amount,
    address receiver
  ) external returns (uint256);
}

interface CurveAddressProvider {
  function get_registry() external view returns (address);
}

interface CurveRegistry {
  function get_pool_from_lp_token(address lp_token)
  external
  view
  returns (address);

  function get_lp_token(address pool)
  external
  view
  returns (address);

  function get_coins(address pool)
  external
  view
  returns (address[8] memory);

  function get_underlying_coins(address pool)
  external
  view
  returns (address[8] memory);
}

interface IPool {
  function token() external view returns (address);

  function depositFor(uint256 amount, address recipient)
  external
  returns (uint256);

  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) external returns (bool);

  function withdraw(uint256 amount) external returns (uint256);
}

contract Zapper {
  using SafeERC20 for IERC20;
  using SafeERC20 for IPool;
  using SafeMath for uint256;

  CurveDepositZap public curveDepositZap;
  CurveAddressProvider public curveAddressProvider;
  CurveRegistry public curveRegistry;

  constructor(address curveAddressProvider_, address curveDepositZap_) {
    curveDepositZap = CurveDepositZap(curveDepositZap_);
    curveAddressProvider = CurveAddressProvider(curveAddressProvider_);
    curveRegistry = CurveRegistry(curveAddressProvider.get_registry());
  }

  function token(address popcornPool) public view returns (address) {
    return address(IPool(popcornPool).token());
  }

  function curveMetapoolAddress(address popcornPool) public view returns (address) {
    return curveRegistry.get_pool_from_lp_token(token(popcornPool));
  }

  function curveBasepoolAddress(address popcornPool) public view returns (address) {
    address basePoolLPToken = curveRegistry.get_coins(curveMetapoolAddress(popcornPool))[1];
    return curveRegistry.get_pool_from_lp_token(basePoolLPToken);
  }

  function supportedTokens(address popcornPool)
  public
  view
  returns (address[8] memory)
  {
    return curveRegistry.get_underlying_coins(curveMetapoolAddress(popcornPool));
  }

  function canZap(address popcornPool, address token)
  public
  view
  returns (bool)
  {
    require(address(token) != address(0));
    return tokenIndex(popcornPool, token) != 8;
  }

  function tokenIndex(address popcornPool, address token)
  public
  view
  returns (uint8)
  {
    uint8 index = 8;
    address[8] memory supportedTokens = supportedTokens(popcornPool);
    for (uint8 i = 0; i < supportedTokens.length; i++) {
      if (address(supportedTokens[i]) == address(token)) {
        index = i;
        break;
      }
    }
    return index;
  }

  function zapIn(
    address popcornPool,
    address depositToken,
    uint256 amount
  ) public returns (uint256) {
    require(canZap(popcornPool, depositToken), "Unsupported token");

    IERC20(depositToken).safeTransferFrom(msg.sender, address(this), amount);

    uint256 lpTokens;
    if (tokenIndex(popcornPool, depositToken) == 0) {
      IERC20(depositToken).safeIncreaseAllowance(
        curveMetapoolAddress(popcornPool),
        amount
      );
      lpTokens = CurveMetapool(curveMetapoolAddress(popcornPool)).add_liquidity(
        [amount, 0],
        0
      );
    } else {
      IERC20(depositToken).safeIncreaseAllowance(
        curveBasepoolAddress(popcornPool),
        amount
      );
      uint256[3] memory amounts = [
        uint256(0),
        uint256(0),
        uint256(0)
      ];
      amounts[tokenIndex(popcornPool, depositToken)-1] = amount;
      address threeCrv = curveRegistry.get_lp_token(curveBasepoolAddress(popcornPool));
      uint256 balanceBefore = IERC20(threeCrv).balanceOf(address(this));
      Curve3Pool(curveBasepoolAddress(popcornPool)).add_liquidity(
        amounts,
        0
      );
      uint256 balanceAfter = IERC20(threeCrv).balanceOf(address(this));
      uint256 threeCrvLPTokens = balanceAfter.sub(balanceBefore);
      IERC20(threeCrv).safeIncreaseAllowance(
        curveMetapoolAddress(popcornPool),
        threeCrvLPTokens
      );
      lpTokens = CurveMetapool(curveMetapoolAddress(popcornPool)).add_liquidity(
        [0, threeCrvLPTokens],
        0
      );
    }
    IERC20(token(popcornPool)).safeIncreaseAllowance(popcornPool, lpTokens);
    uint256 shares = IPool(popcornPool).depositFor(lpTokens, msg.sender);
    return shares;
  }

  function zapOut(
    address popcornPool,
    address withdrawalToken,
    uint256 amount
  ) public returns (uint256) {
    require(canZap(popcornPool, withdrawalToken), "Unsupported token");

    IPool(popcornPool).transferFrom(msg.sender, address(this), amount);
    uint256 lpTokens = IPool(popcornPool).withdraw(amount);
    IERC20(token(popcornPool)).safeIncreaseAllowance(curveMetapoolAddress(popcornPool), lpTokens);

    uint256 withdrawal;
    if (tokenIndex(popcornPool, withdrawalToken) == 0) {
      withdrawal = CurveMetapool(curveMetapoolAddress(popcornPool)).remove_liquidity_one_coin(
        lpTokens,
        0,
        0
      );
    } else {
      uint256 threeCrvWithdrawal = CurveMetapool(curveMetapoolAddress(popcornPool)).remove_liquidity_one_coin(
        lpTokens,
        1,
        0
      );
      address threeCrv = curveRegistry.get_lp_token(curveBasepoolAddress(popcornPool));
      IERC20(threeCrv).safeIncreaseAllowance(
        curveBasepoolAddress(popcornPool),
        threeCrvWithdrawal
      );
      int128 i = tokenIndex(popcornPool, withdrawalToken) - 1;
      uint256 balanceBefore = IERC20(withdrawalToken).balanceOf(address(this));
      Curve3Pool(curveBasepoolAddress(popcornPool)).remove_liquidity_one_coin(
        threeCrvWithdrawal,
        i,
        0
      );
      uint256 balanceAfter = IERC20(withdrawalToken).balanceOf(address(this));
      withdrawal = balanceAfter.sub(balanceBefore);
    }
    IERC20(withdrawalToken).safeTransfer(msg.sender, withdrawal);
    return withdrawal;
  }
}
