pragma solidity ^0.4.21;
import "./SafeMath.sol";

/// @title Controls the rescue of lost Cacaos
/// @notice Cacaos are considered lost after 5 years of no account movement
/// which in solidity translates to no interaction with the contract after N blocks.
/// Where N is calculated with an AVG of 6000 blocks per day ~= 2,190,000 year ~= 10,950,000 five years
/// @author 0w3w
contract CacaoRescue {
    using SafeMath for uint256;

    // Cacaos are considered lost after N years of no account movement, which translates to a block threshold from last transaction
    uint256 public blockThreshold = 10950000;
    
    // The total ammount of cacaos rescued
    uint256 public cacaosRescued = 0;

    // The rescued cacaos go to the "hell", a place in which pious people (who lost their keys) cacao's continue to exist
    // before being obliterated from existence. (a.k.a. removing them from the public bank accounts to maintain parity) 
    uint256 public cacaosInHell = 0;

    // Stores the mapping between addresses and LastTransactionMetadata
    mapping (address => uint) private _lastMovements;

    /// @notice Modifier to make a function callable only by a valid sender
    modifier senderCanRescue(){
        require(canRescue(msg.sender));
        _;
    }

    /// @notice Will log the blocknumber of the transaction
    /// Use this to send a keep alive signal and prevent the cacao address to be rescued.
    function registerTransaction() public {
        _lastMovements[msg.sender] = block.number;
    }

    /// @notice Will rescue lost Cacaos
    /// @param _address The address to rescue Cacaos from.
    function rescue(address _address) external senderCanRescue() {
        require(blockThreshold <= block.number);
        uint256 transactionBlockThreshold = block.number.sub(blockThreshold);
        require(_lastMovements[_address] <= transactionBlockThreshold);
        uint256 ammountRescued = onRescue(_address);
        cacaosRescued.add(ammountRescued);
        cacaosInHell.add(ammountRescued);
        emit Rescued(_address, ammountRescued);
    }    

    /// @notice Will completely obliterate the _ammount of cacaos from existence.
    /// @dev Will decrease _ammount from the cacaosInHell.
    /// @param _ammount The ammount of cacaos to obliterate.
    function obliterateRescuedCacaos(uint256 _ammount) public senderCanRescue() {
        require(_ammount <= cacaosInHell);
        cacaosInHell = cacaosInHell.sub(_ammount);
        onObliterateRescued(_ammount);
    }

    /// @notice Execute the rescue of cacaos
    /// @dev Abstract Method
    /// @param _address The address to rescue Cacaos from.
    function onRescue(address _address) internal returns (uint256 ammount);

    /// @notice Execute the obliteration of cacaos
    /// @dev Abstract Method
    /// @param _ammount The amount of obliterated cacaos.
    function onObliterateRescued(uint256 _ammount) internal;

    /// @notice Validates that the address can rescue Cacaos.
    /// @dev Abstract Method
    /// @param _address The address to validate.
    /// @return True if the address can rescue Cacaos.
    function canRescue(address _address) internal returns (bool result);

    /// @notice Is fired when cacaos are rescued from accounts with no movement.
    /// @param _account The _account where the cacaos were rescued from.
    /// @param _ammount The ammount of rescued cacaos.
    event Rescued(address indexed _account, uint256 _ammount);
}