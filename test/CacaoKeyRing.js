import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction, notInTransaction } from './helpers/expectEvent.js';
import { caoToWei } from './helpers/helperMethods.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

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

// eth_sign calculated the signature over keccak256("\x19Ethereum Signed Message:\n" + len(givenMessage) + givenMessage)))
// this gives context to a signature and prevents signing of transactions.
function messageHash(msg) {
	return web3.sha3('\x19Ethereum Signed Message:\n' + msg.length + msg);
}

function signMessage(address, message) {
    const messageHex = '0x' + Buffer.from(message).toString('hex');
    const signature = web3.eth.sign(address, messageHex);
    var r = signature.slice(0, 66)
    var s = '0x' + signature.slice(66, 130)
    var v = '0x' + signature.slice(130, 132)

    return {
        signature: signature,
        messageHex: messageHex,
        address : address,
        hash: (new String(messageHash(message))).valueOf(), // Appended with Ethereum Signed Message
        r : (new String(r)).valueOf(),
        s : (new String(s)).valueOf(),
        v : (web3.toDecimal(v) + 27)
    };
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
                { from:  accounts[11] });
            await assertIsReplacingAddresses(this.token);
            await assertIsCreator(this.token, oldCreationAddress);
            await assertIsNotCreator(this.token, newCreationAddress);

            // Vote to replace address
            await this.token.voteToReplaceAddress(true, { from: creationAddresses[1] });
            let confirmReplacementTask = this.token.voteToReplaceAddress(true, { from:  creationAddresses[2] });
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
                { from:  accounts[11] });
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
});