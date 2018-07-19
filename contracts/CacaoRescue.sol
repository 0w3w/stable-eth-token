pragma solidity ^0.4.21;
import "./SafeMath.sol";

/// @title Controls the rescue of lost Cacaos
/// @notice Cacaos are considered lost after 5 years of no account movement
/// which in solidity translates to no interaction with the contract after N blocks.
/// Where N is calculated with an AVG of 6000 blocks per day ~= 2,190,000 year ~= 10,950,000 five years
/// @author Guillermo Hernandez (0w3w)
contract CacaoRescue {
    using SafeMath for uint256;

    // Cacaos are considered lost after N years of no account movement, which translates to a block threshold from last transaction
    uint256 public blockThreshold = 10950000;

    // The total amount of cacaos rescued
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

    /// @notice Gets the block number
    function getBlockNumber() internal view returns (uint256 _blockNumber){
        return block.number;
    }

    /// @notice Will log the blocknumber of the transaction
    function registerTransaction(address _address, uint256 _blockNumber) internal {
        _lastMovements[_address] = _blockNumber;
    }

    /// @notice Will log the blocknumber of the transaction
    /// Use this to send a keep alive signal and prevent the cacao address to be rescued.
    function registerTransaction() public {
        registerTransaction(msg.sender, getBlockNumber());
    }

    /// @notice Will rescue lost Cacaos
    /// @param _address The address to rescue Cacaos from.
    function rescue(address _address) external senderCanRescue() {
        uint256 blockNumber = getBlockNumber();
        require(blockThreshold <= blockNumber);
        uint256 transactionBlockThreshold = blockNumber.sub(blockThreshold);
        require(_lastMovements[_address] <= transactionBlockThreshold);
        uint256 amountRescued = onRescue(_address);
        cacaosRescued = cacaosRescued.add(amountRescued);
        cacaosInHell = cacaosInHell.add(amountRescued);
        emit Rescued(_address, amountRescued);
    }

    /// @notice Will completely obliterate the _amount of cacaos from existence.
    /// @dev Will decrease _amount from the cacaosInHell.
    /// @param _amount The amount of cacaos to obliterate.
    function obliterateRescuedCacaos(uint256 _amount) public senderCanRescue() {
        require(_amount <= cacaosInHell);
        cacaosInHell = cacaosInHell.sub(_amount);
        onObliterateRescued(_amount);
    }

    /// @notice Execute the rescue of cacaos
    /// @dev Abstract Method
    /// @param _address The address to rescue Cacaos from.
    function onRescue(address _address) internal returns (uint256 amount);

    /// @notice Execute the obliteration of cacaos
    /// @dev Abstract Method
    /// @param _amount The amount of obliterated cacaos.
    function onObliterateRescued(uint256 _amount) internal;

    /// @notice Validates that the address can rescue Cacaos.
    /// @dev Abstract Method
    /// @param _address The address to validate.
    /// @return True if the address can rescue Cacaos.
    function canRescue(address _address) internal returns (bool result);

    /// @notice Is fired when cacaos are rescued from accounts with no movement.
    /// @param _account The _account where the cacaos were rescued from.
    /// @param _amount The amount of rescued cacaos.
    event Rescued(address indexed _account, uint256 _amount);
}