import { createCoin, caoToWei, getNonce, getHashOfDistributeData } from './helpers/helperMethods.js';
import { assertBalanceOf, assertInLimbo, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('CacaoDistribution', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const delegatedTransferAddress = accounts[8];
    const delegatedTransferFee = caoToWei(1);
    let creationAmount = caoToWei(1000);
    let pendingAmountInLimbo = caoToWei(900);
    let initialAmountToDistribute = caoToWei(100);
    let owner = accounts[9];
    const transactionAddress = accounts[10];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7], // Distribution Addresses
            delegatedTransferAddress, delegatedTransferFee);
    });

    describe('distribution lifecycle', function () {
        it("succeeds", async function () {
            await createCoin(this.token, creationAddresses, creationAmount, transactionAddress);
            // Distribute
            await assertInCirculation(this.token, 0);
            await assertTotalSupply(this.token, creationAmount);
            let nonce = getNonce();
            let txHash = await getHashOfDistributeData(this.token, owner, initialAmountToDistribute, nonce);
            let signature0 = web3.eth.sign(accounts[5], txHash);
            let signature1 = web3.eth.sign(accounts[6], txHash);
            let distributionTask = this.token.Distribute(
                owner,
                initialAmountToDistribute,
                nonce,
                accounts[5],
                signature0,
                accounts[6],
                signature1,
                { from: transactionAddress });
            let distributionEvent = await inTransaction(distributionTask, 'Distributed');
            distributionEvent.args._to.should.eq(owner);
            distributionEvent.args._amount.should.be.bignumber.equal(initialAmountToDistribute);
            await assertInCirculation(this.token, initialAmountToDistribute);
            await assertTotalSupply(this.token, creationAmount);
            await assertBalanceOf(this.token, owner, initialAmountToDistribute);
            await assertInLimbo(this.token, caoToWei(900));
        });
    });

    describe('Distribute', function () {
        describe('when the signing addresses are distribution addresses', async function () {
            beforeEach('sign transactions', async function () {
                this.nonce = getNonce();
                this.txHash = await getHashOfDistributeData(this.token, owner, initialAmountToDistribute, this.nonce);
                this.signature0 = web3.eth.sign(distributionAddresses[0], this.txHash);
                this.signature1 = web3.eth.sign(distributionAddresses[1], this.txHash);
            });
            describe('when valid signature', function () {
                describe('when there are enough cacaos in limbo', function () {
                    beforeEach(async function () {
                        await createCoin(this.token, creationAddresses, creationAmount, transactionAddress);
                        await assertInLimbo(this.token, creationAmount);
                    });
                    it('succeeds', async function () {
                        let distributionTask = this.token.Distribute(
                            owner,
                            initialAmountToDistribute,
                            this.nonce,
                            distributionAddresses[0],
                            this.signature0,
                            distributionAddresses[1],
                            this.signature1,
                            { from: transactionAddress });
                        let distributionEvent = await inTransaction(distributionTask, 'Distributed');
                        distributionEvent.args._to.should.eq(owner);
                        distributionEvent.args._amount.should.be.bignumber.equal(initialAmountToDistribute);
                        await assertInCirculation(this.token, initialAmountToDistribute);
                        await assertTotalSupply(this.token, creationAmount);
                        await assertBalanceOf(this.token, owner, initialAmountToDistribute);
                        await assertInLimbo(this.token, pendingAmountInLimbo);
                    });
                    describe('invalid ammount', function () {
                        it('reverts', async function () {
                            let invalidAmount = caoToWei(.0001);
                            let nonce = getNonce();
                            let txHash = await getHashOfDistributeData(this.token, owner, invalidAmount, nonce);
                            let signature0 = web3.eth.sign(distributionAddresses[0], txHash);
                            let signature1 = web3.eth.sign(distributionAddresses[1], txHash);
                            await assertRevert(this.token.Distribute(
                                owner,
                                invalidAmount,
                                nonce,
                                distributionAddresses[0],
                                signature0,
                                distributionAddresses[1],
                                signature1,
                                { from: transactionAddress }));
                        });
                    });
                    describe('when repeated nonce', function () {
                        it('reverts', async function () {
                            await this.token.Distribute(
                                owner,
                                initialAmountToDistribute,
                                this.nonce,
                                distributionAddresses[0],
                                this.signature0,
                                distributionAddresses[1],
                                this.signature1,
                                { from: transactionAddress });
                            await assertRevert(this.token.Distribute(
                                owner,
                                initialAmountToDistribute,
                                this.nonce,
                                distributionAddresses[0],
                                this.signature0,
                                distributionAddresses[1],
                                this.signature1,
                                { from: transactionAddress }));
                        });
                    });
                });
                describe('when there are not enough cacaos in limbo', function () {
                    it('reverts', async function () {
                        await assertRevert(this.token.Distribute(
                            owner,
                            initialAmountToDistribute,
                            this.nonce,
                            distributionAddresses[0],
                            this.signature0,
                            distributionAddresses[1],
                            this.signature1,
                            { from: transactionAddress }));
                    });
                });
            });
            describe('when invalid signature', function () {
                beforeEach(async function () {
                    await createCoin(this.token, creationAddresses, creationAmount, transactionAddress);
                    await assertInLimbo(this.token, creationAmount);
                });
                it('reverts', async function () {
                    await assertRevert(this.token.Distribute(
                        owner,
                        initialAmountToDistribute,
                        this.nonce,
                        distributionAddresses[0],
                        this.signature0,
                        distributionAddresses[1],
                        "invalid-signature",
                        { from: transactionAddress }));
                });
            });
        });
        describe('when the signing addresses are not distribution addresses', async function () {
            it('reverts', async function () {
                await createCoin(this.token, creationAddresses, creationAmount, transactionAddress);
                let nonce = getNonce();
                let txHash = await getHashOfDistributeData(this.token, owner, creationAmount, nonce);
                let signature0 = web3.eth.sign(creationAddresses[0], txHash);
                let signature1 = web3.eth.sign(creationAddresses[1], txHash);
                await assertRevert(this.token.Distribute(
                    owner,
                    creationAmount,
                    nonce,
                    creationAddresses[0],
                    signature0,
                    creationAddresses[1],
                    signature1,
                    { from: transactionAddress }));
            });
        });
    });
});