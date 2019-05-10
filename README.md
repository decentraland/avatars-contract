# Decentraland Burner Contract

```solidity
pragma solidity ^0.5.0;

interface ERC20 {
    function burn(uint256 amount) external;
    function balanceOf(address who) external view returns (uint256);
}

contract DecentralandBurner is Ownable {
    ERC20 public mana;
    event Executed(address indexed _target, bytes _data);

    /**
    * @dev Constructor of the contract.
    * @param _mana - address for the mana contract.
    */
    constructor(address _mana) public;

    /**
    * @dev Execute a target function with value and data.
    * @notice This function can be only called by the owner of the contract.
    * The msg.sender of the call will be this contract address.
    * The msg.data will be whatever it is on _data parameter.
    * _data should start with 4 bytes related to a function selector 0x12345678....
    * If you send ETH to this method, it will be redirected to the target.
    * @param _target - address for the target contract.
    * @param _data - bytes for the msg.data.
    * @return response - bytes for the call response.
    */
    function execute(address payable _target, bytes calldata _data)
    external
    payable
    onlyOwner
    returns (bytes memory);

    /**
    * @dev Burn MANA owned by this contract
    */
    function burn() external;

    /**
    * @dev Check whether a contract is owned by this contract.
    * @notice If the _target contract is not a contract or not implement
    * owner() function, the call will fail.
    * @param _target - address for the target contract.
    * @return bool whether the _target contract is owned by this contract or not.
    */
    function isContractOwner(address _target) external view returns (bool);
}
```
