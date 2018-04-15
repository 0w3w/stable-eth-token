var Migrations = artifacts.require("./framework/Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
