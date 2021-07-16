pragma solidity >=0.7.0 <0.8.0;

import "./ISetToken.sol";

interface BasicIssuanceModule {
  function getRequiredComponentUnitsForIssue(
    ISetToken _setToken,
    uint256 _quantity
  ) external returns (address[] memory, uint256[] memory);

  function issue(
    ISetToken _setToken,
    uint256 _quantity,
    address _to
  ) external;

  function redeem(
    ISetToken _setToken,
    uint256 _quantity,
    address _to
  ) external;
}
