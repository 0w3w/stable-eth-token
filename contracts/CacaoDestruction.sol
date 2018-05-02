pragma solidity ^0.4.21;
import "./CacaoLibrary.sol";
import "./SafeMath.sol";

/// @title Abstract contract that controls the destruction of Cacaos
/// @author 0w3w
contract CacaoDestruction {

    using CacaoLibrary for uint256;
    using SafeMath for uint256;

    // The total ammount of cacaos burned
    uint256 public cacaosBurned = 0;

    // The burned cacaos go to the "purgatory", an intermediate state in which Cacaos must first "undergo purification"
    // (a.k.a. removing them from the public bank accounts to maintain parity) before being obliterated from existence.
    uint256 public cacaosInPurgatory = 0;

    // Structure that will save whether an address is a valid creation address or not, and if the key has been revoked or not.
    struct ReferenceMetadata {
        // True if the reference is already taken
        bool isTaken;
        // True if the reference has been used
        bool isUsed;
    }

    // Stores the mapping between references and it's validity
    mapping (string => ReferenceMetadata) private _references;

    /// @notice Modifier to make a function callable only with a valid reference
    modifier validReference(string reference) {
        require(_references[reference].isTaken && !_references[reference].isUsed);
        _;
    }

    /// @notice Modifier to make a function callable only by a valid sender
    /// Who can generate references and obliterate cacaos
    modifier senderCanDestruct(){
        require(canDestruct(msg.sender));
        _;
    }

    /// @notice Will generate a reference that will allow users to burn cacao.
    function generateDestructionReference(string reference) external senderCanDestruct() {
        require(!_references[reference].isTaken);
        _references[reference].isTaken = true;
        _references[reference].isUsed = false;
    }

    /// @notice Will destroy the _ammount of cacaos.
    /// @dev Will decrease _ammount from the msg.sender cacao balance and increase the _ammount in cacaosInPurgatory,
    /// @param _ammount The ammount of cacaos to burn.
    function burn(uint256 _ammount, string reference) public validReference(reference) {
        _references[reference].isUsed = true;
        cacaosInPurgatory = cacaosInPurgatory.add(_ammount);
        cacaosBurned = cacaosBurned.add(_ammount);
        emit Burned(msg.sender, _ammount, reference);
    }

    /// @notice Will completely obliterate the _ammount of cacaos from existence.
    /// @dev Will decrease _ammount from the cacaosInPurgatory.
    /// @param _ammount The ammount of cacaos to obliterate.
    function obliterate(uint256 _ammount) public senderCanDestruct() { 
        cacaosInPurgatory = cacaosInPurgatory.sub(_ammount);
        emit Obliterated(_ammount);
    }

    /// @notice Validates that the address can generate desctruction references
    /// @param _sender The address to validate.
    /// @return True if the address can generate desctruction references
    function canDestruct(address _sender) internal returns (bool result);

    /*
        Events
    */  

    /// @notice Is fired when an account burn cacaos.
    /// @param _ammount The ammount of burned cacaos.
    event Burned(address indexed _account, uint256 _ammount, string reference);

    /// @notice Is fired when cacaos are obliterated.
    /// @param _ammount The ammount of obliterated cacaos.
    event Obliterated(uint256 _ammount);
}
