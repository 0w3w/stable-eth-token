pragma solidity ^0.4.21;

/// @title Controls the freezing of the Contract
/// @author 0w3w
contract Freezable {
    bool public frozen = false;

    /// @notice Modifier to make a function callable only when the contract is not frozen.
    modifier notFrozen() {
        require(!frozen);
        _;
    }

    /// @notice Called to freeze the contract, triggers Frozen event
    function freeze() public {
        require(canFreeze(msg.sender));
        frozen = true;
        emit Frozen();
    }

    /// @notice Called by the freeze function to verify if the _address can execute a freeze
    function canFreeze(address _address) internal returns (bool result);

    /// @notice Triggers when the contract is Frozen
    event Frozen();
}