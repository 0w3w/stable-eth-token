pragma solidity ^0.4.24;
import "../Cacao.sol";

/// @author Guillermo Hernandez (0w3w)
contract CacaoRescueMock is Cacao {

    uint256 private fakeBlockNumber;

    constructor (
        address _creatorAddress1,
        address _creatorAddress2,
        address _creatorAddress3,
        address _creatorAddress4,
        address _distributionAddress1,
        address _distributionAddress2,
        address _distributionAddress3,
        address _delegatedFeeAddress,
        uint256 _delegatedFee,
        uint256 _initialBlockNumber
    )
    Cacao(
        _creatorAddress1,
        _creatorAddress2,
        _creatorAddress3,
        _creatorAddress4,
        _distributionAddress1,
        _distributionAddress2,
        _distributionAddress3,
        _delegatedFeeAddress,
        _delegatedFee
    )
    public {
        fakeBlockNumber = _initialBlockNumber;
    }

    function getBlockNumber() internal view returns (uint256 _blockNumber) {
        return fakeBlockNumber;
    }

    function registerTransactionBlockNumber(address _address, uint256 _blockNumber) external {
        registerTransaction(_address, _blockNumber);
    }
}