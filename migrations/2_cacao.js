var Cacao = artifacts.require("Cacao");
var CacaoRescueMock = artifacts.require("test/CacaoRescueMock.sol");

module.exports = function (deployer, network, accounts) {
    deployer.deploy(Cacao,
        accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
        accounts[5], accounts[6], accounts[7],
        { gas: 7499999, from: accounts[0] }); // Distribution Addresses
    deployer.deploy(CacaoRescueMock,
        accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
        accounts[5], accounts[6], accounts[7], // Distribution Addresses
        1, // Current Block Number
        { gas: 7499999, from: accounts[0] });
};