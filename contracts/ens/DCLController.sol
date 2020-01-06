
pragma solidity ^0.5.15;

import "../interfaces/IENSRegistry.sol";
import "../interfaces/IDCLRegistrar.sol";
import "../interfaces/IERC20Token.sol";

contract DCLController {
    IERC20Token public acceptedToken;
    IENSRegistry public registry;
    IDCLRegistrar public registrar;

    uint256 public price = 100000000000000000000; // 100 in wei

    event NameBought(address indexed _caller, address indexed _beneficiary, uint256 _price, string _name);

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

    function register(string memory _name, address _beneficiary) public {
        // Check for valid beneficiary
        require(_beneficiary != address(0), "Invalid beneficiary");
        _requireNameValid(_name);
        // Check if the sender has at least `price` and the contract has allowance to use on its behalf
        _requireBalance(msg.sender);
        // Register the name
        registrar.register(_name, _beneficiary);
        // Debit `price` from sender
        acceptedToken.transferFrom(msg.sender, address(this), price);
        // Burn it
        acceptedToken.burn(price);
        // Log
        emit NameBought(msg.sender,  _beneficiary, price, _name);
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

    /**
    * @dev Validate a bane
    * @param _name - string for the name
    */
    function _requireNameValid(string memory _name) internal pure {
        bytes memory tempName = bytes(_name);
        require(tempName.length <= 15, "Name should be less than or equal 15 characters");
        for(uint256 i = 0; i < tempName.length; i++) {
            require(tempName[i] > 0x20, "Invalid Character");
        }
    }

}