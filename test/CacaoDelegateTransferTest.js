
import { assertBalanceOf } from './helpers/assertAmounts.js';
import { listEvents } from './helpers/expectEvent.js';
import { caoToWei, createAndDistributeCoin, getHashOfTransaction } from './helpers/helperMethods.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

async function assertDelegatedTransferEvents(delegatedTransferTask, fromAccount, toAccount, transferAmount, fee, feeAddress) {
    let transferEvents = await listEvents(delegatedTransferTask, 'Transfer');
    // Assert transfer to toAccount
    const mainTransferEvent = transferEvents.find(e => e.args.to === toAccount);
    assert.exists(mainTransferEvent);
    mainTransferEvent.args.from.should.eq(fromAccount);
    mainTransferEvent.args.to.should.eq(toAccount);
    mainTransferEvent.args.value.should.be.bignumber.equal(transferAmount);
    // Assert transfer to feeAddress
    const feeTransferEvent = transferEvents.find(e => e.args.to === feeAddress);
    assert.exists(feeTransferEvent);
    feeTransferEvent.args.from.should.eq(fromAccount);
    feeTransferEvent.args.to.should.eq(feeAddress);
    feeTransferEvent.args.value.should.be.bignumber.equal(fee);
}

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('Cacao', async (accounts) => {
    let initialamountInWei = caoToWei(100)
    let delegatedTransferFee = caoToWei(1)
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const delegatedTransferAddress = accounts[8];
    const fromAccount = accounts[9];
    const toAccount = accounts[10];
    const other = accounts[11];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4], // Creation Addresses (Including msg.sender as #1)
            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2], // Distribution Addresses
            delegatedTransferAddress, delegatedTransferFee);
    });

    describe('DelegateTransfer', function () {
        describe('Valid Signature', function () {
            beforeEach('setup contract for each test', async function () {
                await createAndDistributeCoin(this.token, creationAddresses, distributionAddresses, initialamountInWei, fromAccount);
            });
            it("Success", async function () {
                // Get the hash of the message
                let transferAmount = caoToWei(10);
                let nonceStr = "randomizer";
                let txHash = await getHashOfTransaction(this.token, fromAccount, toAccount, transferAmount, nonceStr);
                // Signs message using web3 (auto-applies prefix)
                const signature = web3.eth.sign(fromAccount, txHash);
                let delegatedTransferTask = this.token.delegatedTransfer(
                    fromAccount,
                    toAccount,
                    transferAmount,
                    nonceStr,
                    signature,
                    { from: other });
                // Assert Events
                await assertDelegatedTransferEvents(delegatedTransferTask, fromAccount, toAccount, transferAmount, delegatedTransferFee, delegatedTransferAddress);

                // Assert Balances
                await assertBalanceOf(this.token, fromAccount, caoToWei(89));// initialamountInWei - transferAmount - delegatedTransferFee
                await assertBalanceOf(this.token, toAccount, transferAmount);
                await assertBalanceOf(this.token, delegatedTransferAddress, delegatedTransferFee);
            });
            it("reverts if reusing signature", async function () {
                // Get the hash of the message
                let transferAmount = caoToWei(10);
                let nonceStr = "randomizer";
                let txHash = await getHashOfTransaction(this.token, fromAccount, toAccount, transferAmount, nonceStr);
                // Signs message using web3 (auto-applies prefix)
                const signature = web3.eth.sign(fromAccount, txHash);
                let delegatedTransferTask = this.token.delegatedTransfer(
                    fromAccount,
                    toAccount,
                    transferAmount,
                    nonceStr,
                    signature,
                    { from: other });
                // Assert Events
                await assertDelegatedTransferEvents(delegatedTransferTask, fromAccount, toAccount, transferAmount, delegatedTransferFee, delegatedTransferAddress);
                // Assert Balances
                await assertBalanceOf(this.token, fromAccount, caoToWei(89));// initialamountInWei - transferAmount - delegatedTransferFee
                await assertBalanceOf(this.token, toAccount, transferAmount);
                await assertBalanceOf(this.token, delegatedTransferAddress, delegatedTransferFee);
                // Reuse the same signature
                await assertRevert(this.token.delegatedTransfer(
                    fromAccount,
                    toAccount,
                    transferAmount,
                    nonceStr,
                    signature,
                    { from: other }));
                // Assert Balances
                await assertBalanceOf(this.token, fromAccount, caoToWei(89));// initialamountInWei - transferAmount - delegatedTransferFee
                await assertBalanceOf(this.token, toAccount, transferAmount);
                await assertBalanceOf(this.token, delegatedTransferAddress, delegatedTransferFee);
            });
        });
    });
});