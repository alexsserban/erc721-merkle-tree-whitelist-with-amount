import { ethers } from "ethers";
import MerkleTree from "merkletreejs";
import keccak256 from "keccak256";

import tokens from "./tokens.json";

const hashWhitelistToken = (mintingAddress: string, allowance: number) => {
  return Buffer.from(
    ethers.utils.solidityKeccak256(["address", "string"], [mintingAddress, allowance.toString()]).slice(2),
    "hex"
  );
};

const whitelistLeaves = Object.entries(tokens).map((token) => hashWhitelistToken(...token));
const whitelistTree = new MerkleTree(whitelistLeaves, keccak256, { sortPairs: true });

export { whitelistTree, hashWhitelistToken };
