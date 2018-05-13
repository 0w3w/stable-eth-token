import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const CacaoCreationTest = artifacts.require("CacaoCreationTest");
const Cacao = artifacts.require("Cacao");

const oneFinneyInWeis = web3.toWei(1, "finney"); // One finney is 0.001, which is the minimum initialAmount of cacao that a user can transact (1 Cent of a MXN), Weis
const halfFinneyInWeis = web3.toWei(.5, "finney");

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

async function assertIsCreating(contractInstance){
    let isCreating = await contractInstance.isCreating();
    assert(isCreating, "Contract should be creating");
}

async function assertIsNotCreating(contractInstance){
    let isCreating = await contractInstance.isCreating();
    assert(!isCreating, "Contract should not be creating");
}

contract('CacaoCreation', async (accounts) => {
    let contractInstance;

    beforeEach('setup contract for each test', async function () {
        contractInstance = await CacaoCreationTest.new();
    });

    it("should be able to start the process if the sender address and amount are valid.", async () => {
        await contractInstance.setMockState(true);
        let isCreating = await contractInstance.isCreating();
        assert(!isCreating, "Contract should not be creating");
        let result = await contractInstance.startCreation(oneFinneyInWeis);
        isCreating = await contractInstance.isCreating();
        assert(isCreating, "Contract should be creating");
   });

   it("should not be able to start the process if the sender address is not valid.", async () => {
        await contractInstance.setMockState(false);
        let isCreating = await contractInstance.isCreating();
        assert(!isCreating, "Contract should not be creating");
        try {
            let result = await contractInstance.startCreation(oneFinneyInWeis);
            assert.fail("Should have failed");
        } catch(err) {
            assert(err.toString().includes('revert'), err.toString())
        }
    });

    it("should not be able to start the process if the amount is not valid.", async () => {
         await contractInstance.setMockState(true);
         let isCreating = await contractInstance.isCreating();
         assert(!isCreating, "Contract should not be creating");
         try {
             let result = await contractInstance.startCreation(halfFinneyInWeis);
             assert.fail("Should have failed");
         } catch(err) {
             assert(err.toString().includes('revert'), err.toString())
         }
     });
});

contract('Cacao', async (accounts) => {
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
            assertIsNotCreating(this.token);
            assertInLimbo(this.token, 0);
            assertTotalSupply(this.token, 0);

            // Start Creation
            await this.token.startCreation(initialCreationAmountInWei, { from: accounts[0] });
            assertIsCreating(this.token);
            assertTotalSupply(this.token, 0);

            // ConfirmCreation
            await this.token.confirmCreation(true, { from: accounts[1] });
            let confirmCreationTask = this.token.confirmCreation(true, { from: accounts[2] });
            let creationEvent = await inTransaction(confirmCreationTask, 'Created');
            creationEvent.args._ammount.should.be.bignumber.equal(initialCreationAmountInWei);

            assertIsNotCreating(this.token);
            assertInLimbo(this.token, initialCreationAmountInWei);
            assertTotalSupply(this.token, initialCreationAmountInWei);
        });
    });

    describe('startCreation', function () {        
        describe('when the sender address is a creation address.', function () {
            describe('when is a valid amount (greater equal than 0.001 Ether).', function () {      
                it('starts creation.', async function () {
                    assertTotalSupply(this.token, 0);
                    assertIsNotCreating(this.token);
                    await this.token.startCreation(creationAmount, { from: creationAddress });
                    assertIsCreating(this.token);
                    assertTotalSupply(this.token, 0);
                });
            });
            describe('when is an invalid amount (less than 0.001 Ether).', function () {
                let invalidCreationAmount = web3.toWei(.5, "finney");
                it('fails.', async function () {
                    assertTotalSupply(this.token, 0);
                    assertIsNotCreating(this.token);
                    await assertRevert(this.token.startCreation(invalidCreationAmount, { from: creationAddress }));
                });
            });
            describe('when theres an ongoing creation.', function () {
                it('fails.', async function () {
                    assertTotalSupply(this.token, 0);
                    assertIsNotCreating(this.token);
                    await this.token.startCreation(creationAmount, { from: creationAddress });
                    assertIsCreating(this.token);
                    assertTotalSupply(this.token, 0);
                    await assertRevert(this.token.startCreation(creationAmount, { from: creationAddress }));
                    assertIsCreating(this.token);
                    assertTotalSupply(this.token, 0);
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
        describe('when the sender address is a creation address.', function () {
            describe('majority has not being achieved.', function () {      
                it('succeeds and no event is emmited.', async function () {
                    await this.token.startCreation(creationAmount, { from: creationAddress });
                    let confirmCreationTask = this.token.confirmCreation(true, { from: creationAddress2 });
                    await notInTransaction(confirmCreationTask, 'Created');
                });
            });
            describe('majority has being achieved in favor.', function () {
                it('coin is created and event is emmited.', async function () {
                    await this.token.startCreation(creationAmount, { from: creationAddress });
                    await this.token.confirmCreation(true, { from: creationAddress2 });
                    let confirmCreationTask = this.token.confirmCreation(true, { from: creationAddress3 });
                    let creationEvent = await inTransaction(confirmCreationTask, 'Created');
                    creationEvent.args._ammount.should.be.bignumber.equal(creationAmount);
                    assertIsNotCreating(this.token);
                    assertInLimbo(this.token, creationAmount);
                    assertTotalSupply(this.token, creationAmount);
                });
            });
            describe('majority has being achieved against.', function () {      
                it('coin is created and no event is emmited.', async function () {
                    await this.token.startCreation(creationAmount, { from: creationAddress });
                    await this.token.confirmCreation(false, { from: creationAddress2 });
                    await this.token.confirmCreation(false, { from: creationAddress3 });
                    let confirmCreationTask = this.token.confirmCreation(false, { from: creationAddress4 });
                    await notInTransaction(confirmCreationTask, 'Created');
                    assertIsNotCreating(this.token);
                    assertInLimbo(this.token, 0);
                    assertTotalSupply(this.token, 0);
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