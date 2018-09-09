import { assertInLimbo, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction } from './helpers/expectEvent.js';
import { caoToWei, getNonce, getHashOfCreateData } from './helpers/helperMethods.js';
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
    let creationAmount = caoToWei(10);
    let creationAddress0 = accounts[0];
    let creationAddress1 = accounts[1];
    let creationAddress2 = accounts[2];
    let creationAddress3 = accounts[3];
    let creationAddress4 = accounts[4];
    let delegatedTransferFee = caoToWei(1);
    const delegatedTransferAddress = accounts[8];
    const unrelatedAddress = accounts[9];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            creationAddress1, creationAddress2, creationAddress3, creationAddress4, // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7], // Distribution Addresses
            delegatedTransferAddress, delegatedTransferFee);
    });

    describe('creation lifecycle', function () {
        it("succeeds", async function () {
            // Pre Conditions
            await assertInLimbo(this.token, 0);
            await assertTotalSupply(this.token, 0);
            // Sign messages
            let nonce = getNonce();
            let txHash = await getHashOfCreateData(this.token, creationAmount, nonce);
            const signature0 = web3.eth.sign(creationAddress0, txHash);
            const signature1 = web3.eth.sign(creationAddress1, txHash);
            const signature2 = web3.eth.sign(creationAddress2, txHash);
            // Create Coin
            let creationTask = this.token.create(creationAmount,
                nonce,
                creationAddress0,
                signature0,
                creationAddress1,
                signature1,
                creationAddress2,
                signature2, { from: unrelatedAddress });
            // Post Conditions
            let creationEvent = await inTransaction(creationTask, 'Created');
            creationEvent.args._amount.should.be.bignumber.equal(creationAmount);
            await assertInLimbo(this.token, creationAmount);
            await assertTotalSupply(this.token, creationAmount);
        });
    });

    describe('create', function () {
        describe('when the signing addresses are creation addresses', async function () {
            beforeEach('sign transactions', async function () {
                this.nonce = getNonce();
                this.txHash = await getHashOfCreateData(this.token, creationAmount, this.nonce);
                this.signature0 = web3.eth.sign(creationAddress0, this.txHash);
                this.signature1 = web3.eth.sign(creationAddress1, this.txHash);
                this.signature2 = web3.eth.sign(creationAddress2, this.txHash);
            });
            describe('when valid signature', function () {
                it('succeds', async function () {
                    let creationTask = this.token.create(creationAmount,
                        this.nonce,
                        creationAddress0,
                        this.signature0,
                        creationAddress1,
                        this.signature1,
                        creationAddress2,
                        this.signature2, { from: unrelatedAddress });
                    // Post Conditions
                    let creationEvent = await inTransaction(creationTask, 'Created');
                    creationEvent.args._amount.should.be.bignumber.equal(creationAmount);
                    await assertInLimbo(this.token, creationAmount);
                    await assertTotalSupply(this.token, creationAmount);
                });
                describe('when repeated nonce', function () {
                    it('succeds', async function () {
                        await this.token.create(creationAmount,
                            this.nonce,
                            creationAddress0,
                            this.signature0,
                            creationAddress1,
                            this.signature1,
                            creationAddress2,
                            this.signature2, { from: unrelatedAddress });
                        await assertRevert(this.token.create(creationAmount,
                            this.nonce,
                            creationAddress0,
                            this.signature0,
                            creationAddress1,
                            this.signature1,
                            creationAddress2,
                            this.signature2, { from: unrelatedAddress }));
                    });
                });
            });
            describe('when invalid signature', function () {
                it('succeds', async function () {
                    await assertRevert(this.token.create(creationAmount,
                        this.nonce,
                        creationAddress0,
                        this.signature0,
                        creationAddress1,
                        this.signature1,
                        creationAddress2,
                        "invalidSignature", { from: unrelatedAddress }));
                });
            });
        });
        describe('when the signing addresses are not creation addresses', function () {
            it('fails.', async function () {
                let nonce = getNonce();
                let txHash = await getHashOfCreateData(this.token, creationAmount, nonce);
                const signature0 = web3.eth.sign(accounts[5], txHash);
                const signature1 = web3.eth.sign(accounts[6], txHash);
                const signature2 = web3.eth.sign(accounts[7], txHash);
                await assertRevert(this.token.create(creationAmount,
                    nonce,
                    accounts[5],
                    signature0,
                    accounts[6],
                    signature1,
                    accounts[7],
                    signature2, { from: unrelatedAddress }));
            });
        });
    });
});