import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import { caoToWei } from './helpers/helperMethods.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('Create Cacaos', async (accounts) => {
    let creationAmount = caoToWei(100);
    describe('for testing purposes', function () {
        it("succeeds", async function () {
            this.token = await Cacao.new(
                accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
                accounts[5], accounts[6], accounts[7]); // Distribution Addresses
            await this.token.startCreation(creationAmount, { from: accounts[0] });
            await this.token.confirmCreation(true, { from: accounts[1] });
            await this.token.confirmCreation(true, { from: accounts[2] });
            await this.token.startDistribution(accounts[8], caoToWei(10), { from: accounts[5] });
            await this.token.confirmDistribution(accounts[8], true, { from: accounts[6] });
            assert(true);
        });
    });
});