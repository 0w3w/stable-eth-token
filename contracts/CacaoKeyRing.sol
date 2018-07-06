pragma solidity ^0.4.21;

/// @title Stores contract relevant addresses information
/// @author 0w3w
contract CacaoKeyRing {
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
    uint8 private _replacementVotesInFavor = 0;
    uint8 private _replacementVotesAgainst = 0;
    address[] _replacementAddressVoted;

    address private _batchOldAddress1;
    address private _batchOldAddress2;
    address private _batchOldAddress3;

    address private _batchNewAddress1;
    address private _batchNewAddress2;
    address private _batchNewAddress3;

    address private _batchProcessInitAddress;
    bool private _batchReseting;

    // Stores used replacement hashes
    mapping (bytes32 => bool) private _usedHashes;

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
    modifier whenAddressReplacing() {
         // All replacements starts with at least one vote in favor
        require(_replacementVotesInFavor > 0);
        _;
    }

    /// @notice Methods decorated with this will only be able to be executed when there's an active batch address replacement process.
    modifier whenBatchReplacing() {
        require(_batchReseting);
        _;
    }

	/// @notice Initialize the contract by registering the creation and distribution addresses.
    /// @param _creatorAddress1 The creator address #1
    /// @param _creatorAddress2 The creator address #2
    /// @param _creatorAddress3 The creator address #3
    /// @param _creatorAddress4 The creator address #4
    /// @param _creatorAddress5 The creator address #5
    /// @param _distributionAddress1 The distributor address #1
    /// @param _distributionAddress2 The distributor address #2
    /// @param _distributionAddress3 The distributor address #3
    function CacaoKeyRing(
        address _creatorAddress1,
        address _creatorAddress2,
        address _creatorAddress3,
        address _creatorAddress4,
        address _creatorAddress5,
        address _distributionAddress1,
        address _distributionAddress2,
        address _distributionAddress3
    ) internal {
        setCreatorAddress(_creatorAddress1);
        setCreatorAddress(_creatorAddress2);
        setCreatorAddress(_creatorAddress3);
        setCreatorAddress(_creatorAddress4);
        setCreatorAddress(_creatorAddress5);
        setDistributionAddress(_distributionAddress1);
        setDistributionAddress(_distributionAddress2);
        setDistributionAddress(_distributionAddress3);
    }

    /// @notice Whether the _address is a creator address or not
    /// @param _address The address to verify
    /// @return True if the _address is a creator address
    function isCreator(address _address) public view returns (bool result) {
        return _keyring[_address].isCreation && _keyring[_address].isValid;
    }

    /// @notice Whether the _address is a distributor address or not
    /// @param _address The address to verify
    /// @return True if the _address is a distributor address
    function isDistributor(address _address) public view returns (bool result) {
        return _keyring[_address].isDistribution && _keyring[_address].isValid;
    }

    /// @notice Whether there is an active address replacement process or not
    /// @return True if there is an active process
    function isReplacingAddresses() public view returns (bool result){
         // All replacements starts with at least one vote in favor
        return (_replacementVotesInFavor > 0 || _batchReseting);
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

    /// @notice Requires a valid AddressMetadata and that the _initAddress can execute a replacement on it.
    /// @dev Only creators can modify other creators, same for distributors.
    function requireReplacementPermissions(address _initAddress, AddressMetadata storage _addressToReplaceMetadata) private view {
        // Is the original address a valid address to replace?
        require(_addressToReplaceMetadata.isValid);
        // Can the _initAddress execute a replacement on that address?
        if (_addressToReplaceMetadata.isCreation) {
            require(isCreator(_initAddress));
        }
        else if (_addressToReplaceMetadata.isDistribution) {
            require(isDistributor(_initAddress));
        }
        else {
            // If this is hit, something's wrong with the contract's code.
            // Not a creator nor a distributor but somehow valid.
            revert();
        }
    }

    /// @notice Starts the process to replace a creator address and executes the first vote in favor.
    /// @dev This method will fail if:
    /// - There is an ongoing replacement process.
    /// - The _originalAddress is not a valid address.
    /// - The _signatureAddress is not a valid creation/distribution address.
    /// @param _signatureAddress The adress that signed the message.
    /// @param _hash The Ethereum-SHA-3 (Keccak-256) hash of a unique random message.
    /// This function will NOT verify that the hash of the data is also correct. See sha3(...) solidity function.
    /// @param _v The v part of a signed message.
    /// @param _r The r part of a signed message.
    /// @param _s The s part of a signed message.
    /// @param _originalAddress The address to be replaced
    /// @param _proposedAddress The proposed new address
    /// @return Revocation process _id
    function replaceAddress(
        address _signatureAddress,
        bytes32 _hash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s,
        address _originalAddress,
        address _proposedAddress
    ) external whenNotReplacing {
        AddressMetadata storage _originalAddressMetadata = _keyring[_originalAddress];
        require(verify(_signatureAddress, _hash, _v, _r, _s));
        requireReplacementPermissions(_signatureAddress, _originalAddressMetadata);
        // Is the new address valid?
        require(!_keyring[_proposedAddress].isCreation && !_keyring[_proposedAddress].isDistribution);
        // Start the replacement process
        _oldAddress = _originalAddress;
        _newAddress = _proposedAddress;
        _replacementVotesInFavor = 1;
        _replacementVotesAgainst = 0;
        delete _replacementAddressVoted;
        _replacementAddressVoted.push(_signatureAddress);
    }

    /// @notice Generates a vote to replace an address
    /// @dev The contract needs a majority of votes in favor in order to the address to be revoked.
    /// Once the majority of the votes in favor are submitted, the address will be revoked and the process will be marked as finalized.
    /// Once the majority of the votes against are submitted, the process will be marked as finalized.
    /// This method will fail if:
    /// - There is no open revoking process.
    /// - The _signatureAddress is not a valid creation address.
    /// - The _signatureAddress has already voted.
    /// @param _vote True: in favor, False: against.
    function voteToReplaceAddress(
        address _signatureAddress,
        bytes32 _hash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s,
        bool _vote
    ) external whenAddressReplacing {
        require(verify(_signatureAddress, _hash, _v, _r, _s));
        AddressMetadata storage _originalAddressMetadata = _keyring[_oldAddress];
        // Verify the address has not voted already
        for (uint i = 0; i < _replacementAddressVoted.length; i++) {
            require(_replacementAddressVoted[i] != _signatureAddress);
        }
        requireReplacementPermissions(_signatureAddress, _originalAddressMetadata);
        _replacementAddressVoted.push(_signatureAddress);
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
            emit Replaced(_oldAddress, _newAddress);
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
    }

    /// @notice Start the process for batch replacement of the distribution addresses.
    /// @dev Will fail if:
    /// - There is an ongoing replacement process.
    /// - The _creatorAddress is not an authorized creator.
    function replaceDistributionAddresses(
        address _creatorAddress,
        bytes32 _hash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s,
        address _oldAddress1,
        address _oldAddress2,
        address _oldAddress3,
        address _newAddress1,
        address _newAddress2,
        address _newAddress3)
    external whenNotReplacing {
        // Verify _creatorAddress is creator and the signature is valid
        require(isCreator(_creatorAddress));
        require(verify(_creatorAddress, _hash, _v, _r, _s));
        // Are the old addresses valid?
        require(_keyring[_oldAddress1].isDistribution && _keyring[_oldAddress1].isValid);
        require(_keyring[_oldAddress2].isDistribution && _keyring[_oldAddress2].isValid);
        require(_keyring[_oldAddress3].isDistribution && _keyring[_oldAddress3].isValid);
        // Are the new addresses valid?
        require(!_keyring[_newAddress1].isCreation && !_keyring[_newAddress1].isDistribution);
        require(!_keyring[_newAddress2].isCreation && !_keyring[_newAddress2].isDistribution);
        require(!_keyring[_newAddress3].isCreation && !_keyring[_newAddress3].isDistribution);
        // Start process
        _batchOldAddress1 = _oldAddress1;
        _batchOldAddress2 = _oldAddress2;
        _batchOldAddress3 = _oldAddress3;
        _batchNewAddress1 = _newAddress1;
        _batchNewAddress2 = _newAddress2;
        _batchNewAddress3 = _newAddress3;
        _batchProcessInitAddress = _creatorAddress;
        _batchReseting = true;
    }

    /// @notice Confirms the batch reset the distribution addresses.
    /// @dev Will fail if:
    /// - There is not an ongoing replacement process.
    /// - The _creatorAddresses are not an authorized creator.
    /// Read verify() function documentation for more information.
    function confirmReplaceDistributionAddresses(
        address _creatorAddress1, bytes32 _hash1, uint8 _v1, bytes32 _r1, bytes32 _s1,
        address _creatorAddress2, bytes32 _hash2, uint8 _v2, bytes32 _r2, bytes32 _s2
    ) external whenBatchReplacing {
        require(_batchProcessInitAddress != _creatorAddress1);
        require(_batchProcessInitAddress != _creatorAddress2);
        require(_creatorAddress1 != _creatorAddress2);
        // Verify _creatorAddress is creator and the signature is valid
        require(isCreator(_creatorAddress1));
        require(isCreator(_creatorAddress2));
        require(verify(_creatorAddress1, _hash1, _v1, _r1, _s1));
        require(verify(_creatorAddress2, _hash2, _v2, _r2, _s2));
        // Invalidate old addresses
        _keyring[_batchOldAddress1].isValid = false;
        _keyring[_batchOldAddress2].isValid = false;
        _keyring[_batchOldAddress3].isValid = false;
        // Set new addresses
        setDistributionAddress(_batchNewAddress1);
        setDistributionAddress(_batchNewAddress2);
        setDistributionAddress(_batchNewAddress3);
        emit Replaced(_batchOldAddress1, _batchNewAddress1);
        emit Replaced(_batchOldAddress2, _batchNewAddress2);
        emit Replaced(_batchOldAddress3, _batchNewAddress3);
        // End the process
        endReplaceDistributionAddressesProcess();
    }

    function cancelReplacementOfDistributionAddresses(
        address _creatorAddress,
        bytes32 _hash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external whenBatchReplacing
    {
        require(_batchProcessInitAddress == _creatorAddress);
        require(verify(_creatorAddress, _hash, _v, _r, _s));
        endReplaceDistributionAddressesProcess();
    }

    /// @notice Verify that a Hash was signed by the given address.
    /// @dev This function doesn't do any validations, only call this when cancelling the batch replacement process.
    function endReplaceDistributionAddressesProcess() private {
        _batchOldAddress1 = address(0);
        _batchOldAddress2 = address(0);
        _batchOldAddress3 = address(0);
        _batchNewAddress1 = address(0);
        _batchNewAddress2 = address(0);
        _batchNewAddress3 = address(0);
        _batchProcessInitAddress = address(0);
        _batchReseting = false;
    }

    /// @notice Verify that a Hash was signed by the given address.
    /// @param _publicAddress The adress to test.
    /// @param _hash The Ethereum-SHA-3 (Keccak-256) hash of a known data.
    /// This function will NOT verify that the hash of the data is also correct. See sha3(...) solidity function.
    /// @param _v The v part of a signed message.
    /// @param _r The r part of a signed message.
    /// @param _s The s part of a signed message.
    /// @dev See https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethsign for more information;
    /// E.G. Getting that info with web3:
    ///     var _hash = web3.sha3('Schoolbus')
    ///     var signature = web3.eth.sign(web3.eth.accounts[0], _hash)
    ///     var r = signature.slice(0, 66)
    ///     var s = '0x' + signature.slice(66, 130)
    ///     var v = '0x' + signature.slice(130, 132)
    /// v will be either "00" or "01". As a result, in order to use this value, you will have to parse it to an integer and then add 27.
    /// This will result in either a 27 or a 28.
    ///     v = web3.toDecimal(v)
    ///     _hash = '0x' + _hash
    /// @return True if has was signed by the _publicAddress.
    function verify(address _publicAddress, bytes32 _hash, uint8 _v, bytes32 _r, bytes32 _s) internal returns(bool _success) {
        require(!_usedHashes[_hash]);
        _usedHashes[_hash] = true;
        return (ecrecover(_hash, _v, _r, _s) == _publicAddress);
    }

    /// @notice Triggers when and address is replaced.
    event Replaced(address _originalAddress, address _newAddress);
}