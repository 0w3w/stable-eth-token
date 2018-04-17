pragma solidity ^0.4.21;
import "../CacaoCreation.sol";
import "../CacaoLibrary.sol";
import "../SafeMath.sol";

/// @title Mock contract to test CacaoCreation contract
/// @author 0w3w
contract CacaoCreationTest is CacaoCreation {
    using CacaoLibrary for uint256;
    using SafeMath for uint256;
    
    bool private _isValidCreator = false;

    /*
        Implement Interface
    */

    function isValidCreationAddress(address _address) internal returns (bool _isValid) {
        if( _address == address(0)) {
            return _isValidCreator; // Something stupid for the sake of removing the warning.
        }
        return _isValidCreator;
    }

    /*
        Change Mock State
    */

    function setMockState(bool isValidCreator) external {
        _isValidCreator = isValidCreator;
    }
}