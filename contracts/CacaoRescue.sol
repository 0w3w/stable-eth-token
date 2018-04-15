pragma solidity ^0.4.21;

/// @title Controls the rescue of lost Cacaos
/// @notice Cacaos are considered lost after 3 years of no account movement
/// which in solidity translates to no interaction with the contract after N blocks.
/// Where N is calculated with an AVG of 6000 blocks per day ~= 2,190,000 year ~= 6,570,000 three years
/// @author 0w3w
contract CacaoRescue {

    /// @notice Modifier to make a function callable only by a valid sender, who can generate references
    modifier senderCanRescueCacaos(){
        require(canGenerateDestructionReference(msg.sender));
        _;
    }

    /// @notice Will rescue lost Cacaos
    /// @dev Will move rescued cacaos to... ? TODO
    function rescueCacaos(address _address) external senderCanRescueCacaos();

    /// @notice Validates that the address can rescue Cacaos.
    /// @param _sender The address to validate.
    /// @return True if the address can rescue Cacaos.
    function canGenerateDestructionReference(address _sender) internal returns (bool result);

    /// @notice Is fired when cacaos are rescued from accounts with no movement.
    /// @param _account The _account where the cacaos were rescued from.
    /// @param _ammount The ammount of rescued cacaos.
    event Rescued(address indexed _account, uint256 _ammount);
}