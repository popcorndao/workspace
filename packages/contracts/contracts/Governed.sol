pragma solidity >=0.6.0 <0.8.0;

// https://docs.synthetix.io/contracts/source/contracts/owned
contract Governed {
  address public governance;
  address public nominatedGovernance;

  constructor(address _governance) public {
    require(_governance != address(0), "Governance address cannot be 0");
    governance = _governance;
    emit GovernanceChanged(address(0), _governance);
  }

  function nominateNewGovernance(address _governance) external onlyGovernance {
    nominatedGovernance = _governance;
    emit GovernanceNominated(_governance);
  }

  function acceptGovernance() external {
    require(
      msg.sender == nominatedGovernance,
      "You must be nominated before you can accept governance"
    );
    emit GovernanceChanged(governance, nominatedGovernance);
    governance = nominatedGovernance;
    nominatedGovernance = address(0);
  }

  modifier onlyGovernance {
    _onlyGovernance();
    _;
  }

  function _onlyGovernance() private view {
    require(
      msg.sender == governance,
      "Only the contract governance may perform this action"
    );
  }

  event GovernanceNominated(address newGovernance);
  event GovernanceChanged(address oldGovernance, address newGovernance);
}
