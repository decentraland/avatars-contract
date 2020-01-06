
// File: contracts/interfaces/IENSRegistry.sol

pragma solidity ^0.5.15;

/**
 * @title EnsRegistry
 * @dev Extract of the interface for ENS Registry
*/
contract IENSRegistry {
    function setOwner(bytes32 node, address owner) public;
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) public;
    function setResolver(bytes32 node, address resolver) public;
    function owner(bytes32 node) public view returns (address);
    function resolver(bytes32 node) public view returns (address);
}

// File: contracts/interfaces/IDCLRegistrar.sol

pragma solidity ^0.5.15;

contract IDCLRegistrar {
    /**
     * @dev Register a name.
     * @param _name - name to be registered.
     * @param _owner - owner of the node.
     */
    function register(string calldata _name, address _owner) external returns(uint);

    /**
     * @dev Reclaim ownership of a name in ENS, if you own it in the registrar.
     * @param _id - node id.
     * @param _owner - owner of the node.
     */
    function reclaim(uint256 _id, address _owner) external;

    /**
     * @dev Transfer a name to a new owner.
     * @param _from - current owner of the node.
     * @param _to - new owner of the node.
     * @param _id - node id.
     */
    function transferFrom(address _from, address _to, uint256 _id) public;

    // Returns true if the specified name is available for registration.
    function available(uint256 id) public view returns(bool);

}

// File: openzeppelin-eth/contracts/token/ERC20/IERC20.sol

pragma solidity ^0.5.2;

/**
 * @title ERC20 interface
 * @dev see https://eips.ethereum.org/EIPS/eip-20
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);

    function approve(address spender, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address who) external view returns (uint256);

    function allowance(address owner, address spender) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: contracts/interfaces/IERC20Token.sol

pragma solidity ^0.5.15;


contract IERC20Token is IERC20{
    function balanceOf(address from) public view returns (uint256);
    function transferFrom(address from, address to, uint tokens) public returns (bool);
    function allowance(address owner, address spender) public view returns (uint256);
    function burn(uint256 amount) public;
}

// File: contracts/ens/DCLController.sol

pragma solidity ^0.5.15;




contract DCLController {
    IERC20Token public acceptedToken;
    IENSRegistry public registry;
    IDCLRegistrar public registrar;

    uint256 public price = 100000000000000000000; // 100 in wei

    /**
	 * @dev Constructor of the contract.
     * @param _acceptedToken - address of the accepted token.
	 * @param _registry - address of the ENS registry contract.
     * @param _registrar - address of the DCL registrar contract.
	 */
    constructor(IERC20Token _acceptedToken,  IENSRegistry _registry, IDCLRegistrar _registrar) public {
        // Accepted token
        acceptedToken = _acceptedToken;
        // ENS registry
        registry = _registry;
        // DCL registrar
        registrar = _registrar;
    }

    function createName(string memory _name, address _beneficiary) public {
        // Check for valid beneficiary
        require(_beneficiary != address(0), "Invalid beneficiary");
        // Check if the sender has at least `price` and the contract has allowance to use on its behalf
        _requireBalance(msg.sender);
        // Register the name
        registrar.register(_name, _beneficiary);
        // Debit `price` from sender
        acceptedToken.transferFrom(msg.sender, address(this), price);
        // Burn it
        acceptedToken.burn(price);
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
