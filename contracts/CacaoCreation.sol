pragma solidity ^0.4.21;
import "./CacaoLibrary.sol" as CacaoCreationCacaoLibraryImport;
import "./SafeMath.sol" as CacaoCreationSafeMathImport;

/// @title Abstract contract that controls the creation of Cacaos
/// @author 0w3w
/// @notice 5 creation addresses, the contract needs a mayority of votes from this addresses in order to create Cacaos. (A multisignature process)
/// The creation addresses are unique to the contract and can be replaced by a vote from the majority.
contract CacaoCreation {
    using CacaoCreationCacaoLibraryImport.CacaoLibrary for uint256;
    using CacaoCreationSafeMathImport.SafeMath for uint256;

    // The created cacaos go to the "Limbo", an intermediate state between creation and distribution.
    uint256 public cacaosInLimbo = 0;
    
    // Creation process state variables
    uint256 private _ammountToCreate;
    uint8 private _creationVotesInFavor;
    uint8 private _creationVotesAgainst;
    address[] _creationAddressVoted;
    uint8 constant private _creationMajority = 3;

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

    /// @notice Methods decorated with this will only be able to be executed when
    /// the function IsValidCreationAddress returns true for the msg.sender.
    modifier requireValidCreationAddress() {
        require(IsValidCreationAddress(msg.sender));
        _;
    }

    /// @notice Whether there is an active creation process or not
    /// @return True if there is an active process
    function isCreating() internal view returns (bool result){
        return (_creationVotesInFavor > 0); // Creation starts with at least one vote in favor
    }

    /// @notice Whether the _address can create cacaos or not
    /// @dev Abstract Method
    /// @param _address The address to verify
    /// @return True if it can
    function IsValidCreationAddress(address _address) internal returns (bool _isValid);

    /// @notice Starts the creation process and executes the first vote in favor.
    /// @dev This method will fail if:
    /// - There is an ongoing creation process.
    /// - The msg.sender is not a valid creation address.
    /// - Invalid amount, should be at least 1 finney.
    /// @param _ammount The ammount of cacaos to issue
    function startCreation(uint256 _ammount) external whenNotCreating() requireValidCreationAddress() {
        _ammount.isValidAmmount();
        _ammountToCreate = _ammount;
        _creationVotesInFavor = 1;
        _creationVotesAgainst = 0;
        delete _creationAddressVoted;
        _creationAddressVoted.push(msg.sender);
    }

    /// @notice Generates a vote to creates cacao
    /// @dev The contract needs a majority of votes in favor in order to cacao to be generated.
    /// Once the majority of the votes in favor are submitted, the coin will be created and the process will be marked as finalized.
    /// Once the majority of the votes against are submitted, the process will be marked as finalized.
   /// @dev This method will fail if:
    /// - There is no ongoing creation process.
    /// - The msg.sender is not a valid creation address.
    /// - The msg.sender has already voted
    /// @param _vote True: in favor, False: against.
    /// @return True if the process is finalized.
    function confirmCreation(bool _vote) external whenCreating() requireValidCreationAddress() returns (bool _finalized) {
        // Verify the address has not voted already
        for (uint i = 0; i < _creationAddressVoted.length; i++) {
            require(_creationAddressVoted[i] != msg.sender);
        }
        _creationAddressVoted.push(msg.sender);
        // Vote
        if(_vote) {
            _creationVotesInFavor++;
        }
        else {
            _creationVotesAgainst++;
        }
        // Was majority achieved?
        bool majorityAchieved = false;
        if(_creationVotesInFavor >= _creationMajority) {
            majorityAchieved = true;
            cacaosInLimbo = cacaosInLimbo.add(_ammountToCreate);
            emit Created(_ammountToCreate);
        }
        else if (_creationVotesAgainst  >= _creationMajority) {
            majorityAchieved = false;

        }
        // Process completed, clean
        if(majorityAchieved) {
            _ammountToCreate = 0;
            _creationVotesInFavor = 0;
            _creationVotesAgainst = 0;
            delete _creationAddressVoted;
        }
        return majorityAchieved;
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
