import { caoToWei, createCoin, getNonce, getHashOfReplaceAddress, createAndDistributeCoin } from './helpers/helperMethods.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");
const CacaoRescueMock = artifacts.require("test/CacaoRescueMock.sol");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

async function assertIsCreator(contractInstance, address) {
    let isCreator = await contractInstance.isCreator(address);
    assert(isCreator, "Key should be a creator");
}

async function assertIsDistributor(contractInstance, address) {
    let isDistributor = await contractInstance.isDistributor(address);
    assert(isDistributor, "Key should be a distributor");
}

async function assertIsNotCreator(contractInstance, address) {
    let isCreator = await contractInstance.isCreator(address);
    assert(!isCreator, "Key should not be a creator");
}

async function assertIsNotDistributor(contractInstance, address) {
    let isDistributor = await contractInstance.isDistributor(address);
    assert(!isDistributor, "Key should not be a distributor");
}

async function replaceCreator(contractInstance, oldAddress, newAddress, nonce, signer0, signer1, signer2, transactionAddress) {
    let txHash = await getHashOfReplaceAddress(contractInstance, oldAddress, newAddress, nonce);
    let signature0 = web3.eth.sign(signer0, txHash);
    let signature1 = web3.eth.sign(signer1, txHash);
    let signature2 = web3.eth.sign(signer2, txHash);
    return contractInstance.replaceCreationAddress(
        oldAddress,
        newAddress,
        nonce,
        signer0,
        signature0,
        signer1,
        signature1,
        signer2,
        signature2,
        { from: transactionAddress });
}

async function replaceDistributor(contractInstance, oldAddress, newAddress, nonce, signer0, signer1, transactionAddress) {
    let txHash = await getHashOfReplaceAddress(contractInstance, oldAddress, newAddress, nonce);
    let signature0 = web3.eth.sign(signer0, txHash);
    let signature1 = web3.eth.sign(signer1, txHash);
    return contractInstance.replaceDistributionAddress(
        oldAddress,
        newAddress,
        nonce,
        signer0,
        signature0,
        signer1,
        signature1,
        { from: transactionAddress });
}

