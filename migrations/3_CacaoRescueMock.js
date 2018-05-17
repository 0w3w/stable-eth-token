var CacaoRescueMock = artifacts.require("test/CacaoRescueMock.sol");
module.exports = function(deployer, network, accounts) {
    deployer.deploy(CacaoRescueMock,
        accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
        accounts[5], accounts[6], accounts[7], // Distribution Addresses
        1); // Current Block Number
};