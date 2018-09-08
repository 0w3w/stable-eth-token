pragma solidity ^0.4.21;

/// @title Knows how to verify signatures
/// @author Guillermo Hernandez (0w3w)
contract IVerifySignature {
    /// @notice Verify that a Hash was signed by `_expectedSigner`.
    /// @param _hash The Ethereum-SHA-3 (Keccak-256) hash of a known data.
    /// @param _signature The signature of the transaction signed by `_expectedSigner`
    /// @param _expectedSigner The adress of the signer.
    /// @dev See https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethsign for more information;
    function verify(bytes32 _hash, bytes _signature, address _expectedSigner) internal;
}