pragma solidity >=0.6.0 <0.8.0;

import "./Governed.sol";

contract Defended is Governed {
  mapping(address => bool) public approved;

  function approveContractAccess(address account) external onlyGovernance {
    approved[account] = true;
  }

  function revokeContractAccess(address account) external onlyGovernance {
    approved[account] = false;
  }

  constructor() public Governed(msg.sender) {}

  modifier defend {
    _defend();
    _;
  }

  function _defend() internal view {
    require(
      approved[msg.sender] || msg.sender == tx.origin,
      "Access denied for caller"
    );
  }
}
