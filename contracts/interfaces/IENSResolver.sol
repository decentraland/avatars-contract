
pragma solidity ^0.5.15;

/**
 * @title EnsResolver
 * @dev Extract of the interface for ENS Resolver
 */
contract IENSResolver {
     /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param node - The node to update.
     * @param addr - The address to set.
     */
    function setAddr(bytes32 node, address addr) public;

    /**
     * Returns the address associated with an ENS node.
     * @param node - The ENS node to query.
     * @return The associated address.
     */
    function addr(bytes32 node) public view returns (address);
}