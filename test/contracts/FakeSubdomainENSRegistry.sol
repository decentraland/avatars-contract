pragma solidity ^0.5.15;

import "../../contracts/ens/SubdomainENSRegistry.sol";


contract FakeSubdomainENSRegistry is SubdomainENSRegistry {
    // ERC20
    event Burn(address indexed burner, uint256 value);
    // ERC721
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
     // ENS Registry
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);
    // Resolver
    event AddrChanged(bytes32 indexed node, address a);
    event AddressChanged(bytes32 indexed node, uint coinType, bytes newAddress);

}