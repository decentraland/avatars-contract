pragma solidity ^0.5.15;

import "../ens/DCLControllerV2.sol";


contract FakeDCLControllerV2 is DCLControllerV2 {
    // ERC20
    event Burn(address indexed burner, uint256 value);
    // ERC721
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
     // ENS Registry
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);
    // DCL Registrar
    event NameRegistered(
        address indexed _caller,
        address indexed _beneficiary,
        bytes32 indexed _labelHash,
        string _subdomain,
        uint256 _createdDate
    );

    constructor(
        IERC20Token _acceptedToken,
        IDCLRegistrar _registrar
    ) public DCLControllerV2(_acceptedToken, _registrar) {}

}
