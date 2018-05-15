import { createCoin, distributeCoin, createAndDistributeCoin, caoToWei } from './helpers/helperMethods.js';
import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('CacaoDistribution', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    let creationAmount =caoToWei(1000);
    let pendingAmountInLimbo = caoToWei(900);
    let initialAmountToDistribute = caoToWei(100);
    let owner = accounts[8];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7]); // Distribution Addresses
    });

    describe('distribution lifecycle', function () {
        it("succeeds", async function () {
            await createCoin(this.token, creationAddresses, creationAmount);

            // startDistribution
            await assertInCirculation(this.token, 0);
            await assertTotalSupply(this.token, creationAmount);
            await this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] });
            await assertInCirculation(this.token, 0);
            await assertTotalSupply(this.token, creationAmount);

            // confirmDistribution
            let confirmDistributionTask = this.token.confirmDistribution(owner, true, { from: distributionAddresses[1] });
            let distributionEvent = await inTransaction(confirmDistributionTask, 'Distributed');
            distributionEvent.args._to.should.eq(owner);
            distributionEvent.args._amount.should.be.bignumber.equal(initialAmountToDistribute);
            await assertInCirculation(this.token, initialAmountToDistribute);
            await assertTotalSupply(this.token, creationAmount);
            await assertBalanceOf(this.token, owner, initialAmountToDistribute);
            await assertInLimbo(this.token, caoToWei(900));
        });
    });

    describe('startDistribution', function () {
        describe('when there are enough cacaos in limbo', function () {
            beforeEach(async function () {
                await createCoin(this.token, creationAddresses, creationAmount);
                await assertInLimbo(this.token, creationAmount);
            });
            describe('when the sender address is a distribution address.', function () {
                describe('when is a valid amount (greater equal than 0.001 CAO).', function () {
                    it('starts distribution.', async function () {
                        await this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] });
                        await assertInCirculation(this.token, 0);
                        await assertInLimbo(this.token, creationAmount);
                    });
                });
                describe('when is an invalid amount (less than 0.001 CAO).', function () {
                    let invalidCreationAmount = caoToWei(.0001);
                    it('fails.', async function () {
                        await assertRevert(this.token.startDistribution(owner, invalidCreationAmount, { from: distributionAddresses[0] }));
                        await assertInCirculation(this.token, 0);
                        await assertInLimbo(this.token, creationAmount);
                    });
                });
                describe('when there is an ongoing distribution for that address.', function () {
                    it('fails.', async function () {
                        await this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] });
                        await assertRevert(this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] }));
                        await assertInCirculation(this.token, 0);
                        await assertInLimbo(this.token, creationAmount);
                    });
                });
            });
            describe('when the sender address is not a distribution address.', function () {
                let invalidAddress = accounts[1]; // Creator Address instead
                it('fails.', async function () {
                    await assertRevert(this.token.startDistribution(owner, initialAmountToDistribute, { from: invalidAddress }));
                });
            });
        });

        describe('when there are not enough cacaos in limbo', function () {
            it('starts distribution.', async function () {
                // It will fail until the majority of votes is achieved.
                // Creation and distribution can happen asyncronously.
                // Assumming there are enough cacaos in limbo at start distribution time does not warantee there will be enough
                // when the majority is achieved and cacaos are distributed.
                await assertTotalSupply(this.token, 0);
                await assertInCirculation(this.token, 0);
                await assertInLimbo(this.token, 0);
                await this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] });
                await assertInCirculation(this.token, 0);
                await assertInLimbo(this.token, 0);
            });
        });
    });

    describe('confirmDistribution', function () {
        describe('when there are enough cacaos in limbo', function () {
            beforeEach(async function () {
                await createCoin(this.token, creationAddresses, creationAmount);
                await assertInLimbo(this.token, creationAmount);
            });
            describe('when the sender address is a distribution address', function () {
                let senderAddress = distributionAddresses[0];
                describe('when there is an open distribution process', function () {
                    beforeEach(async function () {
                        await this.token.startDistribution(owner, initialAmountToDistribute, { from: senderAddress });
                    });
                    describe('when majority has not being achieved', function () {
                        it('succeeds and no event is emmited', async function () {
                            let confirmDistributionTask = this.token.confirmDistribution(owner, false, { from: distributionAddresses[1] });
                            await notInTransaction(confirmDistributionTask, 'Distributed');
                        });
                    });
                    describe('when majority has being achieved in favor', function () {
                        it('coin is distributed and event is emmited', async function () {
                            let confirmDistributionTask = this.token.confirmDistribution(owner, true, { from: distributionAddresses[1] });
                            let distributionEvent = await inTransaction(confirmDistributionTask, 'Distributed');
                            distributionEvent.args._to.should.eq(owner);
                            distributionEvent.args._amount.should.be.bignumber.equal(initialAmountToDistribute);
                            await assertInCirculation(this.token, initialAmountToDistribute);
                            await assertTotalSupply(this.token, creationAmount);
                            await assertBalanceOf(this.token, owner, initialAmountToDistribute);
                            await assertInLimbo(this.token, pendingAmountInLimbo);
                        });
                    });
                    describe('when majority has being achieved against', function () {
                        it('coin is not distributed and no event is emmited', async function () {
                            await this.token.confirmDistribution(owner, false, { from: distributionAddresses[1] });
                            let confirmDistributionTask = this.token.confirmDistribution(owner, false, { from: distributionAddresses[2] });
                            await notInTransaction(confirmDistributionTask, 'Distributed');
                            await assertInCirculation(this.token, 0);
                            await assertTotalSupply(this.token, creationAmount);
                            await assertBalanceOf(this.token, owner, 0);
                            await assertInLimbo(this.token, creationAmount);
                        });
                    });
                    describe('when the sender address already voted', function () {
                        it('fails.', async function () {
                            await assertRevert(this.token.confirmDistribution(owner, false, { from: senderAddress }));
                        });
                    });
                });
                describe('when there is not an open distribution process', function () {
                    it('fails.', async function () {
                        await assertRevert(this.token.confirmDistribution(owner, true, { from: senderAddress }));
                    });
                });

            });
            describe('when the sender address is not a distribution address', function () {
                let invalidAddress = accounts[1]; // Creation Address instead
                it('fails.', async function () {
                    await this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] });
                    await assertRevert(this.token.confirmDistribution(owner, false, { from: invalidAddress }));
                });
            });
        });
        describe('when there are not enough cacaos in limbo', function () {
            describe('when majority has being achieved in favor', function () {
                it('coin is distributed and event is emmited', async function () {
                    await this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] });
                    await assertRevert(this.token.confirmDistribution(owner, true, { from: distributionAddresses[1] }));
                });
            });
        });
    });
});