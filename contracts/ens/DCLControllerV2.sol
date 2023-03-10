
pragma solidity ^0.5.15;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";

import "../interfaces/IENSRegistry.sol";
import "../interfaces/IDCLRegistrar.sol";
import "../interfaces/IERC20Token.sol";

contract DCLControllerV2 is Ownable {
    using Address for address;

    // Price of each name
    uint256 constant public PRICE = 100 ether;

    // Accepted ERC20 token
    IERC20Token public acceptedToken;
    // DCL Registrar
    IDCLRegistrar public registrar;

    // Price of each name
    uint256 public maxGasPrice = 20000000000; // 20 gwei

    // Emitted when a name is bought
    event NameBought(address indexed _caller, address indexed _beneficiary, uint256 _price, string _name);

    // Emitted when the max gas price is changed
    event MaxGasPriceChanged(uint256 indexed _oldMaxGasPrice, uint256 indexed _newMaxGasPrice);

    /**
	 * @dev Constructor of the contract
     * @param _acceptedToken - address of the accepted token
     * @param _registrar - address of the DCL registrar contract
	 */
    constructor(IERC20Token _acceptedToken, IDCLRegistrar _registrar) public {
        require(address(_acceptedToken).isContract(), "Accepted token should be a contract");
        require(address(_registrar).isContract(), "Registrar should be a contract");

        // Accepted token
        acceptedToken = _acceptedToken;
        // DCL registrar
        registrar = _registrar;
    }

    /**
	 * @dev Register a name
     * @param _name - name to be registered
	 * @param _beneficiary - owner of the name
	 */
    function register(string memory _name, address _beneficiary) public {
        // Check gas price
        require(tx.gasprice <= maxGasPrice, "Maximum gas price allowed exceeded");
        // Check for valid beneficiary
        require(_beneficiary != address(0), "Invalid beneficiary");

        // Check if the name is valid
        _requireNameValid(_name);
        // Check if the sender has at least `price` and the contract has allowance to use on its behalf
        _requireBalance(msg.sender);

        // Register the name
        registrar.register(_name, _beneficiary);
        // Debit `price` from sender
        acceptedToken.transferFrom(msg.sender, address(this), PRICE);
        // Burn it
        acceptedToken.burn(PRICE);
        // Log
        emit NameBought(msg.sender, _beneficiary, PRICE, _name);
    }

    /**
     * @dev Update max gas price
     * @param _maxGasPrice - new max gas price to be used
     */
    function updateMaxGasPrice(uint256 _maxGasPrice) external onlyOwner {
        require(_maxGasPrice != maxGasPrice, "Max gas price should be different");
        require(
            _maxGasPrice >= 1000000000,
            "Max gas price should be greater than or equal to 1 gwei"
        );

        emit MaxGasPriceChanged(maxGasPrice, _maxGasPrice);

        maxGasPrice = _maxGasPrice;
    }

    /**
     * @dev Validate if a user has balance and the contract has enough allowance
     * to use user's accepted token on his belhalf
     * @param _user - address of the user
     */
    function _requireBalance(address _user) internal view {
        require(
            acceptedToken.balanceOf(_user) >= PRICE,
            "Insufficient funds"
        );
        require(
            acceptedToken.allowance(_user, address(this)) >= PRICE,
            "The contract is not authorized to use the accepted token on sender behalf"
        );
    }

    /**
    * @dev Validate a nane
    * @notice that only a-z is allowed
    * @param _name - string for the name
    */
    function _requireNameValid(string memory _name) internal pure {
        bytes memory tempName = bytes(_name);
        require(
            tempName.length >= 2 && tempName.length <= 15,
            "Name should be greather than or equal to 2 and less than or equal to 15"
        );
        for(uint256 i = 0; i < tempName.length; i++) {
            require(_isLetter(tempName[i]) || _isNumber(tempName[i]), "Invalid Character");
        }
    }

    function _isLetter(bytes1 _char) internal pure returns (bool) {
        return (_char >= 0x41 && _char <= 0x5A) || (_char >= 0x61 && _char <= 0x7A);
    }

    function _isNumber(bytes1 _char) internal pure returns (bool) {
        return (_char >= 0x30 && _char <= 0x39);
    }

}