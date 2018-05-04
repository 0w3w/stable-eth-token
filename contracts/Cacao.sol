pragma solidity ^0.4.21;
import "./CacaoLibrary.sol";
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
    using CacaoLibrary for uint256;

    function Cacao (
        address _creatorAddress1,
        address _creatorAddress2,
        address _creatorAddress3,
        address _creatorAddress4,
        address _distributionAddress1,
        address _distributionAddress2,
        address _distributionAddress3
    ) public {
        _symbol = "CAO";
        _name = "Cacao";
        _decimals = 3;
        _totalSupply = 0;
        initializeAddresses(
            msg.sender,
            _creatorAddress1,
            _creatorAddress2,
            _creatorAddress3,
            _creatorAddress4,
            _distributionAddress1,
            _distributionAddress2,
            _distributionAddress3
        );
    }

    /// @notice The fallback funtion is disabled.
    function() public {
        revert();
    }

    /*
        StandardToken
    */

    function totalSupply() public view returns (uint256) {
        return cacaosInLimbo + cacaosInCirculation + cacaosInPurgatory + cacaosInHell;
    }

    function transfer(address _to, uint256 _value) public notFrozen returns (bool) {
        registerTransaction();
        _value.requireValidAmmount();
        return super.transfer(_to, _value);
    }   
    function transferFrom(address _from, address _to, uint256 _value) public notFrozen returns (bool) {
        registerTransaction();
        _value.requireValidAmmount();
        return super.transferFrom(_from, _to, _value);
    }   
    function approve(address _spender, uint256 _value) public notFrozen returns (bool) {
        registerTransaction();
        _value.requireValidAmmount();
        return super.approve(_spender, _value);
    }   
    function increaseApproval(address _spender, uint256 _addedValue) public notFrozen returns (bool success) {
        registerTransaction();
        _addedValue.requireValidAmmount();
        return super.increaseApproval(_spender, _addedValue);
    }   
    function decreaseApproval(address _spender, uint256 _subtractedValue) public notFrozen returns (bool success) {
        registerTransaction();
        _subtractedValue.requireValidAmmount();
        return super.decreaseApproval(_spender, _subtractedValue);
    }

    /*
        CacaoCreation
    */

    function canCreate(address _address) internal notFrozen returns (bool _isValid) {
        return isCreator(_address);
    }

    /*
        CacaoDistribution
    */

    function canDistribute(address _address) internal returns (bool _isValid) {
        require(!isReplacingAddresses());
        return isDistributor(_address);
    }
    
    function onDistribute(address _to, uint256 _ammount) internal {
        draw(_ammount);
        balances[_to] = balances[_to].add(_ammount);
        emit Transfer(address(this), _to, _ammount);
    }
    /*
        CacaoDestruction
    */

    function canDestruct(address _sender) internal notFrozen returns (bool result) {
        require(!isReplacingAddresses());
        return isDistributor(_sender);
    }

    function onBurn(uint256 _ammount) internal notFrozen {
        require(_ammount > 0);
        uint256 fromBalance = balances[msg.sender];
        require(fromBalance >= _ammount);
        balances[msg.sender] = balances[msg.sender].sub(_ammount);
        cacaosInCirculation = cacaosInCirculation.sub(_ammount);
        emit Transfer(msg.sender, address(0), _ammount);
    }
    
    function onObliterate() internal onlyDistributor notFrozen {
    }

    /*
        CacaoRescue
    */
    
    function canRescue(address _address) internal notFrozen returns (bool result) {
        require(!isReplacingAddresses());
        return isDistributor(_address);
    }

    function onRescue(address _address) internal notFrozen returns (uint256 ammount) {
        uint256 rescuedAmmount = balances[_address];
        balances[_address] = 0;
        cacaosInCirculation = cacaosInCirculation.sub(rescuedAmmount);
        emit Transfer(_address, address(0), rescuedAmmount);
        return rescuedAmmount;
    }

    function onObliterateRescued(uint256 _ammount) internal notFrozen {
        emit Obliterated(_ammount);
    }

    /*
        Freezable
    */

    function canFreeze(address _address) internal returns (bool result) {
        return isDistributor(_address);
    }

    /*
        Other
    */

    /// @notice Enable withdrawal of other tokens (by airdrop, forks maybe?)
    /// @param _tokenContract The token contract address to withdraw tokens from.
    /// @param _to The address of the recipient
    function withdrawExternalTokens(address _tokenContract, address _to) public onlyCreator returns (bool) {
        ERC20Basic token = ERC20Basic(_tokenContract);
        uint256 amount = token.balanceOf(address(this));
        return token.transfer(_to, amount);
    }

    /// @notice Enable withdrawal of any Ether randomly assigned to this account (by mining, forks maybe?)
    /// @param _to The address of the recipient
    function withdrawEther(address _to) public onlyCreator {
        _to.transfer(address(this).balance);
    }
}