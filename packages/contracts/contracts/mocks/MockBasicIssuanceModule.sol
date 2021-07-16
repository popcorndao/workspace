pragma solidity >=0.7.0 <0.8.0;

import "../Interfaces/Integrations/ISetToken.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockBasicIssuanceModule {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  IERC20[] public underlying;
  uint256[] public quantities;

  event SetIssued(ISetToken setToken, uint256 amount, address to);
  event SetRedeemed(ISetToken setToken, uint256 amount, address to);

  constructor(IERC20[] memory underlying_, uint256[] memory quantities_) {
    for (uint256 i; i < underlying_.length; i++) {
      underlying.push(underlying_[i]);
    }
    quantities = quantities_;
  }

  function issue(
    ISetToken _setToken,
    uint256 _quantity,
    address _to
  ) external {
    for (uint256 i; i < underlying.length; i++) {
      uint256 amount = _quantity.mul(quantities[i]);
      require(
        underlying[i].balanceOf(msg.sender) >= amount,
        "not enough underlying token"
      );
      underlying[i].transferFrom(msg.sender, address(this), amount);
    }
    ISetToken(_setToken).mint(_to, _quantity);
    emit SetIssued(_setToken, _quantity, _to);
  }

  function redeem(
    ISetToken _setToken,
    uint256 _quantity,
    address _to
  ) external {
    require(_setToken.balanceOf(msg.sender) >= _quantity);
    _setToken.transferFrom(msg.sender, address(this), _quantity);
    for (uint256 i; i < underlying.length; i++) {
      uint256 amount = _quantity.mul(quantities[i]);
      underlying[i].approve(address(this), amount);
      underlying[i].transfer(_to, amount);
    }
    emit SetRedeemed(_setToken, _quantity, msg.sender);
  }
}
