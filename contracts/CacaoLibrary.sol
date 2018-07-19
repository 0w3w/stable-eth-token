pragma solidity ^0.4.21;

/// @author Guillermo Hernandez (0w3w)
library CacaoLibrary {
    /// @notice Confirm valid operation amount, throws if value is less than 1 wei.
    function requireValidAmount(uint256 value) internal pure {
        require(value >= 1);
    }
}