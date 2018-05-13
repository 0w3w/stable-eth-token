import { createCoin, distributeCoin, createAndDistributeCoin } from './helpers/helperMethods.js';
import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertBurned, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('CacaoDestruction', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    let destructionReference = "QWERY132456";
    let creationAmount = web3.toWei(1000, "finney");
    let amountToDistribute = web3.toWei(100, "finney");
    let amountToBurn = web3.toWei(10, "finney");
    let amountToObliterate = web3.toWei(6, "finney");
    let owner = accounts[8];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7]); // Distribution Addresses
    });

    describe('Destruct lifecycle', function () {
        it("succeeds", async function () {
            await createCoin(this.token, creationAddresses, creationAmount);
            await distributeCoin(this.token, distributionAddresses, amountToDistribute, owner);
            await assertInLimbo(this.token, web3.toWei(900, "finney"));
            await assertInCirculation(this.token, amountToDistribute);
            await assertInPurgatory(this.token, 0);
            await assertBurned(this.token, 0);
            await assertTotalSupply(this.token, creationAmount);

            await this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] });
            let burnTask = this.token.burn(amountToBurn, destructionReference, { from: owner });
            let burnedEvent = await inTransaction(burnTask, 'Burned');
            burnedEvent.args._account.should.eq(owner);
            burnedEvent.args._amount.should.be.bignumber.equal(amountToBurn);
            burnedEvent.args._reference.should.eq(destructionReference);
            await assertBalanceOf(this.token, owner, web3.toWei(90, "finney"));
            await assertInPurgatory(this.token, amountToBurn);
            await assertInCirculation(this.token, web3.toWei(90, "finney"));
            await assertInLimbo(this.token, web3.toWei(900, "finney"));
            await assertTotalSupply(this.token, creationAmount);

            let obliterateTask = this.token.obliterate(amountToObliterate, { from: distributionAddresses[1] });
            let obliterateEvent = await inTransaction(obliterateTask, 'Obliterated');
            obliterateEvent.args._amount.should.be.bignumber.equal(amountToObliterate);
            await assertInPurgatory(this.token, web3.toWei(4, "finney"));
            await assertInCirculation(this.token, web3.toWei(90, "finney"));
            await assertInLimbo(this.token, web3.toWei(900, "finney"));
            await assertTotalSupply(this.token, web3.toWei(994, "finney"));
        });
    });
});