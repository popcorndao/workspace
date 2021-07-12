// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./MockERC20.sol";
import "hardhat/console.sol";

contract MockYearnV2Vault is MockERC20 {
  using SafeMath for uint256;
  using SafeERC20 for MockERC20;

  MockERC20 public token;

  constructor(address token_) MockERC20("Mock crvUSDX yVault", "yvUSDX", 18) {
    token = MockERC20(token_);
  }

  function maxAvailableShares() external view returns (uint256) {
    return totalSupply();
  }

  function balance() public view returns (uint256) {
    return token.balanceOf(address(this));
  }

  function totalAssets() external view returns (uint256) {
    return token.balanceOf(address(this));
  }

  function pricePerShare() public view returns (uint256) {
    if (totalSupply() == 0) {
      return 1e18;
    }
    return balance().mul(1e18).div(totalSupply());
  }

  function deposit(uint256 amount) external returns (uint256) {
    token.transferFrom(msg.sender, address(this), amount);
    return _issueSharesForAmount(msg.sender, amount);
  }

  function deposit(uint256 amount, address recipient)
    external
    returns (uint256)
  {
    token.transferFrom(msg.sender, address(this), amount);
    return _issueSharesForAmount(recipient, amount);
  }

  function withdraw(uint256 amount) external returns (uint256) {
    uint256 tokenAmount = _shareValue(amount);
    _burn(msg.sender, amount);
    token.approve(address(this), tokenAmount);
    token.transferFrom(address(this), msg.sender, tokenAmount);
    return tokenAmount;
  }

  function _issueSharesForAmount(address to, uint256 amount)
    internal
    returns (uint256)
  {
    uint256 shares = 0;
    if (this.totalSupply() == 0) {
      shares = amount;
    } else {
      shares = (amount * this.totalSupply()) / this.totalAssets();
    }
    _mint(to, shares);
    return shares;
  }

  function _shareValue(uint256 shares) internal view returns (uint256) {
    if (this.totalSupply() == 0) {
      return shares;
    }
    return (shares * this.totalAssets()) / this.totalSupply();
  }

  // Test helpers

  function increasePricePerFullShare(uint256 multiplier) external {
    uint256 newPrice = pricePerShare().mul(multiplier).div(1e18);
    token.burn(address(this), token.balanceOf(address(this)));
    uint256 balance = newPrice.mul(totalSupply()).div(1e18);
    token.mint(address(this), balance);
  }

  function setPricePerFullShare(uint256 pricePerFullShare) external {
    token.burn(address(this), token.balanceOf(address(this)));
    uint256 balance = pricePerFullShare.mul(totalSupply()).div(1e18);
    token.mint(address(this), balance);
  }
}
