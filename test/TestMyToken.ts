import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import type { MyToken } from "../typechain-types/contracts";
import type { MyToken__factory } from "../typechain-types/factories/contracts";

import { whitelistTree, hashWhitelistToken } from "../utils/whitelist";
import tokens from "../utils/tokens.json";

describe("TruckManagers", function () {
  let tokenFactory: MyToken__factory;
  let token: MyToken;
  let owner: SignerWithAddress, addrs: SignerWithAddress[], addr: string;

  let whitelistTreeRoot: string;
  let allowance: number;
  let tx, price: BigNumber;

  before(async () => {
    tokenFactory = (await ethers.getContractFactory("MyToken")) as MyToken__factory;
  });

  beforeEach(async () => {
    [owner, ...addrs] = await ethers.getSigners();

    token = await tokenFactory.deploy();
    await token.deployed();

    price = await token.PRICE();
  });

  describe("Whitelist", function () {
    beforeEach(() => {
      whitelistTreeRoot = whitelistTree.getHexRoot();

      addr = addrs[0].address;
      allowance = tokens[addr as keyof typeof tokens];
    });

    describe("Tree", function () {
      it("should verify good leaf", function () {
        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        expect(whitelistTree.verify(mintProof, mintLeaf, whitelistTreeRoot)).to.eq(true);
      });

      it("should NOT verify leaf that is not whitelisted", function () {
        const mintLeaf = hashWhitelistToken(addrs[8].address, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        expect(whitelistTree.verify(mintProof, mintLeaf, whitelistTreeRoot)).to.eq(false);
      });

      it("should NOT verify leaf with wrong allowance", function () {
        const mintLeaf = hashWhitelistToken(addr, allowance + 1);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        expect(whitelistTree.verify(mintProof, mintLeaf, whitelistTreeRoot)).to.eq(false);
      });
    });

    describe("Contract", function () {
      it("should allow mint", async function () {
        await token.setWhitelistMerkleRoot(whitelistTree.getHexRoot());

        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        await token.connect(addrs[0]).whitelistMint(allowance, allowance, mintProof, { value: price.mul(allowance) });

        const balance = await token.balanceOf(addr);
        expect(balance.toString()).to.eq("3");
      });

      it("should reject mint, whitelistMint not started", async function () {
        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        tx = token.connect(addrs[0]).whitelistMint(allowance, allowance, mintProof, { value: price.mul(allowance) });
        await expect(tx).to.be.revertedWith("Invalid Merkle Tree proof supplied.");
      });

      it("should reject mint, whitelistMint ended", async function () {
        await token.setWhitelistMerkleRoot(whitelistTree.getHexRoot());
        await token.endWhitelistMint();

        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        tx = token.connect(addrs[0]).whitelistMint(allowance, allowance, mintProof, { value: price.mul(allowance) });
        await expect(tx).to.be.revertedWith("Invalid Merkle Tree proof supplied.");
      });

      it("should reject mint, not whitelisted", async function () {
        await token.setWhitelistMerkleRoot(whitelistTree.getHexRoot());

        const mintLeaf = hashWhitelistToken(addrs[8].address, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        tx = token.connect(addrs[8]).whitelistMint(allowance, allowance, mintProof, { value: price.mul(allowance) });
        await expect(tx).to.be.revertedWith("Invalid Merkle Tree proof supplied.");
      });

      it("should reject mint with wrong allowance", async function () {
        await token.setWhitelistMerkleRoot(whitelistTree.getHexRoot());

        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        tx = token
          .connect(addrs[0])
          .whitelistMint(allowance, allowance + 1, mintProof, { value: price.mul(allowance) });
        await expect(tx).to.be.revertedWith("Invalid Merkle Tree proof supplied.");
      });

      it("should allow minting less that max allowed", async function () {
        await token.setWhitelistMerkleRoot(whitelistTree.getHexRoot());

        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        const count = allowance - 1;
        token.connect(addrs[0]).whitelistMint(count, allowance, mintProof, { value: price.mul(count) });
      });

      it("should reject mint, more that allowed", async function () {
        await token.setWhitelistMerkleRoot(whitelistTree.getHexRoot());

        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        const count = allowance + 1;
        tx = token.connect(addrs[0]).whitelistMint(count, allowance, mintProof, { value: price.mul(count) });
        await expect(tx).to.be.revertedWith("Exceeds whitelist supply.");
      });

      it("should allow minting multiple times", async function () {
        await token.setWhitelistMerkleRoot(whitelistTree.getHexRoot());

        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        const count = 1;
        token.connect(addrs[0]).whitelistMint(count, allowance, mintProof, { value: price.mul(count) });
        token.connect(addrs[0]).whitelistMint(count, allowance, mintProof, { value: price.mul(count) });
      });

      it("should reject mint, not valid funds", async function () {
        await token.setWhitelistMerkleRoot(whitelistTree.getHexRoot());

        const mintLeaf = hashWhitelistToken(addr, allowance);
        const mintProof = whitelistTree.getHexProof(mintLeaf);

        tx = token
          .connect(addrs[0])
          .whitelistMint(allowance, allowance, mintProof, { value: price.mul(allowance - 1) });

        await expect(tx).to.be.revertedWith("Invalid funds provided.");
      });
    });
  });
});
