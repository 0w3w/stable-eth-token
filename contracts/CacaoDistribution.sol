pragma solidity ^0.4.21;
import "./CacaoLibrary.sol";
import "./SafeMath.sol";

/// @title Abstract contract that controls the distribution of Cacaos
/// @author Guillermo Hernandez (0w3w)
/// @notice 3 distribution keys, the contract needs 2/3 votes in order to distribute the coin. (A multi signature process)
/// Only one process per address
contract CacaoDistribution {
    using CacaoLibrary for uint256;
    using SafeMath for uint256;

    // Total distribution
    uint256 public cacaosInCirculation = 0;
    // The amount of votes needed to be considered a majority
    uint8 constant private _votesMajority = 2;

    // Structure that will save the distribution process for a given address.
    struct DistributionMetadata {
        uint256 amount;
        uint8 votesInFavor;
        uint8 votesAgainst;
        address[] alreadyVoted;
        bool isActive;
    }

    // Stores the mapping between addresses to distributes and DistributionMetadata
    mapping (address => DistributionMetadata) private _transactions;

    /// @notice Methods decorated with this will only be able to be executed when
    /// the function isValidCreationAddress returns true for the msg.sender.
    modifier requireValidDistributionAddress() {
        require(canDistribute(msg.sender));
        _;
    }

    /*
        DISTRIBUTION
        - Start Distribution
        - Vote Distribution
    */

    /// @notice Will start the process to issue cacaos.
    /// @dev Will fail if:
    /// - The msg.sender is not an authorized distributor.
    /// - The _amount is invalid.
    /// - There's an active process for that address
    /// @param _to The address to send cacaos to.
    /// @param _amount The amount of cacaos to issue.
    function startDistribution(address _to, uint256 _amount) external requireValidDistributionAddress {
        _amount.requireValidAmount();
        require(!_transactions[_to].isActive);
        _transactions[_to].amount = _amount;
        _transactions[_to].votesInFavor = 1;
        _transactions[_to].votesAgainst = 0;
        delete _transactions[_to].alreadyVoted;
        _transactions[_to].alreadyVoted.push(msg.sender);
        _transactions[_to].isActive = true;
    }

    /// @notice Generates a vote to distribute cacao
    /// @dev The contract needs a majority of votes in favor in order to cacao to be distributed.
    /// Once the majority of the votes in favor are submitted, the coin will be distributed and the process will be marked as finalized.
    /// Once the majority of the votes against are submitted, the process will be marked as finalized.
    /// @dev This method will fail if:
    /// - There is no ongoing distributed process.
    /// - The msg.sender is not a valid distributed address.
    /// - The msg.sender has already voted
    /// - The _amount is greater than the CacaoCreation::cacaosInLimbo.
    /// @param _to The address to send cacaos to.
    /// @param _vote True: in favor, False: against.
    function confirmDistribution(address _to, bool _vote) external requireValidDistributionAddress {
        DistributionMetadata storage _transaction = _transactions[_to];
        // Verify there is an ongoing process
        require(_transaction.isActive);
        // Verify the address has not voted already
        for (uint i = 0; i < _transaction.alreadyVoted.length; i++) {
            require(_transaction.alreadyVoted[i] != msg.sender);
        }
        _transaction.alreadyVoted.push(msg.sender);
        // Vote
        if(_vote) {
            _transaction.votesInFavor++;
        }
        else {
            _transaction.votesAgainst++;
        }
        // Was majority achieved?
        bool majorityAchieved = false;
        if(_transaction.votesInFavor >= _votesMajority) {
            majorityAchieved = true;
            onDistribute(_to, _transaction.amount);
            cacaosInCirculation = cacaosInCirculation.add(_transaction.amount);
            emit Distributed(_to, _transaction.amount);
        }
        else if (_transaction.votesAgainst >= _votesMajority) {
            majorityAchieved = true;
        }
        // Process completed, clean
        if(majorityAchieved) {
            _transaction.amount = 0;
            _transaction.votesInFavor = 0;
            _transaction.votesAgainst = 0;
            delete _transaction.alreadyVoted;
            _transaction.isActive = false;
        }
    }
    
    /// @notice Whether the _address can distribute cacaos or not
    /// @dev Abstract Method
    /// @param _address The address to verify
    /// @return True if it can
    function canDistribute(address _address) internal returns (bool _isValid);
    
    /// @notice Called when cacaos are being distributed for a given address
    /// @dev Abstract Method
    /// @param _to The address to send cacaos
    /// @param _amount The amount of cacaos to distribute
    function onDistribute(address _to, uint256 _amount) internal;

    /// @notice Triggers when cacaos are distributed
    /// @param _to The address of the recipient
    /// @param _amount The amount of cacaos
    event Distributed(address _to, uint256 _amount);
}