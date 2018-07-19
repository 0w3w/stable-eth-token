const Cacao = artifacts.require("Cacao");
import { caoToWei } from './helpers/helperMethods.js';

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('StandardToken', accounts => {
  const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
  const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
  const delegatedTransferAddress = accounts[8];
  const delegatedTransferFee = caoToWei(1);
  const _name = 'Cacao';
  const _symbol = 'CAO';
  const _decimals = 3;

  beforeEach(async function () {
    this.token = await Cacao.new(
        creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4], // Creation Address 1 is msg.sender
        distributionAddresses[0], distributionAddresses[1], distributionAddresses[2], // Distribution Addresses
        delegatedTransferAddress, delegatedTransferFee);
  });

  it('has a name', async function () {
    const name = await this.token.name();
    name.should.be.equal(_name);
  });

  it('has a symbol', async function () {
    const symbol = await this.token.symbol();
    symbol.should.be.equal(_symbol);
  });

  it('has an amount of decimals', async function () {
    const decimals = await this.token.decimals();
    decimals.should.be.bignumber.equal(_decimals);
  });
});