import { createCoin, distributeCoin, createAndDistributeCoin, caoToWei } from './helpers/helperMethods.js';
import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertBurned, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('CacaoDestruction', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const delegatedTransferFee = caoToWei(1);
    const delegatedTransferAddress = accounts[8];
    let destructionReference = "QWERY132456";
    let creationAmount = caoToWei(1000);
    let amountToDistribute = caoToWei(100);
    let amountToBurn = caoToWei(10);
    let amountToObliterate = caoToWei(6);
    let owner = accounts[9];
    let transactionAddress = accounts[10];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7], // Distribution Addresses
            delegatedTransferAddress, delegatedTransferFee);
    });

    describe('Destruct lifecycle', function () {
        it("succeeds", async function () {
            await createCoin(this.token, creationAddresses, creationAmount, transactionAddress);
            await distributeCoin(this.token, distributionAddresses, transactionAddress, amountToDistribute, owner);
            await assertInLimbo(this.token, caoToWei(900));
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
            await assertBalanceOf(this.token, owner, caoToWei(90));
            await assertInPurgatory(this.token, amountToBurn);
            await assertInCirculation(this.token, caoToWei(90));
            await assertInLimbo(this.token, caoToWei(900));
            await assertTotalSupply(this.token, creationAmount);

            let obliterateTask = this.token.obliterate(amountToObliterate, { from: distributionAddresses[1] });
            let obliterateEvent = await inTransaction(obliterateTask, 'Obliterated');
            obliterateEvent.args._amount.should.be.bignumber.equal(amountToObliterate);
            await assertInPurgatory(this.token, caoToWei(4));
            await assertInCirculation(this.token, caoToWei(90));
            await assertInLimbo(this.token, caoToWei(900));
            await assertTotalSupply(this.token, caoToWei(994));
        });
    });

    describe('generateDestructionReference', function () {
        beforeEach(async function () {
            await createAndDistributeCoin(this.token, creationAddresses, distributionAddresses, transactionAddress, creationAmount, owner);
        });
        describe('when the sender address is a distribution address', function () {
            it("succeeds", async function () {
                await this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] });
            });
        });
        describe('when the sender address is not a distribution address', function () {
            it("fails", async function () {
                await assertRevert(this.token.generateDestructionReference(destructionReference, { from: creationAddresses[1] }));
            });
        });
        describe('when the reference is already taken', function () {
            it("fails", async function () {
                await this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] });
                await assertRevert(this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] }));
            });
        });
    });

    describe('burn', function () {
        beforeEach(async function () {
            await createAndDistributeCoin(this.token, creationAddresses, distributionAddresses, transactionAddress, creationAmount, owner);
        });
        describe('when is valid reference', function () {
            beforeEach(async function () {
                await this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] });
            });
            describe('when the sender has enough balance to burn', function () {
                it("succeeds", async function () {
                    let burnTask = this.token.burn(amountToBurn, destructionReference, { from: owner });
                    let burnedEvent = await inTransaction(burnTask, 'Burned');
                    burnedEvent.args._account.should.eq(owner);
                    burnedEvent.args._amount.should.be.bignumber.equal(amountToBurn);
                    burnedEvent.args._reference.should.eq(destructionReference);
                    await assertBalanceOf(this.token, owner, caoToWei(990));
                    await assertInPurgatory(this.token, amountToBurn);
                    await assertInCirculation(this.token, caoToWei(990));
                    await assertTotalSupply(this.token, creationAmount);
                });
            });
            describe('when the sender has enough balance to burn', function () {
                let notEnoughBalanceAccount = accounts[10];
                it("fails", async function () {
                    await assertRevert(this.token.burn(amountToBurn, destructionReference, { from: notEnoughBalanceAccount }));
                });
            });
            describe('when the reference is already used', function () {
                it("fails", async function () {
                    await this.token.burn(amountToBurn, destructionReference, { from: owner });
                    await assertRevert(this.token.burn(amountToBurn, destructionReference, { from: owner }));
                });
            });
        });
        describe('when is an invalid reference', function () {
            let invalidReference = "invalid-reference";
            it("fails", async function () {
                await assertRevert(this.token.burn(amountToBurn, invalidReference, { from: owner }));
            })
        });
    });

    describe('obliterate', function () {
        beforeEach(async function () {
            await createAndDistributeCoin(this.token, creationAddresses, distributionAddresses, transactionAddress, creationAmount, owner);
            await this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] });
            await this.token.burn(amountToBurn, destructionReference, { from: owner });
        });
        describe('when the sender address is a distribution address', function () {
            it("succeeds", async function () {
                let obliterateTask = this.token.obliterate(amountToObliterate, { from: distributionAddresses[1] });
                let obliterateEvent = await inTransaction(obliterateTask, 'Obliterated');
                obliterateEvent.args._amount.should.be.bignumber.equal(amountToObliterate);
                await assertInPurgatory(this.token, caoToWei(4));
                await assertInCirculation(this.token, caoToWei(990));
                await assertTotalSupply(this.token, caoToWei(994));
            });
        });
        describe('when the sender address is not a distribution address', function () {
            it("fails", async function () {
                await assertRevert(this.token.obliterate(amountToObliterate, { from: creationAddresses[1] }));
            });
        });
        describe('when there are not enough coins to obliterate', function () {
            it("fails", async function () {
                let toMuchAmountToObliterate = caoToWei(100);
                await assertRevert(this.token.obliterate(toMuchAmountToObliterate, { from: distributionAddresses[1] }));
            });
        });
    });
});