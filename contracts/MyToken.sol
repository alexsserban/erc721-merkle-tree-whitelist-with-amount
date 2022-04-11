// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MyToken is ERC721, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    bytes32 public whitelistMerkleRoot;
    uint256 public constant PRICE = 0.0001 ether;

    mapping(address => uint256) public addressToMinted;

    constructor() ERC721("MyToken", "MTK") {}

    function _baseURI() internal pure override returns (string memory) {
        return "https://example.com";
    }

    function setWhitelistMerkleRoot(bytes32 _whitelistMerkleRoot)
        external
        onlyOwner
    {
        whitelistMerkleRoot = _whitelistMerkleRoot;
    }

    function endWhitelistMint() external onlyOwner {
        delete whitelistMerkleRoot;
    }

    function _leaf(string memory allowance, string memory payload)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(payload, allowance));
    }

    function _verify(bytes32 leaf, bytes32[] memory proof)
        internal
        view
        returns (bool)
    {
        return MerkleProof.verify(proof, whitelistMerkleRoot, leaf);
    }

    function getAllowance(string memory allowance, bytes32[] calldata proof)
        public
        view
        returns (string memory)
    {
        string memory payload = string(abi.encodePacked(_msgSender()));
        require(
            _verify(_leaf(allowance, payload), proof),
            "Invalid Merkle Tree proof supplied."
        );
        return allowance;
    }

    function whitelistMint(
        uint256 count,
        uint256 allowance,
        bytes32[] calldata proof
    ) public payable {
        string memory payload = string(abi.encodePacked(_msgSender()));
        require(
            _verify(_leaf(Strings.toString(allowance), payload), proof),
            "Invalid Merkle Tree proof supplied."
        );
        require(
            addressToMinted[_msgSender()] + count <= allowance,
            "Exceeds whitelist supply."
        );
        require(count * PRICE == msg.value, "Invalid funds provided.");

        addressToMinted[_msgSender()] += count;
        for (uint256 i; i < count; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            _safeMint(_msgSender(), tokenId);
        }
    }
}
