import { createCoin, distributeCoin, createAndDistributeCoin, caoToWei } from './helpers/helperMethods.js';
import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertBurned, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const CacaoRescueMock = artifacts.require("test/CacaoRescueMock.sol");

async function createContractWithBlockNumber(blockNumber, creationAddresses, distributionAddresses, ammount, owner) {
    let contractInstance = await CacaoRescueMock.new(
        creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4],
        distributionAddresses[0], distributionAddresses[1], distributionAddresses[2],
        blockNumber);
    await createAndDistributeCoin(contractInstance, creationAddresses, distributionAddresses, ammount, owner);
    return contractInstance;
}

async function assertInHell(contractInstance, expectedAmount) {
    const cacaosInHell = await contractInstance.cacaosInHell();
    assert.equal(cacaosInHell, expectedAmount);
}

async function assertRescued(contractInstance, expectedAmount) {
    const cacaosRescued = await contractInstance.cacaosRescued();
    assert.equal(cacaosRescued, expectedAmount);
}

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('CacaoRescue', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const creationAmount = caoToWei(1000);
    const owner = accounts[8];
    const owner2 = accounts[9];
    const blockNumber6Years = 13140000;
    const blockNumer4YearsAgo = 4380000;
    const blockNumer5YearsAgo = 2190000;
    const blockNumer5AndAHalfYearsAgo = 1095000;

    beforeEach('setup contract for each test', async function () {
        this.token = await createContractWithBlockNumber(
            blockNumber6Years,
            creationAddresses,
            distributionAddresses,
            creationAmount,
            owner
        );
    });

    describe('Rescue', function () {
        describe('when the owner address last transaction was done no more than 5 years ago', function () {
            it("can't rescue", async function () {
                await this.token.registerTransactionBlockNumber(owner, blockNumer4YearsAgo); // 4 years 
                await assertRevert(this.token.rescue(owner, { from: distributionAddresses[0] }));
            });
        });
        describe('when the owner address last transaction was done more than 5 years ago', function () {
            beforeEach(async function () {
                await this.token.registerTransactionBlockNumber(owner, blockNumer5YearsAgo);
                await this.token.registerTransactionBlockNumber(owner2, blockNumer5AndAHalfYearsAgo);
            });
            describe('when address has cacaos', function () {
                let accountWithCacaos = owner;
                it("can rescue", async function () {
                    await assertBalanceOf(this.token, accountWithCacaos, creationAmount);
                    await assertTotalSupply(this.token, creationAmount);
                    await assertInCirculation(this.token, creationAmount);
                    await assertInHell(this.token, 0);
                    await assertRescued(this.token, 0);
                    await this.token.rescue(accountWithCacaos, { from: distributionAddresses[0] });                    
                    await assertBalanceOf(this.token, accountWithCacaos, 0);
                    await assertInCirculation(this.token, 0);
                    await assertInHell(this.token, creationAmount);
                    await assertRescued(this.token, creationAmount);
                    await assertTotalSupply(this.token, creationAmount);
                });
                describe('when rescue is called by an invalid address', function () {
                    it("reverts", async function () {
                        await assertRevert(this.token.rescue(accountWithCacaos, { from: creationAddresses[0] }));
                    });
                });
                describe('when the owner address calls registerTransaction', function () {
                    it("can't rescue", async function () {
                        await this.token.registerTransaction({ from: accountWithCacaos });
                        await assertRevert(this.token.rescue(accountWithCacaos, { from: distributionAddresses[0] }));
                    });
                });
                describe('when cacaos were rescued', function () {
                    it("can obliterate", async function () {
                        await this.token.rescue(accountWithCacaos, { from: distributionAddresses[0] });
                        await this.token.obliterateRescuedCacaos(creationAmount, { from: distributionAddresses[0] });
                        await assertBalanceOf(this.token, accountWithCacaos, 0);
                        await assertTotalSupply(this.token, 0);
                        await assertInCirculation(this.token, 0);
                        await assertInHell(this.token, 0);
                        await assertRescued(this.token, creationAmount);
                    });
                });
            });
            describe('when address does not have cacaos', function () {
                let accountWithoutCacaos = owner2;
                it("can't rescue", async function () {
                    await assertRevert(this.token.rescue(accountWithoutCacaos, { from: distributionAddresses[0] }));
                });
            });
            describe('when there are no cacaos to obliterate', function () {
                it("reverts", async function () {
                    await assertRevert(this.token.obliterateRescuedCacaos(creationAmount, { from: distributionAddresses[0] }));
                });
            });
        });
    });
});