import { BigNumber, utils } from 'ethers';

export function formatAndRoundBigNumber(value: BigNumber): string {
  if (BigNumber.isBigNumber(value)) {
    return Number(utils.formatEther(value)).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  }
  return `Invalid val: ${value}`;
}

export function bigNumberToNumber(value: BigNumber): number {
  if (BigNumber.isBigNumber(value)) {
    return Number(utils.formatEther(value));
  }
  return 0;
}

export function numberToBigNumber(value: number): BigNumber {
  if (typeof value === 'number') {
    return BigNumber.from(String(value));
  }
  return BigNumber.from('0');
}

export function scaleNumberToBigNumber(value: number): BigNumber {
  if (typeof value === 'number') {
    return utils.parseEther(String(value));
  }
  return utils.parseEther("0")
}
