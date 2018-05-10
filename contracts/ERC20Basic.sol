pragma solidity ^0.4.21;

/// @title Basic Ethereum ERC20 Token standard
/// @author https://github.com/OpenZeppelin/
/// @dev Simpler version of ERC20 interface
/// see https://github.com/ethereum/EIPs/issues/179
contract ERC20Basic {
    /// @notice Returns the name of the token - e.g. "Cacao".
    /// @dev This method can be used to improve usability, but interfaces and other contracts MUST NOT expect these values to be present.
    function name() public view returns (string _name);

    /// @notice Returns the symbol of the token. E.g. "CAO".
    /// @dev This method can be used to improve usability, but interfaces and other contracts MUST NOT expect these values to be present.
    function symbol() public view returns (string _symbol);

    /// @notice Returns the number of decimals the token uses - e.g. 3, means to divide the token amount by 1000 to get its user representation.
    /// @dev This method can be used to improve usability, but interfaces and other contracts MUST NOT expect these values to be present.
    function decimals() public view returns (uint8 _decimals);

    /// @notice Returns the total token supply.
    function totalSupply() public view returns (uint256 _totalSupply);
    
    /// @param _owner The address from which the balance will be retrieved
    /// @return The balance
    function balanceOf(address _owner) public view returns (uint256 balance);

    /// @notice Transfers `_value` amount of tokens to address `_to` from `msg.sender`, and will fire the Transfer event.
    /// @dev The function will throw if the _from account balance does not have enough tokens to spend.
    /// - Transfers of 0 values will be treated as normal transfers and will fire the Transfer event.
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transfer(address _to, uint256 _value) public returns (bool success);

    /// @notice Triggers when tokens are transferred, including zero value transfers.
    /// @dev A token contract which creates new tokens SHOULD trigger a Transfer event with the _from address set to 0x0 when tokens are created.
    /// @param from The address of the sender
    /// @param to The address of the recipient
    /// @param value The amount of token to be transferred
    event Transfer(address indexed from, address indexed to, uint256 value);
}
