var Cacao = artifacts.require("Cacao");
var CacaoRescueMock = artifacts.require("test/CacaoRescueMock.sol");

module.exports = function (deployer, network, accounts) {
    let delegatedTransferFee = 1000; // 1 CAO en Weis
    deployer.deploy(Cacao,
        accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
        accounts[5], accounts[6], accounts[7], // Distribution Addresses
        accounts[8], delegatedTransferFee, // Delegated Transfer
        { gas: 8000029, from: accounts[0] });
    deployer.deploy(CacaoRescueMock,
        accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
        accounts[5], accounts[6], accounts[7], // Distribution Addresses
        accounts[8], delegatedTransferFee, // Delegated Transfer
        1, // Current Block Number
        { gas: 8000029, from: accounts[0] });
};