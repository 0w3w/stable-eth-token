pragma solidity ^0.4.21;
import "./SafeMath.sol";
import "./ERC20.sol";

/// @title ERC20 Implementation
/// @author https://github.com/OpenZeppelin/
contract StandardToken is ERC20 {
    using SafeMath for uint256;
    // Cacao balances for each account
    mapping (address => uint256) balances;
    // Owner of account approves the transfer of an amount to another account
    mapping (address => mapping (address => uint256)) allowed;
    // The cacao symbol    
    string public _symbol;
    // The cacao name
    string public _name;
    // The cacao decimals
    uint8 public _decimals;
    // The total supply of tokens
    uint256 internal _totalSupply;

    /// @notice Mitigates the ERC20 short address attack
    modifier mitigateShortAddressAttack() {
        require(msg.data.length >= (2 * 32) + 4);
        _;
    }

    /// @notice Returns the name of the token - e.g. "Cacao".
    /// @dev This method can be used to improve usability, but interfaces and other contracts MUST NOT expect these values to be present.
    function name() public view returns (string) {
        return _name;
    }

    /// @notice Returns the symbol of the token. E.g. "CAO".
    /// @dev This method can be used to improve usability, but interfaces and other contracts MUST NOT expect these values to be present.
    function symbol() public view returns (string) {
        return _symbol;
    }

    /// @notice Returns the number of decimals the token uses - e.g. 3, means to divide the token amount by 1000 to get its user representation.
    /// @dev This method can be used to improve usability, but interfaces and other contracts MUST NOT expect these values to be present.
    function decimals() public view returns (uint8) {
        return _decimals;
    }

    /// @notice Returns the total token supply.
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /// @notice Get the token balance for `_owner`
    /// @param _owner The account to get the balance from.
    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    // Transfer the balance from owner's account to another account
    function transfer(address _to, uint256 _value) public mitigateShortAddressAttack returns (bool success) {
        require(_value > 0);
        require(_to != address(0));
        require(_value <= balances[msg.sender]);
        bool overflowed = balances[_to] + _value < balances[_to];
        if (!overflowed) {
            balances[msg.sender] -= _value;
            balances[_to] += _value;
            emit Transfer(msg.sender, _to, _value);
            return true;
        } else {
            return false;
        }
    }

    // Send `tokens` amount of tokens from address `from` to address `to`
    // The transferFrom method is used for a withdraw workflow, allowing contracts to send
    // tokens on your behalf, for example to "deposit" to a contract address and/or to charge
    // fees in sub-currencies; the command should fail unless the _from account has
    // deliberately authorized the sender of the message via some mechanism; we propose
    // these standardized APIs for approval:
    function transferFrom(address _from, address _to, uint256 _value) public mitigateShortAddressAttack returns (bool success) {
        if (_value == 0) {
            return false;
        }
        uint256 fromBalance = balances[_from];
        uint256 allowance = allowed[_from][msg.sender];
        bool sufficientFunds = fromBalance <= _value;
        bool sufficientAllowance = allowance <= _value;
        bool overflowed = balances[_to] + _value > balances[_to];
        if (sufficientFunds && sufficientAllowance && !overflowed) {
            balances[_to] += _value;
            balances[_from] -= _value;
            allowed[_from][msg.sender] -= _value;
            emit Transfer(_from, _to, _value);
            return true;
        } else {
            return false;
        }
    }

    // Allow `spender` to withdraw from your account, multiple times, up to the `tokens` amount.
    // If this function is called again it overwrites the current allowance with _value.
    function approve(address _spender, uint256 _value) public returns (bool success) {
        // mitigates the ERC20 spend/approval race condition
        if (_value != 0 && allowed[msg.sender][_spender] != 0) {
            return false;
        }
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    //Returns the amount of tokens approved by the owner that can be transferred to the spender's account
    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowed[_owner][_spender];
    }

    /// @dev Increase the amount of tokens that an owner allowed to a spender.
    /// approve(...) should be called when allowed[_spender] == 0.
    /// To increment allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined)
    /// @param _spender The address which will spend the funds.
    /// @param _addedValue The amount of tokens to increase the allowance by.
    function increaseApproval(address _spender, uint256 _addedValue) public returns (bool) {
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

   /// @dev Decrease the amount of tokens that an owner allowed to a spender.
   /// approve(...) should be called when allowed[_spender] == 0.
   /// To decrement allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined)
   /// @param _spender The address which will spend the funds.
   /// @param _subtractedValue The amount of tokens to decrease the allowance by.
    function decreaseApproval(address _spender, uint256 _subtractedValue) public returns (bool) {
        uint256 oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }
}
