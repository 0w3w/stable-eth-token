import { caoToWei, createCoin, distributeCoin, signMessage, createAndDistributeCoin } from './helpers/helperMethods.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");
const CacaoRescueMock = artifacts.require("test/CacaoRescueMock.sol");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

async function assertIsReplacingAddresses(contractInstance) {
    let isReplacing = await contractInstance.isReplacingAddresses();
    assert(isReplacing, "Should be replacing addresses");
}

async function assertIsCreator(contractInstance, address) {
    let isCreator = await contractInstance.isCreator(address);
    assert(isCreator, "Key should be a creator");
}

async function assertIsDistributor(contractInstance, address) {
    let isDistributor = await contractInstance.isDistributor(address);
    assert(isDistributor, "Key should be a distributor");
}

async function assertIsNotReplacingAddresses(contractInstance) {
    let isReplacing = await contractInstance.isReplacingAddresses();
    assert(!isReplacing, "Should not be replacing addresses");
}

async function assertIsNotCreator(contractInstance, address) {
    let isCreator = await contractInstance.isCreator(address);
    assert(!isCreator, "Key should not be a creator");
}

async function assertIsNotDistributor(contractInstance, address) {
    let isDistributor = await contractInstance.isDistributor(address);
    assert(!isDistributor, "Key should not be a distributor");
}

async function startReplacement(contractInstance, signAddresses, message, oldAddress, newAddress, fromAddress) {
    const signature00 = signMessage(signAddresses, message);
    await contractInstance.replaceAddress(
        signature00.address,
        signature00.hash,
        signature00.v,
        signature00.r,
        signature00.s,
        oldAddress,
        newAddress,
        { from: fromAddress });
}

