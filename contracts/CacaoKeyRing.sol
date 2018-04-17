pragma solidity ^0.4.21;

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
    uint8 private _replacementVotesInFavor = 0;
    uint8 private _replacementVotesAgainst = 0;
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
    /// @param _creatorAddress1 The creator address #1
    /// @param _creatorAddress2 The creator address #2
    /// @param _creatorAddress3 The creator address #3
    /// @param _creatorAddress4 The creator address #4
    /// @param _creatorAddress5 The creator address #5
    /// @param _distributionAddress1 The distributor address #1
    /// @param _distributionAddress2 The distributor address #2
    /// @param _distributionAddress3 The distributor address #3
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
    //function resetDistributionAddresses(
    //    address _distributionAddress1,
    //    address _distributionAddress2,
    //    address _distributionAddress3) external isInitialized()  whenNotReplacing() {
    //    // TODO
    //    revert();
    //}

    ///// @notice Generates a vote to batch reset the distribution addresses
    //function voteToResetDistributionAddresses(bool _vote) external isInitialized() returns (bool _success) {
    //    // TODO
    //    revert();
    //}
}