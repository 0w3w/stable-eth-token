pragma solidity ^0.4.21;

/// @title Controls the distribution of Cacaos
/// @author 0w3w
/// @notice 3 distribution keys, the contract needs 2/3 votes in order to distribute the coin. (A multisignature process)
/// The distribution keys can be replaced by the majority of votes from the other distribution keys.
/// All the distribution keys can be reset in batch by the majority of votes from the Creation Keys.
/// Just one expedition key can cancel the creation of the coin.
contract CacaoDistribution {    
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