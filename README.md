# Avatars Name Contract

## Storage

```solidity
contract ERC20Interface {
    function balanceOf(address from) public view returns (uint256);
    function transferFrom(address from, address to, uint tokens) public returns (bool);
    function allowance(address owner, address spender) public view returns (uint256);
    function burn(uint256 amount) public;
}

contract AvatarNameStorage {
    ERC20Interface public manaToken;
    uint256 public blocksUntilReveal;
    uint256 public price = 100000000000000000000; // 100 in wei

    struct Data {
        string username;
        string metadata;
    }
    struct Commit {
        bytes32 commit;
        uint256 blockNumber;
        bool revealed;
    }

    // Stores commit messages by accounts
    mapping (address => Commit) public commit;
    // Stores usernames used
    mapping (string => address) usernames;
    // Stores account data
    mapping (address => Data) public user;
    // Stores account roles
    mapping (address => bool) public allowed;

    event Register(
        address indexed _owner,
        string _username,
        string _metadata,
        address indexed _caller
    );
    event MetadataChanged(address indexed _owner, string _metadata);
    event Allow(address indexed _caller, address indexed _account, bool _allowed);
    event CommitUsername(address indexed _owner, bytes32 indexed _hash, uint256 _blockNumber);
    event RevealUsername(address indexed _owner, bytes32 indexed _hash, uint256 _blockNumber);
}
```

## Implementation

```solidity
contract AvatarNameRegistry is Initializable, AvatarNameStorage {

     /**
    * @dev Initializer of the contract
    * @param _mana - address of the mana token
    * @param _register - address of the user allowed to register usernames and assign the role
    * @param _blocksUntilReveal - uint256 for the blocks that should pass before reveal a commit
    */
    function initialize(
        ERC20Interface _mana,
        address _register,
        uint256 _blocksUntilReveal
    )
    public initializer

    /**
    * @dev Check if the sender is an allowed account
    */
    modifier onlyAllowed();

    /**
    * @dev Manage role for an account
    * @param _account - address of the account to be managed
    * @param _allowed - bool whether the account should be allowed or not
    */
    function setAllowed(address _account, bool _allowed) external onlyAllowed;

    /**
    * @dev Register a usename
    * @notice that the username should be less than or equal 32 bytes and blanks are not allowed
    * @param _beneficiary - address of the account to be managed
    * @param _username - string for the username
    * @param _metadata - string for the metadata
    */
    function _registerUsername(
        address _beneficiary,
        string memory _username,
        string memory _metadata
    )
    internal;

    /**
    * @dev Register a usename
    * @notice that the username can only be registered by an allowed account
    * @param _beneficiary - address of the account to be managed
    * @param _username - string for the username
    * @param _metadata - string for the metadata
    */
    function registerUsername(
        address _beneficiary,
        string calldata _username,
        string calldata _metadata
    )
    external
    onlyAllowed;

    /**
    * @dev Commit a hash for a desire username
    * @notice that the reveal should happen after the blocks defined on {blocksUntilReveal}
    * @param _hash - bytes32 of the commit hash
    */
    function commitUsername(bytes32 _hash) public;

   /**
    * @dev Reveal a commit
    * @notice that the reveal should happen after the blocks defined on {blocksUntilReveal}
    * @param _username - string for the username
    * @param _metadata - string for the metadata
    * @param _salt - bytes32 for the salt
    */
    function revealUsername(
        string memory _username,
        string memory _metadata,
        bytes32 _salt
    )
    public;

    /**
    * @dev Return a bytes32 hash for the given arguments
    * @param _username - string for the username
    * @param _metadata - string for the metadata
    * @param _salt - bytes32 for the salt
    * @return bytes32 - for the hash of the given arguments
    */
    function getHash(
        string memory _username,
        string memory _metadata,
        bytes32 _salt
    )
    public
    view
    returns (bytes32);

    /**
    * @dev Set metadata for an existing user
    * @param _metadata - string for the metadata
    */
    function setMetadata(string calldata _metadata) external;

    /**
    * @dev Check whether a user exist or not
    * @param _user - address for the user
    * @return bool - whether the user exist or not
    */
    function userExists(address _user) public view returns (bool);

    /**
    * @dev Check whether a username is available or not
    * @param _username - string for the username
    * @return bool - whether the username is available or not
    */
    function isUsernameAvailable(string memory _username) public view returns (bool);

    /**
    * @dev Validate a username
    * @param _username - string for the username
    */
    function _requireUsernameValid(string memory _username) internal pure;

    /**
    * @dev Validate if a user has balance and the contract has enough allowance
    * to use user MANA on his belhalf
    * @param _user - address of the user
    */
    function _requireBalance(address _user) internal view;

}
```
