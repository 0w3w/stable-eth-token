pragma solidity ^0.4.21;
import "./ERC20Basic.sol";

/// @title ERC20 Ethereum Token standard
/// @author OpenZeppelin https://github.com/OpenZeppelin/
/// @dev https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
contract ERC20 is ERC20Basic {
    /// @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool _success);

    /// @notice `msg.sender` approves `_spender` to spend `_value` tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _value The amount of tokens to be approved for transfer
    /// @return Whether the approval was successful or not
    function approve(address _spender, uint256 _value) public returns (bool _success);

    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens allowed to spent
    function allowance(address _owner, address _spender) public view returns (uint256 _remaining);

    /// @notice Triggers on any successful call to approve(address _spender, uint256 _value).
    /// @param owner The address of the account owning tokens
    /// @param spender The address of the account able to transfer the tokens
    /// @param value The amount of approved tokens
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
