pragma solidity ^0.4.21;

/// @title Controls the rescue of lost Cacaos
/// @notice Cacaos are considered lost after 3 years of no account movement
/// which in solidity translates to no interaction with the contract after N blocks.
/// Where N is calculated with an AVG of 6000 blocks per day ~= 2,190,000 year ~= 6,570,000 three years
/// @author 0w3w
contract CacaoRescue {

    /// @notice Modifier to make a function callable only by a valid sender, who can generate references
    modifier senderCanRescueCacaos(){
        require(isValidRescuerAddress(msg.sender));
        _;
    }

    /// @notice Will rescue lost Cacaos
    /// @param _address The address to rescue Cacaos from.
    function rescueCacaos(address _address) external senderCanRescueCacaos() {
        uint256 ammountRescued = onRescueCacaos(_address);
        emit Rescued(_address, ammountRescued);
    }

    /// @notice Execute the rescue of cacaos
    /// @param _address The address to rescue Cacaos from.
    function onRescueCacaos(address _address) internal returns (uint256 ammount);

    /// @notice Validates that the address can rescue Cacaos.
    /// @param _address The address to validate.
    /// @return True if the address can rescue Cacaos.
    function isValidRescuerAddress(address _address) internal returns (bool result);

    /// @notice Is fired when cacaos are rescued from accounts with no movement.
    /// @param _account The _account where the cacaos were rescued from.
    /// @param _ammount The ammount of rescued cacaos.
    event Rescued(address indexed _account, uint256 _ammount);
}