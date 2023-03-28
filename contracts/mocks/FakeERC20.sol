pragma solidity ^0.5.15;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @dev Contract used to test custom ERC20 behavior.
 */
contract FakeERC20 is IERC20 {
    function transferFrom(
        address, // sender
        address, // recipient
        uint256 // amount
    ) external returns (bool) {
        return false;
    }

    function totalSupply() external view returns (uint256) {
        return 0;
    }

    function balanceOf(
        address // account
    ) external view returns (uint256) {
        return uint256(-1); // MAX UINT256
    }

    function transfer(
        address, // recipient,
        uint256 // amount
    ) external returns (bool) {
        return false;
    }

    function allowance(
        address, // owner,
        address // spender
    ) external view returns (uint256) {
        return uint256(-1); // MAX UINT256
    }

    function approve(
        address, // spender,
        uint256 // amount
    ) external returns (bool) {
        return false;
    }
}
