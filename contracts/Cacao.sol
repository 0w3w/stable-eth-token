pragma solidity ^0.4.24;
import "./CacaoLibrary.sol";
import "./StandardToken.sol";
import "./CacaoKeyRing.sol";
import "./CacaoCreation.sol";
import "./CacaoDistribution.sol";
import "./CacaoDestruction.sol";
import "./CacaoRescue.sol";
import "./Freezable.sol";
import "./IVerifySignature.sol";

/// @title Moneda Cacao Contract
/// @author Guillermo Hernandez (0w3w)
contract Cacao is IVerifySignature, StandardToken, CacaoKeyRing, CacaoCreation, CacaoDistribution, CacaoDestruction, CacaoRescue, Freezable {
    using CacaoLibrary for uint256;

    constructor (
        address _creatorAddress1,
        address _creatorAddress2,
        address _creatorAddress3,
        address _creatorAddress4,
        address _distributionAddress1,
        address _distributionAddress2,
        address _distributionAddress3,
        address _delegatedFeeAddress,
        uint256 _delegatedFee
    ) CacaoKeyRing(
        msg.sender,
        _creatorAddress1,
        _creatorAddress2,
        _creatorAddress3,
        _creatorAddress4,
        _distributionAddress1,
        _distributionAddress2,
        _distributionAddress3
    ) public {
        _symbol = "CAO";
        _name = "Cacao";
        _decimals = 3;
        _totalSupply = 0;
        _delegatedTransferAddress = _delegatedFeeAddress;
        _delegatedTransferFee = _delegatedFee;
    }

    function() public {
        revert("The fallback funtion is disabled.");
    }

    /*
        StandardToken
    */

    function totalSupply() public view returns (uint256) {
        return cacaosInLimbo + cacaosInCirculation + cacaosInPurgatory + cacaosInHell;
    }

    function transfer(address _to, uint256 _value) public notFrozen returns (bool) {
        registerTransaction(msg.sender, getBlockNumber());
        if (_value != 0) {
            _value.requireValidAmount();
        }
        return super.transfer(_to, _value);
    }
    function transferFrom(address _from, address _to, uint256 _value) public notFrozen returns (bool) {
        registerTransaction(msg.sender, getBlockNumber());
        if (_value != 0) {
            _value.requireValidAmount();
        }
        return super.transferFrom(_from, _to, _value);
    }
    function approve(address _spender, uint256 _value) public notFrozen returns (bool) {
        registerTransaction(msg.sender, getBlockNumber());
        if (_value != 0) {
            _value.requireValidAmount();
        }
        return super.approve(_spender, _value);
    }
    function increaseApproval(address _spender, uint256 _addedValue) public notFrozen returns (bool success) {
        registerTransaction(msg.sender, getBlockNumber());
        if (_addedValue != 0) {
            _addedValue.requireValidAmount();
        }
        return super.increaseApproval(_spender, _addedValue);
    }
    function decreaseApproval(address _spender, uint256 _subtractedValue) public notFrozen returns (bool success) {
        registerTransaction(msg.sender, getBlockNumber());
        if (_subtractedValue != 0) {
            _subtractedValue.requireValidAmount();
        }
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

    function canDistribute(address _address) internal notFrozen returns (bool _isValid) {
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
        return isDistributor(_sender);
    }

    function onBurn(uint256 _ammount) internal notFrozen {
        require(_ammount > 0, "Cannot burn 0 coins.");
        uint256 fromBalance = balances[msg.sender];
        require(fromBalance >= _ammount, "Not enough balance to burn.");
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
        return isDistributor(_address);
    }

    function onRescue(address _address) internal notFrozen returns (uint256 ammount) {
        uint256 rescuedAmmount = balances[_address];
        require(rescuedAmmount > 0, "Cannot rescue 0 coins.");
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
        return isCreator(_address);
    }

    /*
        Delegated Transfer
    */

    uint256 public _delegatedTransferFee = 0;
    address private _delegatedTransferAddress;

    /// @notice Sets the '_value' of the fee that will be charged when client does a DelegatedTransfer
    /// @notice Sets the '_address' adress that will receive the fees of DelegatedTransfers
    function setDelegatedTransferData(
        address _address,
        uint256 _value,
        bytes32 _nonce,
        address _signer,
        bytes _signature
    ) external notFrozen {
        require(isDistributor(_signer));
        require(_address != address(0));
        require(_value >= 0);
        bytes32 txHash = hashDelegatedTransfer(_signer, _address, _value, _nonce);
        verify(txHash, _signature, _signer);
        _delegatedTransferFee = _value;
        _delegatedTransferAddress = _address;
    }

    /// @notice send `_value` token to `_to` from `_from` on the condition Hash was signed by `_from`
    /// @dev Transfers based on an offline signed transfer instruction.
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @param _nonce Random nonce generated by client
    /// @param _signature The signature of the transaction signed by `_from`
    function delegatedTransfer(
        address _from,
        address _to,
        uint256 _value,
        bytes32 _nonce,
        bytes _signature
    ) public notFrozen {
        require(_value > 0, "Cannot send 0 CAO");
        registerTransaction(_from, getBlockNumber());
        _value.requireValidAmount();
        bytes32 txHash = hashDelegatedTransfer(_from, _to, _value, _nonce);
        verify(txHash, _signature, _from);
        // Transfer the CAO to the other account
        transferBetweenAccounts(_from, _to, _value);
        // Pay the fee
        if(_delegatedTransferFee > 0) {
            transferBetweenAccounts(_from, _delegatedTransferAddress, _delegatedTransferFee);
        }
    }

    /// @notice Creates a Hash of the Delegated Transfer Data.
    /// @dev This is used to sign the data without needing a transaction, without any gas cost and without confirmation delay.
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @param _nonce Random nonce generated by signer
    /// @return The hash of the transaction calculated using by `msg.sender`
    function hashDelegatedTransfer(
        address _from,
        address _to,
        uint256 _value,
        bytes32 _nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_from, _to, _value, _nonce));
    }

    /*
        IVerifySignature
        Signature Verification
    */

    // Stores used hashes
    mapping (bytes32 => bool) private _usedHashes;

    function verify(bytes32 _hash, bytes _signature, address _expectedSigner) internal {
        require(!_usedHashes[_hash], "_hash already used");
        _usedHashes[_hash] = true;
        address recovered = ECRecovery.recover(ECRecovery.toEthSignedMessageHash(_hash), _signature);
        require(recovered == _expectedSigner, "invalid signature");
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