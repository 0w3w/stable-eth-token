var Cacao = artifacts.require("Cacao");
module.exports = function(deployer, network, accounts) {
    deployer.deploy(Cacao,
        accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
        accounts[5], accounts[6], accounts[7]); // Distribution Addresses
};