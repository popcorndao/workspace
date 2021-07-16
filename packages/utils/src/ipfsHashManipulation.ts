import { utils } from 'ethers';

export function getBytes32FromIpfsHash(ipfsHash){
  const decoded = utils.base58.decode(ipfsHash);
  return utils.hexlify(decoded.slice(2));
}

export function getIpfsHashFromBytes32(bytes32Hex) {
  const hashHex = "1220" + bytes32Hex.slice(2);
  const hashBytes = Buffer.from(hashHex, "hex");
  return utils.base58.encode(hashBytes);
}