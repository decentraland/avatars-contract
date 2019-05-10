pragma solidity ^0.5.0;

contract ERC20Interface {
    function balanceOf(address from) public view returns (uint256);
    function transferFrom(address from, address to, uint tokens) public returns (bool);
    function allowance(address owner, address spender) public view returns (uint256);
    function burn(uint256 amount) public;
}


contract UsernameRegistry {

    event Register(
        address indexed _owner,
        string _userId,
        string _username,
        string _metadata,
        address indexed _caller
    );
    event MetadataChanged(address indexed _owner, string _metadata);
    event Allow(address indexed _caller, address indexed _account, bool _allowed);


    ERC20Interface public manaToken;
    uint256 public price = 100000000000000000000;
    struct Data {
        string userId;
        string username;
        string metadata;
    }
    mapping (string => address) usernames;
    mapping (address => Data) public user;
    mapping (address => bool) public allowed;


    constructor(ERC20Interface _mana) public {
        manaToken = _mana;
        // Allow sender to register usernames
        allowed[msg.sender] = true;
    }

    modifier onlyAllowed() {
        require(
            allowed[msg.sender] == true,
            "The sender is not allowed to register a username"
        );
        _;
    }

    function setAllowance(address _account, bool _allowed) external onlyAllowed {
        require(_account != msg.sender, "You can not manage your role");
        allowed[_account] = _allowed;
        emit Allow(msg.sender, _account, _allowed);
    }

    function registerUsername(
        address _beneficiary,
        string calldata _userId,
        string calldata _username,
        string calldata _metadata
    ) external onlyAllowed {
        _requireBalance(_beneficiary);
        require(isUsernameAvailable(_username), "The username was already taken");

        manaToken.transferFrom(_beneficiary, address(this), price);
        manaToken.burn(price);

        usernames[_username] = _beneficiary;
        Data memory data = Data(
            _userId,
            _username,
            _metadata
        );
        user[_beneficiary] = data;

        emit Register(
            _beneficiary,
            _userId,
            _username,
            _metadata,
            msg.sender
        );
    }

    function setMetadata(string calldata _metadata) external {
        require(userExists(msg.sender), "The user not exist");

        user[msg.sender].metadata = _metadata;
        emit MetadataChanged(msg.sender, _metadata);
    }

    function userExists(address _user) public view returns (bool) {
        Data memory data = user[_user];
        bytes memory username = bytes(data.username);
        return username.length > 0;
    }

    function isUsernameAvailable(string memory _username) public view returns (bool) {
        bytes memory tempUsername = bytes(_username);
        require(tempUsername.length <= 32, "Username should be less than 32 characters");
        return usernames[_username] == address(0);
    }

    function _requireBalance(address _account) internal view {
        require(
            manaToken.balanceOf(_account) >= price,
            "Insufficient funds"
        );
        require(
            manaToken.allowance(_account, address(this)) >= price,
            "The contract is not authorized to use MANA on sender behalf"
        );
    }
}