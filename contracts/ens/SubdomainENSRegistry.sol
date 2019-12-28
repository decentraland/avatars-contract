
pragma solidity ^0.5.15;

import "openzeppelin-eth/contracts/ownership/Ownable.sol";
import "openzeppelin-eth/contracts/token/ERC721/ERC721Full.sol";

import "../interfaces/IENSRegistry.sol";
import "../interfaces/IENSResolver.sol";
import "../interfaces/IBaseRegistrar.sol";
import "../interfaces/IERC20Token.sol";


contract SubdomainENSRegistry is ERC721Full, Ownable {

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

    event SubdomainCreated(address indexed creator, address indexed owner, string subdomain, string domain, string topdomain);
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

    /**
	 * @dev Allows to create a subdomain (e.g. "nacho.dcl.eth"), set its resolver, owner and target address.
	 * @param _subdomain - sub domain  (e.g. "nacho").
	 * @param _beneficiary - address that will become owner of this new sub domain. The sub domain
     * will resolve to this address too.
	 */
    function newSubdomain(string memory _subdomain, address _beneficiary) public {
        // Check if the user has at least `price` and the contract has allowance to use on its behalf
        _requireBalance(_beneficiary);
        // Make sure this contract owns the domain
        require(registry.owner(domainNamehash) == address(this), "this contract should own the domain");
        // Create labelhash for the sub domain
        bytes32 subdomainLabelhash = keccak256(abi.encodePacked(_subdomain));
        // Create namehash for the sub domain
        bytes32 subdomainNamehash = keccak256(abi.encodePacked(domainNamehash, subdomainLabelhash));
        // Make sure it is free
        require(registry.owner(subdomainNamehash) == address(0), "sub domain already owned");
        // Create new subdomain, temporarily this smartcontract is the owner
        registry.setSubnodeOwner(domainNamehash, subdomainLabelhash, address(this));
        // Set public resolver for this domain
        registry.setResolver(subdomainNamehash, address(resolver));
        // Set the destination address
        resolver.setAddr(subdomainNamehash, _beneficiary);
        // Mint an ERC721 token with the sud domain label hash as its id
        _mint(_beneficiary, uint256(subdomainLabelhash));
        // Map the ERC721 token id with the sub domain for reversion.
        subdomains[subdomainLabelhash] = _subdomain;
        // Debit `price` from _beneficiary
        acceptedToken.transferFrom(_beneficiary, address(this), price);
        // Burn it
        acceptedToken.burn(price);
        // Emit sub domain creation event
        emit SubdomainCreated(msg.sender, _beneficiary, _subdomain, domain, topdomain);
    }


    /**
    * @dev Return the target address where the sub domain is pointing to (e.g. "0x12345...").
    * @param _subdomain - sub domain name only e.g. "nacho".
    * @param _target - address that resolve the address.
    */
    function setSubdomainTarget(string memory _subdomain, address _target) public {
        // Create labelhash for the sub domain
        bytes32 subdomainLabelhash = keccak256(abi.encodePacked(_subdomain));

        // Check if the update is possible
        require(
            _isApprovedOrOwner(msg.sender, uint256(subdomainLabelhash)),
            "Only an authorized account can change the sub domain settings"
        );

        // Create namehash for the sub domain
        bytes32 subdomainNamehash = keccak256(abi.encodePacked(domainNamehash, subdomainLabelhash));

        // Get Resolver of the sub domain
        address currentResolver = registry.resolver(subdomainNamehash);

        // Set the new target address
        IENSResolver(currentResolver).setAddr(subdomainNamehash, _target);
    }


    /**
	 * @dev Re-claim the ownership of the domain (e.g. "dcl").
     * @notice After a domain is transferred by the ENS base registrar to this contract, the owner in the ENS registry contract
     * is still the old owner. Therefore, the owner should call `reclaim` to set update the owner of the domain.
	 * @param _tokenId - erc721 token id which represents the node (domain).
     */
    function reclaim(uint256 _tokenId) public onlyOwner {
        base.reclaim(_tokenId, address(this));
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

	/**
	 * @dev Allows to update to new ENS resolver.
	 * @param _resolver The address of new ENS resolver to use.
	 */
    function updateResolver(IENSResolver _resolver) public onlyOwner {
        require(resolver != _resolver, "new resolver should be different from old");

        emit ResolverUpdated(resolver, _resolver);

        resolver = _resolver;
    }

    /**
     * @dev Update a sub domain to the current ENS resolver.
     * @param _subdomain - sub domain name only e.g. "nacho".
     */
    function updateSubdomainResolver(string memory _subdomain) public {
        bytes32 subdomainNamehash = keccak256(abi.encodePacked(domainNamehash, keccak256(abi.encodePacked(_subdomain))));
        address currentResolver = registry.resolver(subdomainNamehash);

        require(currentResolver != address(resolver), "The resolver is up to date");

        // Update to resolver for this subdomain
        registry.setResolver(subdomainNamehash, address(resolver));
    }

    /**
    * @dev Return the target address where the sub domain is pointing to (e.g. "0x12345...").
    * @param _subdomain - sub domain name only e.g. "nacho".
    */
    function subdomainTarget(string memory _subdomain) public view returns (address) {
        bytes32 subdomainNamehash = keccak256(abi.encodePacked(domainNamehash, keccak256(abi.encodePacked(_subdomain))));
        address currentResolver = registry.resolver(subdomainNamehash);

        return IENSResolver(currentResolver).addr(subdomainNamehash);
    }

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
}