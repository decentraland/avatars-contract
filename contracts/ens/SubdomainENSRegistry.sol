
pragma solidity ^0.5.15;

import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/token/ERC721/ERC721Full.sol";

import "../interfaces/IENSRegistry.sol";
import "../interfaces/IENSResolver.sol";
import "../interfaces/IBaseRegistrar.sol";
import "../interfaces/IERC20Token.sol";


contract SubdomainENSRegistry is ERC721Full, Ownable {

    bytes4 public constant ERC721_RECEIVED = 0x150b7a02;

    IERC20Token public acceptedToken;

    IENSRegistry public registry;
    IENSResolver public resolver;
    IBaseRegistrar public  base;

    string public domain;
    string public topdomain;

    bytes32 public topdomainNamehash;
    bytes32 public domainNamehash;
    bytes32 emptyNamehash = 0x00;


    mapping (bytes32 => string) public subdomains;

    uint256 public price = 100000000000000000000; // 100 in wei

    event SubdomainCreated(address indexed _caller, address indexed _beneficiary, string _subdomain);
    event RegistryUpdated(IENSRegistry indexed previousRegistry, IENSRegistry indexed newRegistry);
    event ResolverUpdated(IENSResolver indexed previousResolver, IENSResolver indexed newResolver);


     /**
	 * @dev Initializer of the contract.
     * @param _acceptedToken - address of the accepted token.
	 * @param _registry - address of the ENS registry contract.
     * @param _resolver - address of the ENS public resolver contract.
     * @param _base - address of the ENS base registrar contract.
     * @param _topdomain - top domain (e.g. "eth").
     * @param _domain - domain (e.g. "dcl").
     * @param _owner - address of the owner allowed to register usernames and assign the role.
	 */
    function initialize(
        IERC20Token _acceptedToken,
        IENSRegistry _registry,
        IENSResolver _resolver,
        IBaseRegistrar _base,
        string memory _topdomain,
        string memory _domain,
        address _owner
    ) public initializer {
        // Accepted token
        acceptedToken = _acceptedToken;

        // ENS registry
        registry = _registry;
        // ENS public resolver
        resolver = _resolver;
        // ENS base registrar
        base = _base;

        // Top domain string
        topdomain = _topdomain;
        // Domain string
        domain = _domain;

        // Generate namehash for the top domain
        topdomainNamehash = keccak256(abi.encodePacked(emptyNamehash, keccak256(abi.encodePacked(topdomain))));
        // Generate namehash for the domain
        domainNamehash = keccak256(abi.encodePacked(topdomainNamehash, keccak256(abi.encodePacked(domain))));

        // Owner
        Ownable.initialize(_owner);
    }

    // @TODO: wip method
    function migrateNames(bytes32[] calldata _names, address[] calldata _beneficiaries) external {
        for (uint256 i = 0; i < _names.length; i++) {
            string memory name = _bytes32ToString(_names[i]);
            bytes32 subdomainLabelhash = keccak256(abi.encodePacked(name));
            // Create new subdomain, temporarily this smartcontract is the owner
            registry.setSubnodeOwner(domainNamehash, subdomainLabelhash, _beneficiaries[i]);
            // Mint an ERC721 token with the sud domain label hash as its id
            _mint(_beneficiaries[i], uint256(subdomainLabelhash));
            // Map the ERC721 token id with the sub domain for reversion.
            subdomains[subdomainLabelhash] = name;
            // Emit sub domain creation event
            emit SubdomainCreated(msg.sender, _beneficiaries[i], name);
        }
    }


    /**
	 * @dev Allows to create a subdomain (e.g. "nacho.dcl.eth"), set its resolver, owner and target address.
	 * @param _subdomain - sub domain  (e.g. "nacho").
	 * @param _beneficiary - address that will become owner of this new sub domain. The sub domain
     * will resolve to this address too.
	 */
    function register(string memory _subdomain, address _beneficiary) public {
        // Check if the sender has at least `price` and the contract has allowance to use on its behalf
        _requireBalance(msg.sender);
        // Make sure this contract owns the domain
        require(registry.owner(domainNamehash) == address(this), "this contract should own the domain");
        // Create labelhash for the sub domain
        bytes32 subdomainLabelhash = keccak256(abi.encodePacked(_subdomain));
        // Create namehash for the sub domain
        bytes32 subdomainNamehash = keccak256(abi.encodePacked(domainNamehash, subdomainLabelhash));
        // Make sure it is free
        require(registry.owner(subdomainNamehash) == address(0), "sub domain already owned");
        // Create new subdomain, temporarily this smartcontract is the owner
        registry.setSubnodeOwner(domainNamehash, subdomainLabelhash, _beneficiary);
        // // Set public resolver for this domain
        // registry.setResolver(subdomainNamehash, address(resolver));
        // // Set the destination address
        // resolver.setAddr(subdomainNamehash, _beneficiary);
        // Mint an ERC721 token with the sud domain label hash as its id
        _mint(_beneficiary, uint256(subdomainLabelhash));
        // Map the ERC721 token id with the sub domain for reversion.
        subdomains[subdomainLabelhash] = _subdomain;
        // Debit `price` from sender
        acceptedToken.transferFrom(msg.sender, address(this), price);
        // Burn it
        acceptedToken.burn(price);
        // Emit sub domain creation event
        emit SubdomainCreated(msg.sender, _beneficiary, _subdomain);
    }



    /**
	 * @dev Re-claim the ownership of the domain (e.g. "dcl").
     * @notice After a domain is transferred by the ENS base registrar to this contract, the owner in the ENS registry contract
     * is still the old owner. Therefore, the owner should call `reclaimDomain` to update the owner of the domain.
	 * @param _tokenId - erc721 token id which represents the node (domain).
     */
    function reclaimDomain(uint256 _tokenId) public onlyOwner {
        base.reclaim(_tokenId, address(this));
    }

    /**
	 * @dev Re-claim the ownership of a sub domain (e.g. "nacho").
     * @notice After a sub domain is transferred by this contract, the owner in the ENS registry contract
     * is still the old owner. Therefore, the owner should call `reclaimSubdomain` to update the owner of the sub domain.
	 * @param _tokenId - erc721 token id which represents the node (sub domain).
     */
    function reclaimSubdomain(uint256 _tokenId) public {
         // Check if the update is possible
        require(
            _isApprovedOrOwner(msg.sender, _tokenId),
            "Only an authorized account can change the sub domain settings"
        );

        registry.setSubnodeOwner(domainNamehash, bytes32(_tokenId), msg.sender);
    }

    /**
    * @dev The ERC721 smart contract calls this function on the recipient
    * after a `safetransfer`. This function MAY throw to revert and reject the
    * transfer. Return of other than the magic value MUST result in the
    * transaction being reverted.
    * Note: the contract address is always the message sender.
    * @notice Handle the receipt of an NFT. Used to re-claim ownership at the ENS registry contract
    * @param _tokenId The NFT identifier which is being transferred
    * @return `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    */
    function onERC721Received(
        address /* _operator */,
        address /* _from */,
        uint256 _tokenId,
        bytes memory /* _data */
    )
        public
        returns (bytes4)
    {
        require(msg.sender == address(base), "only base can send NFTs to this contract");

        // Re-claim to update the owner at the ENS Registry
        base.reclaim(_tokenId, address(this));
        return ERC721_RECEIVED;
    }

    /**
	 * @dev The contract owner can take away the ownership of any domain owned by this contract.
	 * @param _owner - new owner for the domain.
     * @param _nodeId - erc721 token id which represents the node (domain).
	 */
    function transferDomainOwnership(address _owner, uint256 _nodeId) public onlyOwner {
        base.transferFrom(address(this), _owner, _nodeId);
        emit OwnershipTransferred(address(this), _owner);
    }

	/**
	 * @dev Allows to update to new ENS registry.
	 * @param _registry The address of new ENS registry to use.
	 */
    function updateRegistry(IENSRegistry _registry) public onlyOwner {
        require(registry != _registry, "new registry should be different from old");

        emit RegistryUpdated(registry, _registry);

        registry = _registry;
    }


    // /**
    // * @dev Return the target address where the sub domain is pointing to (e.g. "0x12345...").
    // * @param _subdomain - sub domain name only e.g. "nacho".
    // */
    // function subdomainTarget(string memory _subdomain) public view returns (address) {
    //     bytes32 subdomainNamehash = keccak256(abi.encodePacked(domainNamehash, keccak256(abi.encodePacked(_subdomain))));
    //     address currentResolver = registry.resolver(subdomainNamehash);

    //     return IENSResolver(currentResolver).addr(subdomainNamehash);
    // }

    /**
     * @dev Validate if a user has balance and the contract has enough allowance
     * to use user's accepted token on his belhalf.
     * @param _user - address of the user.
     */
    function _requireBalance(address _user) internal view {
        require(
            acceptedToken.balanceOf(_user) >= price,
            "Insufficient funds"
        );
        require(
            acceptedToken.allowance(_user, address(this)) >= price,
            "The contract is not authorized to use the accepted token on sender behalf"
        );
    }

     /**
     * @dev Convert bytes32 to string.
     * @param _x - to be converted to string.
     * @return string
     */
    function _bytes32ToString(bytes32 _x) internal pure returns (string memory) {
        uint256 charCount = 0;
        for (uint256 j = 0; j <= 256; j += 8) {
            byte char = byte(_x << j);
            if (char == 0) {
                break;
            }
            charCount++;
        }

        string memory out = new string(charCount);
        assembly {
            mstore(add(0x20, out), _x)
        }

        return out;
    }
}