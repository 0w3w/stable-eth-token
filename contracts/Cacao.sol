pragma solidity ^0.4.18;

/// @title SafeMath
/// @dev Math operations with safety checks that throw on error
/// @author https://github.com/OpenZeppelin/
library SafeMath {
    /// @notice Multiplies two numbers, throws on overflow.
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    /// @notice Integer division of two numbers, truncating the quotient.
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        // uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return a / b;
    }

    /// @notice Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    /// @notice Adds two numbers, throws on overflow.
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}

library CacaoFunctions {
    /// @notice Confirm valid operation ammount, throws if value is less than 1 finney.
    function isValidAmmount(uint256 value) internal pure{
        require(value >= (1 finney));
    }
}

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
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
}

/// @title ERC20 Ethereum Token standard
/// @author https://github.com/OpenZeppelin/
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
    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _value The amount of approved tokens
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}

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
    function balanceOf(address _owner) public constant returns (uint256) {
      return balances[_owner];
    }

    // Transfer the balance from owner's account to another account
    function transfer(address _to, uint256 _value) public mitigateShortAddressAttack returns (bool success) {
        if (_value == 0) {
            return false;
        }
        uint256 fromBalance = balances[msg.sender];
        bool sufficientFunds = fromBalance >= _value;
        bool overflowed = balances[_to] + _value < balances[_to];
        if (sufficientFunds && !overflowed) {
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
    function increaseApproval(address _spender, uint _addedValue) public returns (bool) {
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }

   /// @dev Decrease the amount of tokens that an owner allowed to a spender.
   /// approve(...) should be called when allowed[_spender] == 0.
   /// To decrement allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined)
   /// @param _spender The address which will spend the funds.
   /// @param _subtractedValue The amount of tokens to decrease the allowance by.
    function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) {
        uint oldValue = allowed[msg.sender][_spender];
        if (_subtractedValue > oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
        return true;
    }
}

/// @title Stores contract relevant addresses information
/// @author 0w3w
contract CacaoKeyRing {
    bool public initialized = false;
    uint8 constant private _creatorMajority = 3;
    uint8 constant private _distributorMajority = 2;

    // Structure that will save whether an address is a valid creation address or not, and if the key has been revoked or not.
    struct AddressMetadata {
        bool isCreation;
        bool isDistribution;
        bool isValid;
    }

    // Stores the mapping between creator addresses and AddressMetadata
    mapping (address => AddressMetadata) private _keyring;

    // Replacement process state variables
    address private _oldAddress;
    address private _newAddress;
    uint8 private _replacementVotesInFavor;
    uint8 private _replacementVotesAgainst;
    address[] _replacementAddressVoted;

    /// @notice Methods decorated with this will only be able to be executed when the contract is initialized.
    modifier isInitialized() {
        require(initialized);
        _;

    }

    /// @notice Methods decorated with this will only be able to be executed by a creator address.
    modifier onlyCreator() {
        require(isCreator(msg.sender));
        _;
    }

    /// @notice Methods decorated with this will only be able to be executed by a distributor address.
    modifier onlyDistributor() {
        require(isDistributor(msg.sender));
        _;
    }

    /// @notice Methods decorated with this will only be able to be executed when there's no active address replacement process.
    modifier whenNotReplacing() {
        require(!isReplacingAddresses());
        _;
    }

    /// @notice Methods decorated with this will only be able to be executed when there's an active address replacement process.
    modifier whenReplacing() {
        require(isReplacingAddresses());
        _;
    }

	/// @notice Initialize the contract by registering the creation and distribution addresses.
    /// @dev The contract will only work once this method is called
    /// Once succesfully called, this method will always fail.
    function initializeAddresses(
        address _creatorAddress1,
        address _creatorAddress2,
        address _creatorAddress3,
        address _creatorAddress4,
        address _creatorAddress5,
        address _distributionAddress1,
        address _distributionAddress2,
        address _distributionAddress3
    ) internal {
        require(!initialized);
        setCreatorAddress(_creatorAddress1);
        setCreatorAddress(_creatorAddress2);
        setCreatorAddress(_creatorAddress3);
        setCreatorAddress(_creatorAddress4);
        setCreatorAddress(_creatorAddress5);
        setDistributionAddress(_distributionAddress1);
        setDistributionAddress(_distributionAddress2);
        setDistributionAddress(_distributionAddress3);
        initialized = true;
    }

    /// @notice Whether the _address is a creator address or not
    /// @param _address The address to verify
    /// @return True if the _address is a creator address
    function isCreator(address _address) internal view returns (bool result) {
        return _keyring[_address].isCreation && _keyring[_address].isValid;  
    }

    /// @notice Whether the _address is a distributor address or not
    /// @param _address The address to verify
    /// @return True if the _address is a distributor address
    function isDistributor(address _address) internal view returns (bool result) {
        return _keyring[_address].isDistribution && _keyring[_address].isValid;
    }

    /// @notice Whether there is an active address replacement process or not
    /// @return True if there is an active process
    function isReplacingAddresses() internal view returns (bool result){
        return (_replacementVotesInFavor > 0); // All replacements starts with at least one vote in favor
    }

    /// @notice Sets a creator address
    /// @dev Fails if the address is already a creator address
    function setCreatorAddress(address _address) private {
        assert(_address != address(0));
        require(!_keyring[_address].isCreation && !_keyring[_address].isValid);
        _keyring[_address].isCreation = true;
        _keyring[_address].isDistribution = false;
        _keyring[_address].isValid = true;
    }

    /// @notice Sets a distributor address
    /// @dev Fails if the address is already a distributor address
    function setDistributionAddress(address _address) private {
        assert(_address != address(0));
        require(!_keyring[_address].isDistribution && !_keyring[_address].isValid);
        _keyring[_address].isCreation = false;
        _keyring[_address].isDistribution = true;
        _keyring[_address].isValid = true;
    }

    /*
        SECURITY
        - Creator and Distribution address replacement.
        - Distribution addresses batch replacement.
        Some multisignature concepts from https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs
    */

    /// @notice Requires a valid AddressMetadata and that the msg.sender can execute a replacement on it.
    /// @dev Only creators can modify other creators, same for distributors.
    function requireReplacementPermissions(AddressMetadata storage _addressToReplaceMetadata) private view {
        // Is the original address a valid address to replace?
        require(_addressToReplaceMetadata.isValid);
        // Can the msg.sender execute a replacement on that address?
        if (_addressToReplaceMetadata.isCreation) {
            require(_keyring[msg.sender].isCreation && _keyring[msg.sender].isValid);
        }
        else if (_addressToReplaceMetadata.isDistribution) {
            require(_keyring[msg.sender].isDistribution && _keyring[msg.sender].isValid);
        }
        else {
            // If this is hit, something's wrong with the contract's code.
            // Not a creator nor a distributor but somehow valid.
            revert();
        }
    }

    /// @notice Starts the process to replace a creator address and executes the first vote in favor.
    /// @dev This method will fail if:
    /// - The contract is not initialized.
    /// - There is an ongoing replacement process.
    /// - The _originalAddress is not a valid address.
    /// - The msg.sender is not a valid creation/distribution address.
    /// @param _originalAddress The address to be replaced
    /// @param _proposedAddress The proposed new address
    /// @return Revocation process _id
    function replaceAddress(address _originalAddress, address _proposedAddress) external isInitialized() whenNotReplacing() {
        AddressMetadata storage _originalAddressMetadata = _keyring[_originalAddress];
        requireReplacementPermissions(_originalAddressMetadata);
        // Start the replacement process
        _oldAddress = _originalAddress;
        _newAddress = _proposedAddress;
        _replacementVotesInFavor = 1;
        _replacementVotesAgainst = 0;
        delete _replacementAddressVoted;
        _replacementAddressVoted.push(msg.sender);
    }

    /// @notice Generates a vote to replace an address
    /// @dev The contract needs a majority of votes in favor in order to the address to be revoked.
    /// Once the majority of the votes in favor are submitted, the address will be revoked and the process will be marked as finalized.
    /// Once the majority of the votes against are submitted, the process will be marked as finalized.
    /// This method will fail if:
    /// - There is no open revoking process.
    /// - The msg.sender is not a valid creation address.
    /// - The msg.sender has already voted.
    /// @param _vote True: in favor, False: against.
    /// @return True if the process is finalized.
    function voteToReplaceAddress(bool _vote) external isInitialized() whenReplacing() returns (bool _finalized) {
        AddressMetadata storage _originalAddressMetadata = _keyring[_oldAddress];
        // Verify the address has not voted already
        for (uint i = 0; i < _replacementAddressVoted.length; i++) {
            require(_replacementAddressVoted[i] != msg.sender);
        }
        requireReplacementPermissions(_originalAddressMetadata);
        _replacementAddressVoted.push(msg.sender);
        // Vote
        if(_vote) {
            _replacementVotesInFavor++;
        }
        else {
            _replacementVotesAgainst++;
        }
        // Was Majority achieved?
        uint voteMajority = 0;
        if (_originalAddressMetadata.isCreation) {
            voteMajority = _creatorMajority;
        }
        else if (_originalAddressMetadata.isDistribution) {
            voteMajority = _distributorMajority;
        }
        bool majorityAchieved = false;
        if(_replacementVotesInFavor >= voteMajority) {
            // Proceed with the replacement!
            majorityAchieved = true;
            // Invalidate old address
            _keyring[_oldAddress].isValid = false;
            // Set new address
            if (_originalAddressMetadata.isCreation) {
                setCreatorAddress(_newAddress);
            }
            else if (_originalAddressMetadata.isDistribution) {
                setDistributionAddress(_newAddress);
            }
        }
        else if(_replacementVotesAgainst >= voteMajority) {
            // Replacement will not proceed
            majorityAchieved = true;

        }
        // Process completed, clean
        if(majorityAchieved) {
            _oldAddress = address(0);
            _newAddress = address(0);
            _replacementVotesInFavor = 0;
            _replacementVotesAgainst = 0;
            delete _replacementAddressVoted;
        }
        return majorityAchieved;
    }

    /// @notice Start the process for batch reset the distribution addresses.
    /// @dev Will fail if:
    /// - The contract is not initialized.
    /// - There is an ongoing replacement process.
    /// - The msg.sender is not an authorized creator.
    function resetDistributionAddresses(
        address _distributionAddress1,
        address _distributionAddress2,
        address _distributionAddress3) external isInitialized()  whenNotReplacing() {
        // TODO
        revert();
    }

    /// @notice Generates a vote to batch reset the distribution addresses
    function voteToResetDistributionAddresses(bool _vote) external isInitialized() returns (bool _success) {
        // TODO
        revert();
    }
}

/// @title Controls the freezing of the Contract
/// @author 0w3w
contract Freezable {
    bool public frozen = false;

    /// @notice Modifier to make a function callable only when the contract is not frozen.
    modifier notFrozen() {
        require(!frozen);
        _;
    }

    /// @notice Called to freeze the contract, triggers Frozen event
    function freeze() public {
        require(canFreeze(msg.sender));
        frozen = true;
        emit Frozen();
    }

    /// @notice Called by the freeze function to verify if the _address can execute a freeze
    function canFreeze(address _address) internal returns (bool result);

    /// @notice Triggers when the contract is Frozen
    event Frozen();
}

/// @title Controls the creation of Cacaos
/// @author 0w3w
/// @notice 5 creation addresses, the contract needs a mayority of votes from this addresses in order to create Cacaos. (A multisignature process)
/// The creation addresses are unique to the contract and cannot be replaced, but they can be revoked by a vote from the majority.
/// Just one creation addresses can cancel the process of creation.
contract CacaoCreation {
    using SafeMath for uint256;
    using CacaoFunctions for uint256;

    // The created cacaos go to the "Limbo", an intermediate state between creation and distribution.
    uint256 public cacaosInLimbo = 0;
    
    // Creation process state variables
    uint256 private _ammountToCreate;
    uint8 private _creationVotesInFavor;
    uint8 private _creationVotesAgainst;
    address[] _creationAddressVoted;

    /// @notice Methods decorated with this will only be able to be executed when there's no active creation process.
    modifier whenNotCreating() {
        require(!isCreating());
        _;
    }

    /// @notice Methods decorated with this will only be able to be executed when there's an active creation process.
    modifier whenCreating() {
        require(isCreating());
        _;
    }

    /// @notice Whether there is an active creation process or not
    /// @return True if there is an active process
    function isCreating() internal view returns (bool result){
        return (_creationVotesInFavor > 0); // Creation starts with at least one vote in favor
    }

    /// @notice Inicia el proceso de expedición, el remitente genera la primera confirmación.
    /// @dev La funcion fallará si:
    /// - The msg.sender is not a valid creation address.
    /// - El proceso de expedición ya fue iniciado.
    /// @param _ammount The ammount of cacaos to issue.
    function startCreation(uint256 _ammount) external whenNotCreating() {
        _ammount.isValidAmmount();
        _ammountToCreate = _ammount;
        _creationVotesInFavor = 1;
        _creationVotesAgainst = 0;
        delete _creationAddressVoted;
        _creationAddressVoted.push(msg.sender);
    }

    /// @notice Genera un voto para confirma el proceso de expedición.
    /// @dev Se necesita una mayoria para que la moneda sea expedida.
    /// Una vez que la mayoria de confirmaciones sea cumplida, la moneda será expedida y el proceso será finalizado.
    /// La funcion fallará si:
    /// - The msg.sender is not a valid creation address.
    /// - El proceso de expedición no ha sido iniciado.
    /// - El remitente ya ha confirmado.
    function confirmCreation(bool _vote) external whenCreating() returns (bool _finalized) {

        emit Created(_ammountToCreate);
    }

    /// @notice Decreases the ammount from the available in the limbo.
    /// @dev Function that will be called by the distribution contract.
    /// Will fail if:
    /// - The _ammount is greater than the cacaosInLimbo.
    /// - The _ammount is less than .001 CAO
    /// @param _ammount The ammount of cacaos to Issue.
    function draw(uint256 _ammount) internal whenNotCreating() {
        _ammount.isValidAmmount();
        require(cacaosInLimbo <= _ammount);
        cacaosInLimbo = cacaosInLimbo.sub(_ammount);
    }

    /// @notice Triggers when cacaos are created.
    /// @param _ammount The ammount of created cacaos.
    event Created(uint256 _ammount);
}

/// @title Controls the distribution of Cacaos
/// @author 0w3w
/// @notice 3 distribution keys, the contract needs 2/3 votes in order to distribute the coin. (A multisignature process)
/// The distribution keys can be replaced by the majority of votes from the other distribution keys.
/// All the distribution keys can be reset in batch by the majority of votes from the Creation Keys.
/// Just one expedition key can cancel the creation of the coin.
contract CacaoDistribution is CacaoCreation {    
    // Total distribution
    uint256 public cacaosInCirculation = 0;

    /*
        DISTRIBUTION
        - Start Distribution
        - Confirm Distribution
        - Cancel Distribution
        - Get
    */

    /// @notice Will start the process to issue cacaos.
    /// @dev Will fail if:
    /// - The contract is not initialized.
    /// - The msg.sender is not an authorized distributor.
    /// - The _ammount is greater than the CacaoCreation::cacaosInLimbo.
    /// @param _ammount The ammount of cacaos to Issue.
    function startDistribution(address _to, uint256 _ammount) external returns (bool distributed);
}

/// @title Controls the destruction of Cacaos
/// @author 0w3w
contract CacaoDestruction {
    // The total ammount of cacaos burned
    uint256 public cacaosBurned = 0;

    // The burned cacaos go to the "purgatory", an intermediate state in which Cacaos must first "undergo purification"
    // (a.k.a. removing them from the public bank accounts to maintain parity) before being obliterated from existence.
    uint256 public cacaosInPurgatory = 0;

    // Structure that will save whether an address is a valid creation address or not, and if the key has been revoked or not.
    struct ReferenceMetadata {
        // True if the reference is already taken
        bool isTaken;
        // True if the reference has been used
        bool isUsed;
    }

    // Stores the mapping between references and it's validity
    mapping (string => ReferenceMetadata) private _references;

    /// @notice Modifier to make a function callable only with a valid reference
    modifier validReference(string reference) {
        require(_references[reference].isTaken && !_references[reference].isUsed);
        _;
    }

    /// @notice Modifier to make a function callable only by a valid sender, who can generate references
    modifier senderCanGenerateReference(){
        require(canGenerateDestructionReference(msg.sender));
        _;
    }

    /// @notice Will generate a reference that will allow users to burn cacao.
    function generateDestructionReference(string reference) external senderCanGenerateReference() {
        require(!_references[reference].isTaken);
        _references[reference].isTaken = true;
        _references[reference].isUsed = false;
    }

    /// @notice Will destroy the _ammount of cacaos.
    /// @dev Will decrease _ammount from the msg.sender cacao balance and increase the _ammount in cacaosInPurgatory,
    /// @param _ammount The ammount of cacaos to burn.
    function burn(uint256 _ammount, string reference) public validReference(reference) {
        _references[reference].isUsed = true;
        cacaosInPurgatory = cacaosInPurgatory + _ammount;
        cacaosBurned = cacaosBurned + _ammount;
        emit Burned(msg.sender, _ammount, reference);
    }

    /// @notice Will completely obliterate the _ammount of cacaos from existence.
    /// @dev Will decrease _ammount from the cacaosInPurgatory.
    /// @param _ammount The ammount of cacaos to obliterate.
    function obliterate(uint256 _ammount) public { 
        cacaosInPurgatory = cacaosInPurgatory - _ammount;
        emit Obliterated(_ammount);
    }

    /// @notice Validates that the address can generate desctruction references
    /// @param _sender The address to validate.
    /// @return True if the address can generate desctruction references
    function canGenerateDestructionReference(address _sender) internal returns (bool result);

    /*
        Events
    */  

    /// @notice Is fired when an account burn cacaos.
    /// @param _ammount The ammount of burned cacaos.
    event Burned(address indexed _account, uint256 _ammount, string reference);

    /// @notice Is fired when cacaos are obliterated.
    /// @param _ammount The ammount of obliterated cacaos.
    event Obliterated(uint256 _ammount);
}

/// @title Controls the rescue of lost Cacaos
/// @notice According to the law, Cacaos are considered lost after 3 years of no account movement
/// which in solidity translates to no interaction with the contract.
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

/// @title Cacao Contract
/// @author 0w3w
contract Cacao is StandardToken, CacaoKeyRing, Freezable, CacaoCreation, CacaoDistribution, CacaoDestruction {

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
      return super.transfer(_to, _value);
    }   
    function transferFrom(address _from, address _to, uint256 _value) public notFrozen returns (bool) {
      return super.transferFrom(_from, _to, _value);
    }   
    function approve(address _spender, uint256 _value) public notFrozen returns (bool) {
      return super.approve(_spender, _value);
    }   
    function increaseApproval(address _spender, uint _addedValue) public notFrozen returns (bool success) {
      return super.increaseApproval(_spender, _addedValue);
    }   
    function decreaseApproval(address _spender, uint _subtractedValue) public notFrozen returns (bool success) {
      return super.decreaseApproval(_spender, _subtractedValue);
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

    function burn(uint256 _ammount, string reference) public {
        require(_ammount > 0);
        uint256 fromBalance = balances[msg.sender];
        require(fromBalance >= _ammount);
        balances[msg.sender] -= _ammount;
        emit Transfer(msg.sender, address(0), _ammount);
        super.burn(_ammount, reference);
    }
    
    function obliterate(uint256 _ammount) onlyDistributor() public {
        super.obliterate(_ammount);
    }

    function canGenerateDestructionReference(address _sender) internal returns (bool result){
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