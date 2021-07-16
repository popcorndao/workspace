// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

interface IStaking {
  function stake(uint256 amount, uint256 lengthOfTime) external;

  function withdraw(uint256 amount) external;

  function getVoiceCredits(address _address) external view returns (uint256);

  function getWithdrawableBalance(address _address)
    external
    view
    returns (uint256);

  function notifyRewardAmount(uint256 reward) external;
}