contract('KeyRing', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const creationAmount = caoToWei(100);

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4], // Creation Addresses (Including msg.sender as #1)
            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2]); // Distribution Addresses
    });

    describe('lifecycle', function () {
        it("replaces creator", async function () {
            const oldCreationAddress = creationAddresses[0];
            const newCreationAddress = accounts[8];
            await assertIsNotReplacingAddresses(this.token);
            await assertIsCreator(this.token, oldCreationAddress);
            await assertIsNotCreator(this.token, newCreationAddress);

            // Start Replacement (Replace Myself?)
            const signature00 = signMessage(creationAddresses[0], "unique.message.0");
            await this.token.replaceAddress(
                signature00.address,
                signature00.hash,
                signature00.v,
                signature00.r,
                signature00.s,
                oldCreationAddress,
                newCreationAddress,
                { from: accounts[11] });
            await assertIsReplacingAddresses(this.token);
            await assertIsCreator(this.token, oldCreationAddress);
            await assertIsNotCreator(this.token, newCreationAddress);

            // Vote to replace address
            await this.token.voteToReplaceAddress(true, { from: creationAddresses[1] });
            let confirmReplacementTask = this.token.voteToReplaceAddress(true, { from: creationAddresses[2] });
            let replaceEvent = await inTransaction(confirmReplacementTask, 'Replaced');
            replaceEvent.args._originalAddress.should.be.equal(oldCreationAddress);
            replaceEvent.args._newAddress.should.be.equal(newCreationAddress);

            await assertIsNotReplacingAddresses(this.token);
            await assertIsCreator(this.token, newCreationAddress);
            await assertIsNotCreator(this.token, oldCreationAddress);
        });

        it("replaces distributor", async function () {
            const oldAddress = distributionAddresses[0];
            const newAddress = accounts[8];
            await assertIsNotReplacingAddresses(this.token);
            await assertIsDistributor(this.token, oldAddress);
            await assertIsNotDistributor(this.token, newAddress);

            // Start Replacement
            const signature00 = signMessage(distributionAddresses[0], "unique.message.0");
            await this.token.replaceAddress(
                signature00.address,
                signature00.hash,
                signature00.v,
                signature00.r,
                signature00.s,
                oldAddress,
                newAddress,
                { from: accounts[11] });
            await assertIsReplacingAddresses(this.token);
            await assertIsDistributor(this.token, oldAddress);
            await assertIsNotDistributor(this.token, newAddress);

            // Vote to replace address
            let confirmReplacementTask = this.token.voteToReplaceAddress(true, { from: distributionAddresses[1] });
            let replaceEvent = await inTransaction(confirmReplacementTask, 'Replaced');
            replaceEvent.args._originalAddress.should.be.equal(oldAddress);
            replaceEvent.args._newAddress.should.be.equal(newAddress);

            await assertIsNotReplacingAddresses(this.token);
            await assertIsDistributor(this.token, newAddress);
            await assertIsNotDistributor(this.token, oldAddress);
        });

        it("batch replace distributors", async function () {
            const newDistributionAddresses = [accounts[8], accounts[9], accounts[10]];
            await assertIsNotReplacingAddresses(this.token);
            await assertIsDistributor(this.token, distributionAddresses[0]);
            await assertIsDistributor(this.token, distributionAddresses[1]);
            await assertIsDistributor(this.token, distributionAddresses[2]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[0]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[1]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[2]);

            // Start Replacement
            const signature00 = signMessage(creationAddresses[0], "unique.message.0");
            await this.token.resetDistributionAddresses(
                signature00.address,
                signature00.hash,
                signature00.v,
                signature00.r,
                signature00.s,
                distributionAddresses[0],
                distributionAddresses[1],
                distributionAddresses[2],
                newDistributionAddresses[0],
                newDistributionAddresses[1],
                newDistributionAddresses[2],
                { from: creationAddresses[0] });
            await assertIsReplacingAddresses(this.token);
            await assertIsDistributor(this.token, distributionAddresses[0]);
            await assertIsDistributor(this.token, distributionAddresses[1]);
            await assertIsDistributor(this.token, distributionAddresses[2]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[0]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[1]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[2]);

            // Vote to replace address (Whoever can call that function)
            const signature01 = signMessage(creationAddresses[1], "unique.message.1");
            const signature02 = signMessage(creationAddresses[2], "unique.message.2");
            await this.token.confirmBatchReset(
                signature01.address,
                signature01.hash,
                signature01.v,
                signature01.r,
                signature01.s,
                signature02.address,
                signature02.hash,
                signature02.v,
                signature02.r,
                signature02.s,
                { from: accounts[11] });

            await assertIsNotReplacingAddresses(this.token);
            await assertIsDistributor(this.token, newDistributionAddresses[0]);
            await assertIsDistributor(this.token, newDistributionAddresses[1]);
            await assertIsDistributor(this.token, newDistributionAddresses[2]);
            await assertIsNotDistributor(this.token, distributionAddresses[0]);
            await assertIsNotDistributor(this.token, distributionAddresses[1]);
            await assertIsNotDistributor(this.token, distributionAddresses[2]);
        });
    });

    describe('replaceAddress', function () {
        // Any account can do it.
        const senderAddress = accounts[11];
        describe('when valid _signatureAddress', function () {
            describe('when not replacing', function () {
                const newAddress = accounts[8];
                describe('when replacing a creator address', function () {
                    const signature00 = signMessage(creationAddresses[0], "unique.message.0");
                    const oldAddress = creationAddresses[0];
                    it("starts replacement process", async function () {
                        await assertIsNotReplacingAddresses(this.token);
                        await assertIsCreator(this.token, oldAddress);
                        await assertIsNotCreator(this.token, newAddress);
                        await this.token.replaceAddress(
                            signature00.address,
                            signature00.hash,
                            signature00.v,
                            signature00.r,
                            signature00.s,
                            oldAddress,
                            newAddress,
                            { from: senderAddress });
                        await assertIsReplacingAddresses(this.token);
                        await assertIsCreator(this.token, oldAddress);
                        await assertIsNotCreator(this.token, newAddress);
                    });
                    describe('when replacing an unknown address', function () {
                        const unknownOldAddress = accounts[9];
                        it("reverts", async function () {
                            await assertRevert(
                                this.token.replaceAddress(
                                    signature00.address,
                                    signature00.hash,
                                    signature00.v,
                                    signature00.r,
                                    signature00.s,
                                    unknownOldAddress,
                                    newAddress,
                                    { from: senderAddress }));
                        });
                    });
                });
                describe('when replacing a distributor address', function () {
                    const signature00 = signMessage(distributionAddresses[0], "unique.message.0");
                    const oldAddress = distributionAddresses[0];
                    it("starts replacement process", async function () {
                        await assertIsNotReplacingAddresses(this.token);
                        await assertIsDistributor(this.token, oldAddress);
                        await assertIsNotDistributor(this.token, newAddress);
                        await this.token.replaceAddress(
                            signature00.address,
                            signature00.hash,
                            signature00.v,
                            signature00.r,
                            signature00.s,
                            oldAddress,
                            newAddress,
                            { from: senderAddress });
                        await assertIsReplacingAddresses(this.token);
                        await assertIsDistributor(this.token, oldAddress);
                        await assertIsNotDistributor(this.token, newAddress);
                    });
                    describe('when replacing an unknown address', function () {
                        const unknownOldAddress = accounts[9];
                        it("reverts", async function () {
                            await assertRevert(
                                this.token.replaceAddress(
                                    signature00.address,
                                    signature00.hash,
                                    signature00.v,
                                    signature00.r,
                                    signature00.s,
                                    unknownOldAddress,
                                    newAddress,
                                    { from: senderAddress }));
                        });
                    });
                });
            });
            describe('when already replacing', function () {
                let owner = accounts[8];
                let creationAmount = caoToWei(1000);
                let initialAmountToDistribute = caoToWei(100);
                it("reverts", async function () {
                    const signature00 = signMessage(creationAddresses[0], "unique.message.0");
                    await this.token.replaceAddress(
                        signature00.address,
                        signature00.hash,
                        signature00.v,
                        signature00.r,
                        signature00.s,
                        creationAddresses[0],
                        accounts[8],
                        { from: senderAddress });
                    const signature02 = signMessage(creationAddresses[1], "unique.message.1");
                    await assertRevert(
                        this.token.replaceAddress(
                            signature02.address,
                            signature02.hash,
                            signature02.v,
                            signature02.r,
                            signature02.s,
                            creationAddresses[1],
                            accounts[9],
                            { from: senderAddress }));
                });
                describe('when startCreation', function () {
                    it("reverts", async function () {
                        await startReplacement(this.token, creationAddresses[0], "unique.message.0", creationAddresses[0], accounts[8], senderAddress);

                        await assertRevert(this.token.startCreation(creationAmount, { from: creationAddresses[0] }));
                    });
                });
                describe('when startDistribution', function () {
                    it("reverts", async function () {
                        await createCoin(this.token, creationAddresses, creationAmount);
                        await startReplacement(this.token, creationAddresses[0], "unique.message.0", creationAddresses[0], accounts[8], senderAddress);

                        await assertRevert(this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] }));
                    });
                });
                describe('when Destructing', function () {
                    it("reverts", async function () {
                        let destructionReference = "QWERY132456";
                        await createAndDistributeCoin(this.token, creationAddresses, distributionAddresses, creationAmount, owner);
                        await startReplacement(this.token, creationAddresses[0], "unique.message.0", creationAddresses[0], accounts[8], senderAddress);

                        await assertRevert(this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] }));
                    });
                });
                describe('when Rescuing', function () {
                    it("reverts", async function () {
                        let contractInstance = await CacaoRescueMock.new(
                            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4],
                            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2],
                            13140000); // 6 years of blocks
                        await createAndDistributeCoin(contractInstance, creationAddresses, distributionAddresses, creationAmount, owner);
                        await contractInstance.registerTransactionBlockNumber(owner, 1095000); // 5.5 years ago
                        await startReplacement(contractInstance, creationAddresses[0], "unique.message.0", creationAddresses[0], accounts[9], senderAddress);

                        await assertRevert(contractInstance.rescue(owner, { from: distributionAddresses[0] }));
                    });
                });
            });
        });
        describe('when invalid _signatureAddress', function () {
            const creationSignature = signMessage(creationAddresses[0], "unique.message.0");
            describe('when _signatureAddress does not match the replacement type', function () {
                it("reverts", async function () {
                    await assertRevert(
                        this.token.replaceAddress(
                            creationSignature.address,
                            creationSignature.hash,
                            creationSignature.v,
                            creationSignature.r,
                            creationSignature.s,
                            distributionAddresses[1],
                            accounts[9],
                            { from: senderAddress }));
                });
            });
            describe('when signature is invalid', function () {
                it("reverts", async function () {
                    const invalidHash = "0x5481c0fe170641bd2e0ff7f04161871829c1902d";
                    await assertRevert(
                        this.token.replaceAddress(
                            creationSignature.address,
                            invalidHash,
                            creationSignature.v,
                            creationSignature.r,
                            creationSignature.s,
                            creationAddresses[1],
                            accounts[9],
                            { from: senderAddress }));
                });
            });
        });
    });
});