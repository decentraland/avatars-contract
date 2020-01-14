pragma solidity ^0.5.15;

import "../ens/DCLRegistrar.sol";


contract FakeDCLRegistrar is DCLRegistrar {
    // ERC721
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
     // ENS Registry
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);

    constructor(
        IENSRegistry _registry,
        IBaseRegistrar _base,
        string memory _topdomain,
        string memory _domain,
        string memory _baseURI
    ) public DCLRegistrar(_registry, _base, _topdomain, _domain, _baseURI) {}

    function bytes32ToString(bytes32 _str) public pure returns (string memory) {
        return _bytes32ToString(_str);
    }

    function toLowerCase(string memory _str) public pure returns (string memory) {
        return _toLowerCase(_str);
    }
}