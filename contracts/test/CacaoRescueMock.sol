pragma solidity ^0.4.21;
import "../Cacao.sol";

contract CacaoRescueMock is Cacao {

    uint256 fakeBlockNumber;

    function CacaoRescueMock(
        address _creatorAddress1,
        address _creatorAddress2,
        address _creatorAddress3,
        address _creatorAddress4,
        address _distributionAddress1,
        address _distributionAddress2,
        address _distributionAddress3,
        uint256 _initialBlockNumber
    ) 
    Cacao(
        _creatorAddress1,
        _creatorAddress2,
        _creatorAddress3,
        _creatorAddress4,
        _distributionAddress1,
        _distributionAddress2,
        _distributionAddress3
    )
    public {
        fakeBlockNumber = _initialBlockNumber;
    }
    
    function getBlockNumber() internal view returns (uint256 _blockNumber) {
        return fakeBlockNumber;
    }

    function registerTransactionBlockNumber(address _address, uint256 _blockNumber) public {
        registerTransaction(_address, _blockNumber);
    }
}