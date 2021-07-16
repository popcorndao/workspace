import { BigNumber, utils } from 'ethers';

export function formatAndRoundBigNumber(value: BigNumber): string {
  if (BigNumber.isBigNumber(value)) {
    return Number(utils.formatEther(value)).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  } else return `Invalid val: ${value}`;
}

export function bigNumberToNumber(value: BigNumber): number {
  if (BigNumber.isBigNumber(value)) {
    return Number(utils.formatEther(value));
  } else return 0;
}
