pragma solidity ^0.5.0;

import "zos-lib/contracts/Initializable.sol";
import "./AvatarsStorage.sol";


contract UsernameRegistry is Initializable, AvatarsStorage {

    /**
    * @dev Initializer of the contract
    * @param _mana - address of the mana token
    * @param _register - address of the user allowed to register usernames and assign the role
    * @param _blocksUntilReveal - uint256 for the blocks that should pass before reveal a commit
    */
    function initialize(ERC20Interface _mana, address _register, uint256 _blocksUntilReveal) public initializer {
        require(_blocksUntilReveal != 0, "Blocks until reveal should be greather than 0");


        manaToken = _mana;
        blocksUntilReveal = _blocksUntilReveal;
        price = 100000000000000000000; // 100 in wei

        // Allow deployer to register usernames
        allowed[_register] = true;
    }

    /**
    * @dev Check if the sender is an allowed account
    */
    modifier onlyAllowed() {
        require(
            allowed[msg.sender] == true,
            "The sender is not allowed to register a username"
        );
        _;
    }

    /**
    * @dev Manage role for an account
    * @param _account - address of the account to be managed
    * @param _allowed - bool whether the account should be allowed or not
    */
    function setAllowed(address _account, bool _allowed) external onlyAllowed {
        require(_account != msg.sender, "You can not manage your role");
        allowed[_account] = _allowed;
        emit Allow(msg.sender, _account, _allowed);
    }

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
    internal
    {
        _requireBalance(_beneficiary);
        _requireUsernameValid(_username);
        require(isUsernameAvailable(_username), "The username was already taken");

        manaToken.transferFrom(_beneficiary, address(this), price);
        manaToken.burn(price);

        // Save username
        usernames[_username] = _beneficiary;

        Data storage data = user[_beneficiary];

        // Free previous username
        delete usernames[data.username];

        // Set data
        data.username = _username;

        bytes memory metadata = bytes(_metadata);
        if (metadata.length > 0) {
            data.metadata = _metadata;
        }

        emit Register(
            _beneficiary,
            _username,
            data.metadata,
            msg.sender
        );
    }

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
    onlyAllowed
    {
        _registerUsername(_beneficiary, _username, _metadata);
    }

    /**
    * @dev Commit a hash for a desire username
    * @notice that the reveal should happen after the blocks defined on {blocksUntilReveal}
    * @param _hash - bytes32 of the commit hash
    */
    function commitUsername(bytes32 _hash) public {
        commit[msg.sender].commit = _hash;
        commit[msg.sender].blockNumber = block.number;
        commit[msg.sender].revealed = false;

        emit CommitUsername(msg.sender, _hash, block.number);
    }

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
    public
    {
        Commit storage userCommit = commit[msg.sender];

        require(userCommit.commit != 0, "User has not a commit to be revealed");
        require(userCommit.revealed == false, "Commit was already revealed");
        require(
            getHash(_username, _metadata, _salt) == userCommit.commit,
            "Revealed hash does not match commit"
        );
        require(
            block.number > userCommit.blockNumber + blocksUntilReveal,
            "Reveal can not be done before blocks passed"
        );

        userCommit.revealed = true;

        emit RevealUsername(msg.sender, userCommit.commit, block.number);

        _registerUsername(msg.sender, _username, _metadata);
    }

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
    returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(address(this), msg.sender, _username, _metadata, _salt)
        );
    }

    /**
    * @dev Set metadata for an existing user
    * @param _metadata - string for the metadata
    */
    function setMetadata(string calldata _metadata) external {
        require(userExists(msg.sender), "The user does not exist");

        user[msg.sender].metadata = _metadata;
        emit MetadataChanged(msg.sender, _metadata);
    }

    /**
    * @dev Check whether a user exist or not
    * @param _user - address for the user
    * @return bool - whether the user exist or not
    */
    function userExists(address _user) public view returns (bool) {
        Data memory data = user[_user];
        bytes memory username = bytes(data.username);
        return username.length > 0;
    }

    /**
    * @dev Check whether a username is available or not
    * @param _username - string for the username
    * @return bool - whether the username is available or not
    */
    function isUsernameAvailable(string memory _username) public view returns (bool) {
        return usernames[_username] == address(0);
    }

    /**
    * @dev Validate a username
    * @param _username - string for the username
    */
    function _requireUsernameValid(string memory _username) internal pure {
        bytes memory tempUsername = bytes(_username);
        require(tempUsername.length <= 32, "Username should be less than or equal 32 characters");
        for(uint256 i = 0; i < tempUsername.length; i++) {
            require(tempUsername[i] != " ", "No blanks are allowed");
        }
    }

    /**
    * @dev Validate if a user has balance and the contract has enough allowance
    * to use user MANA on his belhalf
    * @param _user - address of the user
    */
    function _requireBalance(address _user) internal view {
        require(
            manaToken.balanceOf(_user) >= price,
            "Insufficient funds"
        );
        require(
            manaToken.allowance(_user, address(this)) >= price,
            "The contract is not authorized to use MANA on sender behalf"
        );
    }
}