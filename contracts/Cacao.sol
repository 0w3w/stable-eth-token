pragma solidity ^0.4.21;
import "./CacaoLibrary.sol" as CacaoLibraryImport;
import "./StandardToken.sol";
import "./CacaoKeyRing.sol";
import "./CacaoCreation.sol";
import "./CacaoDistribution.sol";
import "./CacaoDestruction.sol";
import "./CacaoRescue.sol";
import "./Freezable.sol";

/// @title Cacao Contract
/// @author 0w3w
contract Cacao is StandardToken, CacaoKeyRing, CacaoCreation, CacaoDistribution, CacaoDestruction, CacaoRescue, Freezable {

    using CacaoLibraryImport.CacaoLibrary for uint256;

    function Cacao() public {
        _symbol = "CAO";
        _name = "Cacao";
        _decimals = 3;
        _totalSupply = 0;
    }

    /// @notice The fallback funtion is disabled.
    function() public {
        revert();
    }

    /*
        StandardToken
    */

    function transfer(address _to, uint256 _value) public notFrozen returns (bool) {
      _value.requireValidAmmount();
      return super.transfer(_to, _value);
    }   
    function transferFrom(address _from, address _to, uint256 _value) public notFrozen returns (bool) {
      _value.requireValidAmmount();
      return super.transferFrom(_from, _to, _value);
    }   
    function approve(address _spender, uint256 _value) public notFrozen returns (bool) {
      _value.requireValidAmmount();
      return super.approve(_spender, _value);
    }   
    function increaseApproval(address _spender, uint256 _addedValue) public notFrozen returns (bool success) {
      _addedValue.requireValidAmmount();
      return super.increaseApproval(_spender, _addedValue);
    }   
    function decreaseApproval(address _spender, uint256 _subtractedValue) public notFrozen returns (bool success) {
      _subtractedValue.requireValidAmmount();
      return super.decreaseApproval(_spender, _subtractedValue);
    }

    /*
        CacaoCreation
    */

    function IsValidCreationAddress(address _address) internal notFrozen returns (bool _isValid) {
        return isCreator(_address);
    }

    /*
        Freezable
    */

    function canFreeze(address _address) internal returns (bool result) {
        return isDistributor(_address);
    }

    /*
        CacaoDestruction
    */

    function burn(uint256 _ammount, string reference) public notFrozen {
        require(_ammount > 0);
        uint256 fromBalance = balances[msg.sender];
        require(fromBalance >= _ammount);
        balances[msg.sender] -= _ammount;
        emit Transfer(msg.sender, address(0), _ammount);
        super.burn(_ammount, reference);
    }
    
    function obliterate(uint256 _ammount) onlyDistributor() public notFrozen {
        super.obliterate(_ammount);
    }

    function canGenerateDestructionReference(address _sender) internal notFrozen returns (bool result){
        return isDistributor(_sender);
    }

    /*
        Other
    */

    /// @notice Enable withdrawal of other tokens (by airdrop, forks maybe?)
    /// @param _tokenContract The token contract address to withdraw tokens from.
    /// @param _to The address of the recipient
     function withdrawExternalTokens(address _tokenContract, address _to) public onlyCreator() returns (bool) {
         ERC20Basic token = ERC20Basic(_tokenContract);
         uint256 amount = token.balanceOf(address(this));
         return token.transfer(_to, amount);
     }

    /// @notice Enable withdrawal of any Ether randomly assigned to this account (by mining, forks maybe?)
    /// @param _to The address of the recipient
     function withdrawEther(address _to) public onlyCreator() {
        _to.transfer(address(this).balance);
     }
}