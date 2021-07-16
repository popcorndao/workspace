import { Web3Provider } from '@ethersproject/providers';
import { ArrowRightIcon } from '@heroicons/react/outline';
import { formatAndRoundBigNumber } from '@popcorn/utils/formatBigNumber';
import { useWeb3React } from '@web3-react/core';
import MainActionButton from 'components/MainActionButton';
import { store } from 'context/store';
import { ContractsContext } from 'context/Web3/contracts';
import { BigNumber } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { useContext, useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import RewardDestination from '../../components/RewardsManager/RewardDestination';
import Navbar from 'components/NavBar/NavBar';
import { connectors } from 'context/Web3/connectors';

export default function Register(): JSX.Element {
  const context = useWeb3React<Web3Provider>();
  const { library, account, activate } = context;
  const { contracts } = useContext(ContractsContext);
  const { dispatch } = useContext(store);
  const [wait, setWait] = useState<boolean>(false);
  const [feeBalance, setFeeBalance] = useState<BigNumber>();
  const [popBalance, setPopBalance] = useState<BigNumber>();
  const [swapOutput, setSwapOutput] = useState<BigNumber>();
  const [rewardSplits, setRewardSplits] = useState<BigNumber[]>();

  useEffect(() => {
    if (contracts && account) {
      contracts.threeCrv
        .balanceOf(contracts.rewardsManager.address)
        .then((res) => setFeeBalance(res));
      contracts.pop
        .balanceOf(contracts.rewardsManager.address)
        .then((res) => setPopBalance(res));
      contracts.rewardsManager
        .getRewardSplits()
        .then((res) => setRewardSplits(res));
    }
  }, [contracts, account]);

  useEffect(() => {
    if (contracts && feeBalance !== undefined) {
      contracts.uniswap
        .getAmountsOut(feeBalance, [
          contracts.threeCrv.address,
          contracts.pop.address,
        ])
        .then((res) => setSwapOutput((prevState) => res[1]));
    }
  }, [feeBalance]);

  function calculateRewardAmount(index: number): string {
    return rewardSplits === undefined || popBalance === undefined
      ? '0'
      : formatAndRoundBigNumber(
          rewardSplits[index].mul(popBalance).div(parseEther('100')),
        );
  }

  async function swapToken(): Promise<void> {
    setWait(true);
    toast.loading('Swap in Progress...');
    await contracts.rewardsManager
      .connect(library.getSigner())
      .swapTokenForRewards(
        [contracts.threeCrv.address, contracts.pop.address],
        swapOutput,
      )
      .catch((err) => {
        console.log('err', err);
        toast.error('Swap failed');
      });
    toast.success('Funds swapped!');
    setWait(false);
  }

  async function distributeRewards(): Promise<void> {
    setWait(true);
    toast.loading("Distributing funds...")
    await contracts.rewardsManager
      .connect(library.getSigner())
      .distributeRewards()
      .catch((err) => {
        console.log('err', err);
        toast.error('Couldnt distribute funds');
      });
    toast.success("Funds distributed!")
    setWait(false);
  }

  return (
    <div className="w-full bg-gray-900 h-screen">
      <Navbar />
      <Toaster position="top-right" />
      <div className="bg-gray-900">
        <div className="pt-12 px-4 sm:px-6 lg:px-8 lg:pt-20">
          <div className="text-center">
            <h2 className="text-lg leading-6 font-semibold text-gray-300 uppercase tracking-wider"></h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              Rewards Manager
            </p>
            <p className="mt-3 max-w-4xl mx-auto text-xl text-gray-300 sm:mt-5 sm:text-2xl">
              You can swap 3CRV for POP here to distribute it to the
              beneficiaries.
            </p>
          </div>
        </div>

        <div className="mt-8 pb-12 lg:mt-8 lg:pb-20">
          <div className="max-w-2xl mx-auto rounded-lg shadow-xl bg-white">
            <div className="rounded-t-lg pt-12 pb-10">
              <h3 className="text-center text-3xl font-semibold text-gray-900 sm:-mx-6">
                Swap Accrued Fees
              </h3>
              <p className="text-lg text-center text-gray-800 mt-4">
                Swap accrued fees to distribute them as rewards across the
                protocol.
              </p>
            </div>
            <div className="bg-gray-50 border-t-2 border-gray-100 rounded-b-lg pb-10 px-4 sm:px-6 lg:px-12 pt-12">
              <div className="flex flex-row items-center">
                <div className="flex flex-row items-center">
                  <div className="mr-4 p-2 rounded-md flex flex-row bg-gray-200 border border-gray-400 shadow-sm cursor-pointer">
                    {/*TODO cut empty space of 3crv icon */}
                    <img
                      src="/images/3crv_icon.png"
                      alt="Logo"
                      className="w-6 h-6 mr-2"
                    ></img>
                    <p className="text-lg font-semibold text-gray-800">3CRV</p>
                  </div>
                  <p className="text-2xl font-bold text-right text-gray-900">
                    {feeBalance === undefined
                      ? 0
                      : formatAndRoundBigNumber(feeBalance)}
                  </p>
                </div>
                <ArrowRightIcon className="h-8 mx-auto" />
                <div className="flex flex-row items-center">
                  <p className="text-2xl font-bold text-right text-gray-900">
                    {swapOutput === undefined
                      ? 0
                      : formatAndRoundBigNumber(swapOutput)}
                  </p>
                  <img
                    src="/images/popcorn_v1_rainbow_bg.png"
                    alt="Logo"
                    className="w-6 h-6 ml-4 mr-2"
                  ></img>
                  <p className="text-lg font-semibold text-gray-800">POP</p>
                </div>
              </div>
              <div className="rounded-lg shadow-md mt-8">
                {!account && (
                  <MainActionButton
                    label={'Connect Wallet'}
                    handleClick={() => activate(connectors.Injected)}
                  />
                )}
                {account && (
                  <MainActionButton
                    label={'Swap Fees'}
                    handleClick={swapToken}
                    disabled={
                      wait ||
                      swapOutput === undefined ||
                      formatAndRoundBigNumber(swapOutput) === '0'
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pb-12 lg:mt-8 lg:pb-20">
          <div className="max-w-2xl mx-auto rounded-lg shadow-xl bg-white">
            <div className="px-4 sm:px-6 lg:px-12 py-8">
              <h3 className="text-center text-3xl font-semibold text-gray-900 sm:-mx-6">
                Distribute Rewards
              </h3>
            </div>
            <div className="bg-gray-50 border-t-2 border-gray-100 rounded-b-lg pb-10 px-4 sm:px-6 lg:px-12 pt-12">
              <div className="flex flex-row">
                <div className="w-5/12 flex flex-col justify-center">
                  <p className="text-2xl font-bold mb-2 text-gray-900">
                    Rewards
                  </p>
                  <span className="flex flex-row items-center">
                    <p className="text-2xl">
                      {popBalance === undefined
                        ? 0
                        : formatAndRoundBigNumber(popBalance)}
                    </p>
                    <img
                      src="/images/popcorn_v1_rainbow_bg.png"
                      alt="Logo"
                      className="w-6 h-6 ml-2"
                    ></img>
                  </span>
                </div>
                <div className="w-2/12 flex flex-col justify-center">
                  <ArrowRightIcon className="w-12 h-12 mx-auto" />
                </div>
                <div className="w-5/12 flex flex-col space-y-8 items-end">
                  <RewardDestination
                    destination="Beneficiaries"
                    reward={calculateRewardAmount(3)}
                  />
                  <RewardDestination
                    destination="Staking"
                    reward={calculateRewardAmount(0)}
                  />
                  <RewardDestination
                    destination="Treasury"
                    reward={calculateRewardAmount(1)}
                  />
                  <RewardDestination
                    destination="Insurance"
                    reward={calculateRewardAmount(2)}
                  />
                </div>
              </div>
              <div className="rounded-lg shadow-md mt-8">
                {!account && (
                  <MainActionButton
                    label={'Connect Wallet'}
                    handleClick={() => activate(connectors.Injected)}
                  />
                )}
                {account && (
                  <MainActionButton
                    label={'Distribute Fees'}
                    handleClick={distributeRewards}
                    disabled={
                      wait ||
                      popBalance === undefined ||
                      formatAndRoundBigNumber(popBalance) === '0'
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
