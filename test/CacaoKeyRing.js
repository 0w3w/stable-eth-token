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

async function startReplacement(contractInstance, signAddress, message, oldAddress, newAddress, fromAddress) {
    const signature00 = signMessage(signAddress, message);
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

async function startBatchReplacement(contractInstance, signAddress, message, oldAddresses, newAddresses, fromAddress) {
    const signature00 = signMessage(signAddress, message);
    await contractInstance.replaceDistributionAddresses(
        signature00.address,
        signature00.hash,
        signature00.v,
        signature00.r,
        signature00.s,
        oldAddresses[0],
        oldAddresses[1],
        oldAddresses[2],
        newAddresses[0],
        newAddresses[1],
        newAddresses[2],
        { from: fromAddress });
}

contract('KeyRing', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const delegatedTransferAddress = accounts[8];
    const delegatedTransferFee = caoToWei(1);

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4], // Creation Addresses (Including msg.sender as #1)
            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2], // Distribution Addresses
            delegatedTransferAddress, delegatedTransferFee);
    });

    describe('lifecycle', function () {
        it("replaces creator", async function () {
            const oldCreationAddress = creationAddresses[0];
            const newCreationAddress = accounts[9];
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
                { from: accounts[12] });
            await assertIsReplacingAddresses(this.token);
            await assertIsCreator(this.token, oldCreationAddress);
            await assertIsNotCreator(this.token, newCreationAddress);

            // Vote to replace address
            const signature01 = signMessage(creationAddresses[1], "unique.message.1");
            await this.token.voteToReplaceAddress(
                signature01.address,
                signature01.hash,
                signature01.v,
                signature01.r,
                signature01.s,
                true,
                { from: accounts[12] });

            const signature02 = signMessage(creationAddresses[2], "unique.message.2");
            let confirmReplacementTask = this.token.voteToReplaceAddress(
                signature02.address,
                signature02.hash,
                signature02.v,
                signature02.r,
                signature02.s,
                true,
                { from: accounts[12] });
            let replaceEvent = await inTransaction(confirmReplacementTask, 'Replaced');
            replaceEvent.args._originalAddress.should.be.equal(oldCreationAddress);
            replaceEvent.args._newAddress.should.be.equal(newCreationAddress);

            await assertIsNotReplacingAddresses(this.token);
            await assertIsCreator(this.token, newCreationAddress);
            await assertIsNotCreator(this.token, oldCreationAddress);
        });

        it("replaces distributor", async function () {
            const oldAddress = distributionAddresses[0];
            const newAddress = accounts[9];
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
                { from: accounts[12] });
            await assertIsReplacingAddresses(this.token);
            await assertIsDistributor(this.token, oldAddress);
            await assertIsNotDistributor(this.token, newAddress);

            // Vote to replace address
            const signature01 = signMessage(distributionAddresses[1], "unique.message.1");
            let confirmReplacementTask = this.token.voteToReplaceAddress(
                signature01.address,
                signature01.hash,
                signature01.v,
                signature01.r,
                signature01.s,
                true,
                { from: accounts[12] });

            let replaceEvent = await inTransaction(confirmReplacementTask, 'Replaced');
            replaceEvent.args._originalAddress.should.be.equal(oldAddress);
            replaceEvent.args._newAddress.should.be.equal(newAddress);

            await assertIsNotReplacingAddresses(this.token);
            await assertIsDistributor(this.token, newAddress);
            await assertIsNotDistributor(this.token, oldAddress);
        });

        it("batch replace distributors", async function () {
            const newDistributionAddresses = [accounts[9], accounts[10], accounts[11]];
            await assertIsNotReplacingAddresses(this.token);
            await assertIsDistributor(this.token, distributionAddresses[0]);
            await assertIsDistributor(this.token, distributionAddresses[1]);
            await assertIsDistributor(this.token, distributionAddresses[2]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[0]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[1]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[2]);

            // Start Replacement
            const signature00 = signMessage(creationAddresses[0], "unique.message.0");
            await this.token.replaceDistributionAddresses(
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
            await this.token.confirmReplaceDistributionAddresses(
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
                { from: accounts[12] }); // Any account can do it.

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
        const senderAddress = accounts[12];
        describe('when valid _signatureAddress', function () {
            describe('when not replacing', function () {
                const newAddress = accounts[9];
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
                        const unknownOldAddress = accounts[10];
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
                    describe('when replacing to a already used address', function () {
                        it("to a creator address reverts", async function () {
                            it("reverts", async function () {
                                const usedAddress = creationAddresses[1];
                                await assertRevert(
                                    this.token.replaceAddress(
                                        signature00.address,
                                        signature00.hash,
                                        signature00.v,
                                        signature00.r,
                                        signature00.s,
                                        oldAddress,
                                        usedAddress,
                                        { from: senderAddress }));
                            });
                        });
                        it("to a distributor address reverts", async function () {
                            const usedAddress = distributionAddresses[1];
                            await assertRevert(
                                this.token.replaceAddress(
                                    signature00.address,
                                    signature00.hash,
                                    signature00.v,
                                    signature00.r,
                                    signature00.s,
                                    oldAddress,
                                    usedAddress,
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
                        const unknownOldAddress = accounts[10];
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
                let owner = accounts[9];
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
                        accounts[9],
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
                            accounts[10],
                            { from: senderAddress }));
                });
                describe('when startCreation', function () {
                    it("reverts", async function () {
                        await startReplacement(this.token, creationAddresses[0], "unique.message.0", creationAddresses[0], accounts[9], senderAddress);

                        await assertRevert(this.token.startCreation(creationAmount, { from: creationAddresses[0] }));
                    });
                });
                describe('when startDistribution', function () {
                    it("reverts", async function () {
                        await createCoin(this.token, creationAddresses, creationAmount);
                        await startReplacement(this.token, creationAddresses[0], "unique.message.0", creationAddresses[0], accounts[9], senderAddress);

                        await assertRevert(this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] }));
                    });
                });
                describe('when Destructing', function () {
                    it("reverts", async function () {
                        let destructionReference = "QWERY132456";
                        await createAndDistributeCoin(this.token, creationAddresses, distributionAddresses, creationAmount, owner);
                        await startReplacement(this.token, creationAddresses[0], "unique.message.0", creationAddresses[0], accounts[9], senderAddress);

                        await assertRevert(this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] }));
                    });
                });
                describe('when Rescuing', function () {
                    it("reverts", async function () {
                        let contractInstance = await CacaoRescueMock.new(
                            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4],
                            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2],
                            delegatedTransferAddress, delegatedTransferFee,
                            13140000); // 6 years of blocks
                        await createAndDistributeCoin(contractInstance, creationAddresses, distributionAddresses, creationAmount, owner);
                        await contractInstance.registerTransactionBlockNumber(owner, 1095000); // 5.5 years ago
                        await startReplacement(contractInstance, creationAddresses[0], "unique.message.0", creationAddresses[0], accounts[10], senderAddress);

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
                            accounts[10],
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
                            accounts[10],
                            { from: senderAddress }));
                });
            });
        });
    });

    describe('voteToReplaceAddress', function () {
        // Any account can do it.
        const senderAddress = accounts[12];
        describe('when valid _signatureAddress', function () {
            describe('when no process is active', function () {
                it("reverts", async function () {
                    const signature = signMessage(creationAddresses[1], "unique.message.2");
                    await assertRevert(
                        this.token.voteToReplaceAddress(
                            signature.address,
                            signature.hash,
                            signature.v,
                            signature.r,
                            signature.s,
                            true,
                            { from: senderAddress }));
                });
            });
            describe('when a batch replacement is active', function () {
                it("reverts", async function () {
                    const newDistributionAddresses = [accounts[9], accounts[10], accounts[11]];
                    const signature00 = signMessage(creationAddresses[0], "unique.message.2");
                    await this.token.replaceDistributionAddresses(
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
                        { from: senderAddress });
                    const signature = signMessage(creationAddresses[1], "unique.message.3");
                    await assertRevert(
                        this.token.voteToReplaceAddress(
                            signature.address,
                            signature.hash,
                            signature.v,
                            signature.r,
                            signature.s,
                            true,
                            { from: senderAddress }));
                });
            });
            describe('when an address replacement is active', function () {
                const oldAddress = creationAddresses[0];
                const newAddress = accounts[9];
                beforeEach('setup contract for each test', async function () {
                    await startReplacement(this.token, creationAddresses[0], "unique.message.0", oldAddress, newAddress, senderAddress);
                });
                describe('majority has not being achieved.', function () {
                    it('succeeds and no event is emmited.', async function () {
                        const signature01 = signMessage(creationAddresses[1], "unique.message.1");
                        let voteTask = this.token.voteToReplaceAddress(
                            signature01.address,
                            signature01.hash,
                            signature01.v,
                            signature01.r,
                            signature01.s,
                            true,
                            { from: senderAddress });

                        await notInTransaction(voteTask, 'Replaced');
                        await assertIsReplacingAddresses(this.token);
                        await assertIsCreator(this.token, oldAddress);
                        await assertIsNotCreator(this.token, newAddress);
                    });
                });
                describe('majority has being achieved in favor.', function () {
                    it('address is replaced, event is emmited.', async function () {
                        const signature01 = signMessage(creationAddresses[1], "unique.message.1");
                        await this.token.voteToReplaceAddress(
                            signature01.address,
                            signature01.hash,
                            signature01.v,
                            signature01.r,
                            signature01.s,
                            true,
                            { from: senderAddress });
                        const signature02 = signMessage(creationAddresses[2], "unique.message.2");
                        let voteTask = this.token.voteToReplaceAddress(
                            signature02.address,
                            signature02.hash,
                            signature02.v,
                            signature02.r,
                            signature02.s,
                            true,
                            { from: senderAddress });

                        let replaceEvent = await inTransaction(voteTask, 'Replaced');
                        replaceEvent.args._originalAddress.should.be.equal(oldAddress);
                        replaceEvent.args._newAddress.should.be.equal(newAddress);
                        await assertIsNotReplacingAddresses(this.token);
                        await assertIsCreator(this.token, newAddress);
                        await assertIsNotCreator(this.token, oldAddress);
                    });
                });
                describe('majority has being achieved against.', function () {
                    it('address is not replaced, event is not emmited.', async function () {
                        const signature01 = signMessage(creationAddresses[1], "unique.message.1");
                        await this.token.voteToReplaceAddress(
                            signature01.address,
                            signature01.hash,
                            signature01.v,
                            signature01.r,
                            signature01.s,
                            false,
                            { from: senderAddress });
                        const signature02 = signMessage(creationAddresses[2], "unique.message.2");
                        await this.token.voteToReplaceAddress(
                            signature02.address,
                            signature02.hash,
                            signature02.v,
                            signature02.r,
                            signature02.s,
                            false,
                            { from: senderAddress });
                        const signature03 = signMessage(creationAddresses[3], "unique.message.3");
                        let voteTask = this.token.voteToReplaceAddress(
                            signature03.address,
                            signature03.hash,
                            signature03.v,
                            signature03.r,
                            signature03.s,
                            false,
                            { from: senderAddress });

                        await notInTransaction(voteTask, 'Replaced');
                        await assertIsNotReplacingAddresses(this.token);
                        await assertIsCreator(this.token, oldAddress);
                        await assertIsNotCreator(this.token, newAddress);
                    });
                });
                describe('when already voted', function () {
                    it("reverts", async function () {
                        const signature01 = signMessage(creationAddresses[1], "unique.message.1");
                        await this.token.voteToReplaceAddress(
                            signature01.address,
                            signature01.hash,
                            signature01.v,
                            signature01.r,
                            signature01.s,
                            true,
                            { from: senderAddress });
                        const signature02 = signMessage(creationAddresses[1], "unique.message.2");
                        await assertRevert(
                            this.token.voteToReplaceAddress(
                                signature02.address,
                                signature02.hash,
                                signature02.v,
                                signature02.r,
                                signature02.s,
                                true,
                                { from: senderAddress }));

                        await assertIsReplacingAddresses(this.token);
                        await assertIsCreator(this.token, oldAddress);
                        await assertIsNotCreator(this.token, newAddress);
                    });
                });
            });
        });
        describe('when invalid _signatureAddress', function () {
            describe('when _signatureAddress does not match the replacement type', function () {
                const signature = signMessage(distributionAddresses[1], "unique.message.2");
                it("reverts", async function () {
                    await assertRevert(
                        this.token.voteToReplaceAddress(
                            signature.address,
                            signature.hash,
                            signature.v,
                            signature.r,
                            signature.s,
                            true,
                            { from: senderAddress }));
                });
            });
            describe('when signature is invalid', function () {
                it("reverts", async function () {
                    const invalidHash = "0x5481c0fe170641bd2e0ff7f04161871829c1902d";
                    const signature = signMessage(creationAddresses[1], "unique.message.2");
                    await assertRevert(
                        this.token.voteToReplaceAddress(
                            signature.address,
                            invalidHash,
                            signature.v,
                            signature.r,
                            signature.s,
                            true,
                            { from: senderAddress }));
                });
            });
        });
    });

    describe('replaceDistributionAddresses', function () {
        // Any account can do it.
        const senderAddress = accounts[12];
        const newDistributionAddresses = [accounts[9], accounts[10], accounts[11]];

        beforeEach('initial assertions before for each test', async function () {
            await assertIsNotReplacingAddresses(this.token);
            await assertIsDistributor(this.token, distributionAddresses[0]);
            await assertIsDistributor(this.token, distributionAddresses[1]);
            await assertIsDistributor(this.token, distributionAddresses[2]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[0]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[1]);
            await assertIsNotDistributor(this.token, newDistributionAddresses[2]);
        });

        describe('when valid _signatureAddress', function () {
            const signature00 = signMessage(creationAddresses[0], "unique.message.0");
            describe('when not replacing', function () {
                describe('when replacing valid distribution addresses', function () {
                    it("starts replacement process", async function () {
                        await this.token.replaceDistributionAddresses(
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
                            { from: senderAddress });
                        await assertIsReplacingAddresses(this.token);
                        await assertIsDistributor(this.token, distributionAddresses[0]);
                        await assertIsDistributor(this.token, distributionAddresses[1]);
                        await assertIsDistributor(this.token, distributionAddresses[2]);
                        await assertIsNotDistributor(this.token, newDistributionAddresses[0]);
                        await assertIsNotDistributor(this.token, newDistributionAddresses[1]);
                        await assertIsNotDistributor(this.token, newDistributionAddresses[2]);
                    });
                    describe('when replacing to an already used address', function () {
                        it("reverts", async function () {
                            const usedAddress = distributionAddresses[1];
                            await assertRevert(
                                this.token.replaceDistributionAddresses(
                                    signature00.address,
                                    signature00.hash,
                                    signature00.v,
                                    signature00.r,
                                    signature00.s,
                                    distributionAddresses[0],
                                    distributionAddresses[1],
                                    distributionAddresses[2],
                                    distributionAddresses[0],
                                    distributionAddresses[1],
                                    distributionAddresses[2],
                                    { from: senderAddress }));
                        });
                    });
                });
                describe('when replacing an unknown distribution address', function () {
                    const unknownDistributionAddresses = [accounts[12], accounts[13], accounts[14]];
                    it("reverts", async function () {
                        await assertRevert(
                            this.token.replaceDistributionAddresses(
                                signature00.address,
                                signature00.hash,
                                signature00.v,
                                signature00.r,
                                signature00.s,
                                unknownDistributionAddresses[0],
                                unknownDistributionAddresses[1],
                                unknownDistributionAddresses[2],
                                newDistributionAddresses[0],
                                newDistributionAddresses[1],
                                newDistributionAddresses[2],
                                { from: senderAddress }));
                    });
                });
                describe('when _signatureAddress is not a creator adress', function () {
                    const validSignatureInvalidType = signMessage(distributionAddresses[1], "unique.message.2");
                    it("reverts", async function () {
                        await assertRevert(
                            this.token.replaceDistributionAddresses(
                                validSignatureInvalidType.address,
                                validSignatureInvalidType.hash,
                                validSignatureInvalidType.v,
                                validSignatureInvalidType.r,
                                validSignatureInvalidType.s,
                                distributionAddresses[0],
                                distributionAddresses[1],
                                distributionAddresses[2],
                                newDistributionAddresses[0],
                                newDistributionAddresses[1],
                                newDistributionAddresses[2],
                                { from: senderAddress }));
                    });
                });
            });
            describe('when already replacing', function () {
                const secondRoundOfNewDistAddresses = [accounts[12], accounts[13], accounts[14]];
                let owner = accounts[9];
                let creationAmount = caoToWei(1000);
                let initialAmountToDistribute = caoToWei(100);
                it("reverts", async function () {
                    await startBatchReplacement(this.token, creationAddresses[0], "unique.message.1", distributionAddresses, newDistributionAddresses, senderAddress);
                    await assertIsReplacingAddresses(this.token);

                    await assertRevert(
                        this.token.replaceDistributionAddresses(
                            signature00.address,
                            signature00.hash,
                            signature00.v,
                            signature00.r,
                            signature00.s,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            distributionAddresses[2],
                            secondRoundOfNewDistAddresses[0],
                            secondRoundOfNewDistAddresses[1],
                            secondRoundOfNewDistAddresses[2],
                            { from: senderAddress }));
                });

                describe('when startCreation', function () {
                    it("reverts", async function () {
                        await startBatchReplacement(this.token, creationAddresses[0], "unique.message.1", distributionAddresses, newDistributionAddresses, senderAddress);
                        await assertIsReplacingAddresses(this.token);
                        await assertRevert(this.token.startCreation(creationAmount, { from: creationAddresses[0] }));
                    });
                });
                describe('when startDistribution', function () {
                    it("reverts", async function () {
                        await createCoin(this.token, creationAddresses, creationAmount);
                        await startBatchReplacement(this.token, creationAddresses[0], "unique.message.1", distributionAddresses, newDistributionAddresses, senderAddress);
                        await assertIsReplacingAddresses(this.token);
                        await assertRevert(this.token.startDistribution(owner, initialAmountToDistribute, { from: distributionAddresses[0] }));
                    });
                });
                describe('when Destructing', function () {
                    it("reverts", async function () {
                        let destructionReference = "QWERY132456";
                        await createAndDistributeCoin(this.token, creationAddresses, distributionAddresses, creationAmount, owner);
                        await startBatchReplacement(this.token, creationAddresses[0], "unique.message.1", distributionAddresses, newDistributionAddresses, senderAddress);
                        await assertIsReplacingAddresses(this.token);
                        await assertRevert(this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] }));
                    });
                });
                describe('when Rescuing', function () {
                    it("reverts", async function () {
                        let contractInstance = await CacaoRescueMock.new(
                            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4],
                            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2],
                            delegatedTransferAddress, delegatedTransferFee,
                            13140000); // 6 years of blocks
                        await createAndDistributeCoin(contractInstance, creationAddresses, distributionAddresses, creationAmount, owner);
                        await contractInstance.registerTransactionBlockNumber(owner, 1095000); // 5.5 years ago

                        await startBatchReplacement(contractInstance, creationAddresses[0], "unique.message.1", distributionAddresses, newDistributionAddresses, senderAddress);
                        await assertIsReplacingAddresses(contractInstance);

                        await assertRevert(contractInstance.rescue(owner, { from: distributionAddresses[0] }));
                    });
                });
            });
        });

        describe('when invalid _signatureAddress', function () {
            it("reverts", async function () {
                const invalidHash = "0x5481c0fe170641bd2e0ff7f04161871829c1902d";
                const signature = signMessage(creationAddresses[1], "unique.message.2");
                await assertRevert(this.token.replaceDistributionAddresses(
                    signature.address,
                    invalidHash,
                    signature.v,
                    signature.r,
                    signature.s,
                    distributionAddresses[0],
                    distributionAddresses[1],
                    distributionAddresses[2],
                    newDistributionAddresses[0],
                    newDistributionAddresses[1],
                    newDistributionAddresses[2],
                    { from: senderAddress }));
            });
        });
    });

    describe('confirmReplaceDistributionAddresses', function () {
        // Any account can do it.
        const senderAddress = accounts[12];
        const newDistributionAddresses = [accounts[9], accounts[10], accounts[11]];
        describe('when batch replacement process is active', function () {
            beforeEach('start batch replacement', async function () {
                await startBatchReplacement(this.token, creationAddresses[0], "unique.message.1", distributionAddresses, newDistributionAddresses, senderAddress);
                await assertIsReplacingAddresses(this.token);
            });

            describe('when valid signatures', function () {
                it("addresses are replaced, event is emmited.", async function () {
                    const signature01 = signMessage(creationAddresses[1], "unique.message.2");
                    const signature02 = signMessage(creationAddresses[2], "unique.message.3");
                    await this.token.confirmReplaceDistributionAddresses(
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
                        { from: senderAddress });

                    await assertIsNotReplacingAddresses(this.token);
                    await assertIsDistributor(this.token, newDistributionAddresses[0]);
                    await assertIsDistributor(this.token, newDistributionAddresses[1]);
                    await assertIsDistributor(this.token, newDistributionAddresses[2]);
                    await assertIsNotDistributor(this.token, distributionAddresses[0]);
                    await assertIsNotDistributor(this.token, distributionAddresses[1]);
                    await assertIsNotDistributor(this.token, distributionAddresses[2]);
                });

                describe('are not creator addresses', function () {
                    it("reverts", async function () {
                        const signature01 = signMessage(distributionAddresses[1], "unique.message.2");
                        const signature02 = signMessage(distributionAddresses[2], "unique.message.3");
                        await assertRevert(
                            this.token.confirmReplaceDistributionAddresses(
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
                                { from: senderAddress }));
                    });
                });

                describe('when signatures are the same', function () {
                    it("reverts", async function () {
                        const signature01 = signMessage(creationAddresses[1], "unique.message.1");
                        await assertRevert(
                            this.token.confirmReplaceDistributionAddresses(
                                signature01.address,
                                signature01.hash,
                                signature01.v,
                                signature01.r,
                                signature01.s,
                                signature01.address,
                                signature01.hash,
                                signature01.v,
                                signature01.r,
                                signature01.s,
                                { from: senderAddress }));
                    });
                });

                describe('when signatures are the same as the address that initiated the replacement process', function () {
                    it("reverts", async function () {
                        const signature01 = signMessage(creationAddresses[0], "unique.message.2");
                        const signature02 = signMessage(creationAddresses[1], "unique.message.3");
                        await assertRevert(
                            this.token.confirmReplaceDistributionAddresses(
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
                                { from: senderAddress }));
                    });
                });
            });

            describe('when signatures hashes do not match (invalid signature)', function () {
                it("reverts", async function () {
                    const signature01 = signMessage(creationAddresses[1], "unique.message.2");
                    const signature02 = signMessage(creationAddresses[2], "unique.message.3");
                    const invalidHash = "0x5481c0fe170641bd2e0ff7f04161871829c1902d";
                    await assertRevert(this.token.confirmReplaceDistributionAddresses(
                        signature01.address,
                        invalidHash,
                        signature01.v,
                        signature01.r,
                        signature01.s,
                        signature02.address,
                        signature02.hash,
                        signature02.v,
                        signature02.r,
                        signature02.s,
                        { from: senderAddress }));
                });
            });
        });

        describe('when no process is active', function () {
            it("reverts", async function () {
                const signature01 = signMessage(creationAddresses[1], "unique.message.2");
                const signature02 = signMessage(creationAddresses[2], "unique.message.3");
                await assertRevert(
                    this.token.confirmReplaceDistributionAddresses(
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
                        { from: senderAddress }));
            });
        });

        describe('when simple address replacement process is active', function () {
            it("reverts", async function () {
                const oldCreationAddress = creationAddresses[0];
                const newCreationAddress = accounts[9];
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
                    { from: accounts[12] });
                await assertIsReplacingAddresses(this.token);
                await assertIsCreator(this.token, oldCreationAddress);
                await assertIsNotCreator(this.token, newCreationAddress);

                // This should revert
                const signature01 = signMessage(creationAddresses[1], "unique.message.2");
                const signature02 = signMessage(creationAddresses[2], "unique.message.3");
                await assertRevert(
                    this.token.confirmReplaceDistributionAddresses(
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
                        { from: senderAddress }));
            });
        });
    });

    describe('cancelReplacementOfDistributionAddresses', function () {
        // Any account can do it.
        const senderAddress = accounts[12];
        const newDistributionAddresses = [accounts[9], accounts[10], accounts[11]];
        describe('when theres a process to cancel', function () {
            beforeEach('initial assertions before for each test', async function () {
                await startBatchReplacement(this.token, creationAddresses[0], "unique.message.0", distributionAddresses, newDistributionAddresses, senderAddress);
                await assertIsReplacingAddresses(this.token);
            });

            describe('when creator address is sent', function () {
                describe('when valid signature', function () {
                    describe('when creator address is the init address', function () {
                        it("cancels the process", async function () {
                            const signature01 = signMessage(creationAddresses[0], "unique.message.1");
                            await this.token.cancelReplacementOfDistributionAddresses(
                                signature01.address,
                                signature01.hash,
                                signature01.v,
                                signature01.r,
                                signature01.s,
                                { from: senderAddress });

                            await assertIsNotReplacingAddresses(this.token);
                            await assertIsDistributor(this.token, distributionAddresses[0]);
                            await assertIsDistributor(this.token, distributionAddresses[1]);
                            await assertIsDistributor(this.token, distributionAddresses[2]);
                            await assertIsNotDistributor(this.token, newDistributionAddresses[0]);
                            await assertIsNotDistributor(this.token, newDistributionAddresses[1]);
                            await assertIsNotDistributor(this.token, newDistributionAddresses[2]);
                        });
                        describe('when creator address is not the init address', function () {
                            const validSignatureInvalidAddress = signMessage(creationAddresses[1], "unique.message.1");
                            it("reverts", async function () {
                                await assertRevert(
                                    this.token.cancelReplacementOfDistributionAddresses(
                                        validSignatureInvalidAddress.address,
                                        validSignatureInvalidAddress.hash,
                                        validSignatureInvalidAddress.v,
                                        validSignatureInvalidAddress.r,
                                        validSignatureInvalidAddress.s,
                                        { from: senderAddress }));
                            });
                        });
                    });
                });
                describe('when invalid signature', function () {
                    const validSignatureInvalidAddress = signMessage(creationAddresses[1], "unique.message.1");
                    const invalidHash = "0x5481c0fe170641bd2e0ff7f04161871829c1902d";
                    it("reverts", async function () {
                        await assertRevert(
                            this.token.cancelReplacementOfDistributionAddresses(
                                validSignatureInvalidAddress.address,
                                invalidHash,
                                validSignatureInvalidAddress.v,
                                validSignatureInvalidAddress.r,
                                validSignatureInvalidAddress.s,
                                { from: senderAddress }));
                    });
                });
            });
        });
        describe('when no process to cancel', function () {
            it("reverts", async function () {
                const signature01 = signMessage(creationAddresses[0], "unique.message.1");
                await assertRevert(
                    this.token.cancelReplacementOfDistributionAddresses(
                        signature01.address,
                        signature01.hash,
                        signature01.v,
                        signature01.r,
                        signature01.s,
                        { from: senderAddress }));
            });
        });
    });
});