contract('KeyRing', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const delegatedTransferAddress = accounts[8];
    const delegatedTransferFee = caoToWei(1);
    const transactionAddress = accounts[15];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4], // Creation Addresses (Including msg.sender as #1)
            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2], // Distribution Addresses
            delegatedTransferAddress, delegatedTransferFee);
    });

    describe('lifecycle', function () {
        it("replaces creator", async function () {
            const oldAddress = creationAddresses[3];
            const newAddress = accounts[9];
            await assertIsCreator(this.token, oldAddress);
            await assertIsNotCreator(this.token, newAddress);
            // Replace
            let nonce = getNonce();
            let replacementTask = replaceCreator(
                this.token,
                oldAddress,
                newAddress,
                nonce,
                creationAddresses[0],
                creationAddresses[1],
                creationAddresses[2],
                transactionAddress);
            let replaceEvent = await inTransaction(replacementTask, 'Replaced');
            replaceEvent.args._originalAddress.should.be.equal(oldAddress);
            replaceEvent.args._newAddress.should.be.equal(newAddress);
            await assertIsCreator(this.token, newAddress);
            await assertIsNotCreator(this.token, oldAddress);
        });

        it("replaces distributor", async function () {
            const oldAddress = distributionAddresses[2];
            const newAddress = accounts[9];
            await assertIsDistributor(this.token, oldAddress);
            await assertIsNotDistributor(this.token, newAddress);

            // Replace!
            let nonce = getNonce();
            let replacementTask = replaceDistributor(
                this.token,
                oldAddress,
                newAddress,
                nonce,
                distributionAddresses[0],
                distributionAddresses[1],
                transactionAddress);

            let replaceEvent = await inTransaction(replacementTask, 'Replaced');
            replaceEvent.args._originalAddress.should.be.equal(oldAddress);
            replaceEvent.args._newAddress.should.be.equal(newAddress);
            await assertIsDistributor(this.token, newAddress);
            await assertIsNotDistributor(this.token, oldAddress);
        });
    });

    describe('replaceCreationAddress', function () {
        describe('when the signing addresses are creation addresses', async function () {
            describe('when valid signatures', function () {
                it('address is replaced, event is emmited.', async function () {
                    const oldAddress = creationAddresses[3];
                    const newAddress = accounts[9];
                    let nonce = getNonce();
                    let replacementTask = replaceCreator(
                        this.token,
                        oldAddress,
                        newAddress,
                        nonce,
                        creationAddresses[0],
                        creationAddresses[1],
                        creationAddresses[2],
                        transactionAddress);
                    let replaceEvent = await inTransaction(replacementTask, 'Replaced');
                    replaceEvent.args._originalAddress.should.be.equal(oldAddress);
                    replaceEvent.args._newAddress.should.be.equal(newAddress);
                    await assertIsCreator(this.token, newAddress);
                    await assertIsNotCreator(this.token, oldAddress);
                });
                describe('invalid old address (when replacing an unknown address)', function () {
                    it('reverts', async function () {
                        const oldAddress = accounts[10];
                        const newAddress = accounts[9];
                        let nonce = getNonce();
                        await assertRevert(replaceCreator(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress));
                    });
                });
                describe('invalid new address (when replacing to a already used address)', function () {
                    it('reverts', async function () {
                        const oldAddress = creationAddresses[3];
                        const newAddress = creationAddresses[4];
                        let nonce = getNonce();
                        await assertRevert(replaceCreator(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress));
                    });
                });
                describe('invalid new address (when replacing to a distributor address)', function () {
                    it('reverts', async function () {
                        const oldAddress = creationAddresses[3];
                        const newAddress = distributionAddresses[0];
                        let nonce = getNonce();
                        await assertRevert(replaceCreator(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress));
                    });
                });
                describe('old and new address is the same', function () {
                    it('reverts', async function () {
                        const oldAddress = creationAddresses[3];
                        const newAddress = creationAddresses[3];
                        let nonce = getNonce();
                        await assertRevert(replaceCreator(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress));
                    });
                });
                describe('signer is old address', function () {
                    it('reverts', async function () {
                        const oldAddress = creationAddresses[2];
                        const newAddress = accounts[9];
                        let nonce = getNonce();
                        await assertRevert(replaceCreator(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress));
                    });
                });
                describe('signer is new address', function () {
                    it('reverts', async function () {
                        const oldAddress = creationAddresses[3];
                        const newAddress = creationAddresses[2];
                        let nonce = getNonce();
                        await assertRevert(replaceCreator(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress));
                    });
                });
                describe('when repeated nonce', function () {
                    it('reverts', async function () {
                        const oldAddress = creationAddresses[3];
                        const newAddress = accounts[9];
                        let nonce = getNonce();
                        await replaceCreator(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress);
                        await assertRevert(replaceCreator(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress));
                        await assertRevert(replaceCreator(
                            this.token,
                            creationAddresses[2],
                            accounts[10],
                            nonce,
                            creationAddresses[0],
                            creationAddresses[1],
                            creationAddresses[2],
                            transactionAddress));
                    });
                });
            });
            describe('when invalid signatures', function () {
                it('reverts', async function () {
                    const oldAddress = creationAddresses[3];
                    const newAddress = accounts[9];
                    let nonce = getNonce();
                    let txHash = await getHashOfReplaceAddress(this.token, oldAddress, newAddress, nonce);
                    let signature0 = web3.eth.sign(creationAddresses[0], txHash);
                    let signature1 = web3.eth.sign(creationAddresses[1], txHash);
                    let signature2 = web3.eth.sign(creationAddresses[2], txHash);
                    await assertRevert(this.token.replaceCreationAddress(
                        oldAddress,
                        newAddress,
                        nonce,
                        creationAddresses[0],
                        signature0,
                        creationAddresses[1],
                        signature1,
                        creationAddresses[2],
                        "invalid-signature",
                        { from: transactionAddress }));
                });
            });
        });
        describe('when the signing addresses are not creation addresses', async function () {
            it('reverts', async function () {
                const oldAddress = creationAddresses[3];
                const newAddress = accounts[9];
                let nonce = getNonce();
                let txHash = await getHashOfReplaceAddress(this.token, oldAddress, newAddress, nonce);
                let signature0 = web3.eth.sign(creationAddresses[0], txHash);
                let signature1 = web3.eth.sign(creationAddresses[1], txHash);
                let signature2 = web3.eth.sign(distributionAddresses[0], txHash);
                await assertRevert(this.token.replaceCreationAddress(
                    oldAddress,
                    newAddress,
                    nonce,
                    creationAddresses[0],
                    signature0,
                    creationAddresses[1],
                    signature1,
                    creationAddresses[2],
                    signature2,
                    { from: transactionAddress }));
            });
        });
    });

    describe('replaceDistributionAddresses', function () {
        describe('when the signing addresses are distribution addresses', async function () {
            describe('when valid signatures', function () {
                it('address is replaced, event is emmited.', async function () {
                    const oldAddress = distributionAddresses[2];
                    const newAddress = accounts[9];
                    let nonce = getNonce();
                    let replacementTask = replaceDistributor(
                        this.token,
                        oldAddress,
                        newAddress,
                        nonce,
                        distributionAddresses[0],
                        distributionAddresses[1],
                        transactionAddress);
                    let replaceEvent = await inTransaction(replacementTask, 'Replaced');
                    replaceEvent.args._originalAddress.should.be.equal(oldAddress);
                    replaceEvent.args._newAddress.should.be.equal(newAddress);
                    await assertIsDistributor(this.token, newAddress);
                    await assertIsNotDistributor(this.token, oldAddress);
                });
                describe('invalid old address (when replacing an unknown address)', function () {
                    it('reverts', async function () {
                        const oldAddress = accounts[10];
                        const newAddress = accounts[9];
                        let nonce = getNonce();
                        await assertRevert(replaceDistributor(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress));
                    });
                });
                describe('invalid new address (when replacing to a already used address)', function () {
                    it('reverts', async function () {
                        const oldAddress = distributionAddresses[2];
                        const newAddress = distributionAddresses[1];
                        let nonce = getNonce();
                        await assertRevert(replaceDistributor(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress));
                    });
                });
                describe('invalid new address (when replacing to a creation address)', function () {
                    it('reverts', async function () {
                        const oldAddress = distributionAddresses[2];
                        const newAddress = creationAddresses[0];
                        let nonce = getNonce();
                        await assertRevert(replaceDistributor(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress));
                    });
                });
                describe('old and new address is the same', function () {
                    it('reverts', async function () {
                        const oldAddress = distributionAddresses[2];
                        const newAddress = distributionAddresses[2];
                        let nonce = getNonce();
                        await assertRevert(replaceDistributor(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress));
                    });
                });
                describe('signer is old address', function () {
                    it('reverts', async function () {
                        const oldAddress = distributionAddresses[1];
                        const newAddress = accounts[9];
                        let nonce = getNonce();
                        await assertRevert(replaceDistributor(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress));
                    });
                });
                describe('signer is new address', function () {
                    it('reverts', async function () {
                        const oldAddress = distributionAddresses[2];
                        const newAddress = distributionAddresses[1];
                        let nonce = getNonce();
                        await assertRevert(replaceDistributor(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress));
                    });
                });
                describe('when repeated nonce', function () {
                    it('reverts', async function () {
                        const oldAddress = distributionAddresses[2];
                        const newAddress = accounts[9];
                        let nonce = getNonce();
                        await replaceDistributor(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress);
                        await assertRevert(replaceDistributor(
                            this.token,
                            oldAddress,
                            newAddress,
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress));
                        await assertRevert(replaceDistributor(
                            this.token,
                            oldAddress,
                            accounts[10],
                            nonce,
                            distributionAddresses[0],
                            distributionAddresses[1],
                            transactionAddress));
                    });
                });
            });
            describe('when invalid signatures', function () {
                it('reverts', async function () {
                    const oldAddress = distributionAddresses[2];
                    const newAddress = accounts[9];
                    let nonce = getNonce();
                    let txHash = await getHashOfReplaceAddress(this.token, oldAddress, newAddress, nonce);
                    let signature0 = web3.eth.sign(distributionAddresses[0], txHash);
                    let signature1 = web3.eth.sign(distributionAddresses[1], txHash);
                    await assertRevert(this.token.replaceDistributionAddress(
                        oldAddress,
                        newAddress,
                        nonce,
                        distributionAddresses[0],
                        signature0,
                        distributionAddresses[1],
                        "invalid-signature",
                        { from: transactionAddress }));
                });
            });
        });
        describe('when the signing addresses are not distribution addresses', async function () {
            it('reverts', async function () {
                const oldAddress = distributionAddresses[2];
                const newAddress = accounts[9];
                let nonce = getNonce();
                let txHash = await getHashOfReplaceAddress(this.token, oldAddress, newAddress, nonce);
                let signature0 = web3.eth.sign(creationAddresses[0], txHash);
                let signature1 = web3.eth.sign(creationAddresses[1], txHash);
                await assertRevert(this.token.replaceDistributionAddress(
                    oldAddress,
                    newAddress,
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