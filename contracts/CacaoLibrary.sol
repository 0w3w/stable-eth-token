pragma solidity ^0.4.18;

library CacaoLibrary {
    /// @notice Confirm valid operation ammount, throws if value is less than 1 finney.
    function requireValidAmmount(uint256 value) internal pure {
        require(value >= (1 finney));
    }
}