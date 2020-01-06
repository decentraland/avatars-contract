
pragma solidity ^0.5.15;

contract IDCLRegistrar {
    /**
     * @dev Register a name.
     * @param _name - name to be registered.
     * @param _owner - owner of the node.
     */
    function register(string calldata _name, address _owner) external;

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