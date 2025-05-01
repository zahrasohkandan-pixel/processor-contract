// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Erc20Token
/// @author ATLOS
/// @notice simulates an ERC20 token with a fixed supply and decimals
contract Erc20Token is ERC20 {
    uint8 public _decimals;

    constructor(string memory name, string memory ticker, uint256 supply, uint8 __decimals) ERC20(name, ticker) {
        _decimals = __decimals;
        _mint(msg.sender, supply * 10**_decimals);
    }

     function decimals() public view override returns (uint8) {
        return _decimals;
    }
}