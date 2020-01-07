pragma solidity ^0.5.15;

import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";

contract IERC20Token is IERC20{
    function balanceOf(address from) public view returns (uint256);
    function transferFrom(address from, address to, uint tokens) public returns (bool);
    function allowance(address owner, address spender) public view returns (uint256);
    function burn(uint256 amount) public;
}