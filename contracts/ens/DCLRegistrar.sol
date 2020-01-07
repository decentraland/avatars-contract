
pragma solidity ^0.5.15;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";

import "../interfaces/IENSRegistry.sol";
import "../interfaces/IENSResolver.sol";
import "../interfaces/IBaseRegistrar.sol";
import "../interfaces/IERC20Token.sol";


contract DCLRegistrar is ERC721Full, Ownable {

    using Address for address;

    bytes4 public constant ERC721_RECEIVED = 0x150b7a02;

    // The ENS registry
    IENSRegistry public registry;
    // The ENS base registrar
    IBaseRegistrar public  base;

    // A map of addresses that are authorised to register and renew names.
    mapping(address => bool) public controllers;

    string public domain;
    string public topdomain;

    bytes32 public topdomainNameHash;
    bytes32 public domainNameHash;
    bytes32 emptyNamehash = 0x00;

    bool public migrated;

    mapping (bytes32 => string) public subdomains;

    event NameRegistered(
        address indexed _caller,
        address indexed _beneficiary,
        bytes32 indexed _labelHash,
        string _subdomain
    );
    event Reclaimed(address indexed _caller, address indexed _owner, uint256 indexed  _tokenId);
    event DomainReclaimed(uint256 indexed _tokenId);
    event DomainTransferred(address indexed _newOwner, uint256 indexed _tokenId);

    event RegistryUpdated(IENSRegistry indexed _previousRegistry, IENSRegistry indexed _newRegistry);
    event BaseUpdated(IBaseRegistrar indexed _previousBase, IBaseRegistrar indexed _newBase);

    event ControllerAdded(address indexed _controller);
    event ControllerRemoved(address indexed _controller);

    event MigrationFinished();

    modifier onlyController() {
        require(controllers[msg.sender], "Only a controller can call this method");
        _;
    }

    modifier isMigrating() {
        require(migrated == false, "The migration has finished");
        _;
    }

     /**
	 * @dev Constructor of the contract.
	 * @param _registry - address of the ENS registry contract.
     * @param _base - address of the ENS base registrar contract.
     * @param _topdomain - top domain (e.g. "eth").
     * @param _domain - domain (e.g. "dcl").
	 */
    constructor(
        IENSRegistry _registry,
        IBaseRegistrar _base,
        string memory _topdomain,
        string memory _domain
    ) public ERC721Full("DCL Registrar", "DCLENS") {
        // ENS registry
        updateRegistry(_registry);
        // ENS base registrar
        updateBase(_base);

        // Top domain string
        require(bytes(_topdomain).length > 0, "Top domain can not be empty");
        topdomain = _topdomain;

        // Domain string
        require(bytes(_domain).length > 0, "Domain can not be empty");
        domain = _domain;

        // Generate namehash for the top domain
        topdomainNameHash = keccak256(abi.encodePacked(emptyNamehash, keccak256(abi.encodePacked(topdomain))));
        // Generate namehash for the domain
        domainNameHash = keccak256(abi.encodePacked(topdomainNameHash, keccak256(abi.encodePacked(domain))));
    }

    // @TODO: wip method
    function migrateNames(bytes32[] calldata _names, address[] calldata _beneficiaries) external onlyOwner isMigrating {
        for (uint256 i = 0; i < _names.length; i++) {
            string memory name = _bytes32ToString(_names[i]);
            _register(
                name,
                keccak256(abi.encodePacked(name)),
                _beneficiaries[i]
            );
        }
    }

    /**
	 * @dev Allows to create a subdomain (e.g. "nacho.dcl.eth"), set its resolver, owner and target address.
	 * @param _subdomain - subdomain  (e.g. "nacho").
	 * @param _beneficiary - address that will become owner of this new subdomain. The subdomain
     * will resolve to this address too.
	 */
    function register(string calldata _subdomain, address _beneficiary) external onlyController {
        // Make sure this contract owns the domain
        require(registry.owner(domainNameHash) == address(this), "The contract doesn not own the domain");
        // Create labelhash for the subdomain
        bytes32 subdomainLabelHash = keccak256(abi.encodePacked(_subdomain));
        // Create namehash for the subdomain
        bytes32 subdomainNameHash = keccak256(abi.encodePacked(domainNameHash, subdomainLabelHash));
        // Make sure it is free
        require(available(subdomainNameHash), "Subdomain already owned");

        _register(_subdomain, subdomainLabelHash, _beneficiary);
    }

    function _register(string memory _subdomain, bytes32 subdomainLabelHash, address _beneficiary) internal {
        // Create new subdomain, temporarily this smartcontract is the owner
        registry.setSubnodeOwner(domainNameHash, subdomainLabelHash, _beneficiary);
        // Mint an ERC721 token with the sud domain label hash as its id
        _mint(_beneficiary, uint256(subdomainLabelHash));
        // Map the ERC721 token id with the subdomain for reversion.
        subdomains[subdomainLabelHash] = _subdomain;
        // Emit registered name event
        emit NameRegistered(msg.sender, _beneficiary, subdomainLabelHash, _subdomain);
    }

    /**
	 * @dev Re-claim the ownership of a subdomain (e.g. "nacho").
     * @notice After a subdomain is transferred by this contract, the owner in the ENS registry contract
     * is still the old owner. Therefore, the owner should call `reclaimSubdomain` to update the owner of the subdomain.
	 * @param _tokenId - erc721 token id which represents the node (subdomain).
     * @param _owner - new owner.
     */
    function reclaim(uint256 _tokenId, address _owner) public {
        // Check if the sender is authorized to manage the subdomain
        require(
            _isApprovedOrOwner(msg.sender, _tokenId),
            "Only an authorized account can change the subdomain settings"
        );

        registry.setSubnodeOwner(domainNameHash, bytes32(_tokenId), _owner);

        emit Reclaimed(msg.sender, _owner, _tokenId);
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
        require(msg.sender == address(base), "Only base can send NFTs to this contract");

        // Re-claim to update the owner at the ENS Registry
        base.reclaim(_tokenId, address(this));
        return ERC721_RECEIVED;
    }

    function available(bytes32 _labelhash) public view returns (bool) {
        // Make sure it is free
        return registry.owner(_labelhash) == address(0) && !_exists(uint256(_labelhash));
    }


    /**
	 * @dev Re-claim the ownership of the domain (e.g. "dcl").
     * @notice After a domain is transferred by the ENS base registrar to this contract, the owner in the ENS registry contract
     * is still the old owner. Therefore, the owner should call `reclaimDomain` to update the owner of the domain.
	 * @param _tokenId - erc721 token id which represents the node (domain).
     */
    function reclaimDomain(uint256 _tokenId) public onlyOwner {
        base.reclaim(_tokenId, address(this));

        emit DomainReclaimed(_tokenId);
    }

    /**
	 * @dev The contract owner can take away the ownership of any domain owned by this contract.
	 * @param _owner - new owner for the domain.
     * @param _tokenId - erc721 token id which represents the node (domain).
	 */
    function transferDomainOwnership(address _owner, uint256 _tokenId) public onlyOwner {
        base.transferFrom(address(this), _owner, _tokenId);
        emit DomainTransferred(_owner, _tokenId);
    }

     // Authorises a controller, who can register and renew domains.
    function addController(address controller) external onlyOwner {
        require(controllers[controller] == false, "The controller was already added");
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    // Revoke controller permission for an address.
    function removeController(address controller) external onlyOwner {
        require(controllers[controller] == true, "The controller is already disbled");
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

	/**
	 * @dev Allows to update to new ENS registry.
	 * @param _registry The address of new ENS registry to use.
	 */
    function updateRegistry(IENSRegistry _registry) public onlyOwner {
        require(registry != _registry, "New registry should be different from old");
        require(address(_registry).isContract(), "New registry should be a contract");

        emit RegistryUpdated(registry, _registry);

        registry = _registry;
    }

    /**
	 * @dev Allows to update to new ENS base registrar.
	 * @param _base The address of new ENS base registrar to use.
	 */
    function updateBase(IBaseRegistrar _base) public onlyOwner {
        require(base != _base, "New base should be different from old");
        require(address(_base).isContract(), "New base should be a contract");

        emit BaseUpdated(base, _base);

        base = _base;
    }

    function migrationFinished() external onlyOwner isMigrating {
        migrated = true;
        emit MigrationFinished();
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

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            mstore(add(0x20, out), _x)
        }

        return out;
    }
}