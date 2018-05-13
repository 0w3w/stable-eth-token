import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

async function assertIsCreating(contractInstance) {
    let isCreating = await contractInstance.isCreating();
    assert(isCreating, "Contract should be creating");
}

async function assertIsNotCreating(contractInstance) {
    let isCreating = await contractInstance.isCreating();
    assert(!isCreating, "Contract should not be creating");
}

contract('CacaoCreation', async (accounts) => {
    // One finney is 0.001, which is the minimum initialAmount of cacao that a user can transact (1 Cent of a MXN), Unit is Weis
    let creationAmount = web3.toWei(1, "finney");
    let creationAddress = accounts[0];
    let creationAddress2 = accounts[1];
    let creationAddress3 = accounts[2];
    let creationAddress4 = accounts[3];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7]); // Distribution Addresses
    });

    describe('creation lifecycle', function () {
        it("succeeds", async function () {
            let initialCreationAmountInWei = web3.toWei(1, "finney");
            await assertIsNotCreating(this.token);
            await assertInLimbo(this.token, 0);
            await assertTotalSupply(this.token, 0);

            // Start Creation
            await this.token.startCreation(initialCreationAmountInWei, { from: accounts[0] });
            await assertIsCreating(this.token);
            await assertTotalSupply(this.token, 0);

            // ConfirmCreation
            await this.token.confirmCreation(true, { from: accounts[1] });
            let confirmCreationTask = this.token.confirmCreation(true, { from: accounts[2] });
            let creationEvent = await inTransaction(confirmCreationTask, 'Created');
            creationEvent.args._ammount.should.be.bignumber.equal(initialCreationAmountInWei);

            await assertIsNotCreating(this.token);
            await assertInLimbo(this.token, initialCreationAmountInWei);
            await assertTotalSupply(this.token, initialCreationAmountInWei);
        });
    });

    describe('startCreation', function () {
        describe('when the sender address is a creation address.', function () {
            describe('when is a valid amount (greater equal than 0.001 Ether).', function () {
                it('starts creation.', async function () {
                    await assertTotalSupply(this.token, 0);
                    await assertIsNotCreating(this.token);
                    await this.token.startCreation(creationAmount, { from: creationAddress });
                    await assertIsCreating(this.token);
                    await assertTotalSupply(this.token, 0);
                });
            });
            describe('when is an invalid amount (less than 0.001 Ether).', function () {
                let invalidCreationAmount = web3.toWei(.5, "finney");
                it('fails.', async function () {
                    await assertTotalSupply(this.token, 0);
                    await assertIsNotCreating(this.token);
                    await assertRevert(this.token.startCreation(invalidCreationAmount, { from: creationAddress }));
                });
            });
            describe('when theres an ongoing creation.', function () {
                it('fails.', async function () {
                    await assertTotalSupply(this.token, 0);
                    await assertIsNotCreating(this.token);
                    await this.token.startCreation(creationAmount, { from: creationAddress });
                    await assertIsCreating(this.token);
                    await assertTotalSupply(this.token, 0);
                    await assertRevert(this.token.startCreation(creationAmount, { from: creationAddress }));
                    await assertIsCreating(this.token);
                    await assertTotalSupply(this.token, 0);
                });
            });
        });
        describe('when the sender address is not a creation address.', function () {
            let invalidCreationAddress = accounts[5]; // Distribution Address instead
            it('fails.', async function () {
                await assertRevert(this.token.startCreation(creationAmount, { from: invalidCreationAddress }));
            });
        });
    });

    describe('confirmCreation', function () {
        describe('when the sender address is a creation address', function () {
            describe('when there is an open creation process', function () {
                beforeEach(async function () {
                    await this.token.startCreation(creationAmount, { from: creationAddress });
                });
                describe('majority has not being achieved.', function () {
                    it('succeeds and no event is emmited.', async function () {
                        let confirmCreationTask = this.token.confirmCreation(true, { from: creationAddress2 });
                        await notInTransaction(confirmCreationTask, 'Created');
                    });
                });
                describe('majority has being achieved in favor.', function () {
                    it('coin is created and event is emmited.', async function () {
                        await this.token.confirmCreation(true, { from: creationAddress2 });
                        let confirmCreationTask = this.token.confirmCreation(true, { from: creationAddress3 });
                        let creationEvent = await inTransaction(confirmCreationTask, 'Created');
                        creationEvent.args._ammount.should.be.bignumber.equal(creationAmount);
                        await assertIsNotCreating(this.token);
                        await assertInLimbo(this.token, creationAmount);
                        await assertTotalSupply(this.token, creationAmount);
                    });
                });
                describe('majority has being achieved against.', function () {
                    it('coin is not created and no event is emmited.', async function () {
                        await this.token.confirmCreation(false, { from: creationAddress2 });
                        await this.token.confirmCreation(false, { from: creationAddress3 });
                        let confirmCreationTask = this.token.confirmCreation(false, { from: creationAddress4 });
                        await notInTransaction(confirmCreationTask, 'Created');
                        await assertIsNotCreating(this.token);
                        await assertInLimbo(this.token, 0);
                        await assertTotalSupply(this.token, 0);
                    });
                });
            });
            describe('when there is no open creation process', function () {
                it('fails.', async function () {
                    await assertRevert(this.token.confirmCreation(true, { from: creationAddress }));
                });
            });            
        });
        describe('when the sender address is not a creation address.', function () {
            let invalidCreationAddress = accounts[5]; // Distribution Address instead
            it('fails.', async function () {
                await this.token.startCreation(creationAmount, { from: creationAddress });
                await assertRevert(this.token.confirmCreation(true, { from: invalidCreationAddress }));
            });
        });
        describe('when the sender address already voted.', function () {
            it('fails.', async function () {
                await this.token.startCreation(creationAmount, { from: creationAddress });
                await assertRevert(this.token.confirmCreation(true, { from: creationAddress }));
            });
        });
    });
});