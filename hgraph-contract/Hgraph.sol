// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts@4.9.6/token/ERC20/extensions/ERC1363.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts@4.9.6/access/Ownable.sol";

contract HGRAPH is ERC1363, ERC20Burnable, ERC20Pausable, ERC20Permit, Ownable {
    constructor() ERC20("HGRAPH", "HGRAPH") ERC20Permit("HGRAPH") Ownable(msg.sender) {
        _mint(msg.sender, 10000 * 10 ** decimals());
    }
    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}