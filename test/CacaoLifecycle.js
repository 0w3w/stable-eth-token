import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction } from './helpers/expectEvent.js';
import { caoToWei, getNonce, getHashOfCreateData, getHashOfDistributeData } from './helpers/helperMethods.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('Cacao', async (accounts) => {
    let initialamountInWei = caoToWei(1000)
    const delegatedTransferAddress = accounts[8];
    const delegatedTransferFee = caoToWei(1);
    const transactionAddress = accounts[12];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7], // Distribution Addresses
            delegatedTransferAddress, delegatedTransferFee);
    });

    describe('Lifecycle', function () {
        it("Succeed", async function () {
            // Create
            await assertTotalSupply(this.token, 0);
            await assertInLimbo(this.token, 0);
            let nonce = getNonce();
            let txHash = await getHashOfCreateData(this.token, initialamountInWei, nonce);
            let signature0 = web3.eth.sign(accounts[0], txHash);
            let signature1 = web3.eth.sign(accounts[1], txHash);
            let signature2 = web3.eth.sign(accounts[2], txHash);
            let creationTask = this.token.create(initialamountInWei,
                nonce,
                accounts[0],
                signature0,
                accounts[1],
                signature1,
                accounts[2],
                signature2, { from: transactionAddress });
            let creationEvent = await inTransaction(creationTask, 'Created');
            creationEvent.args._amount.should.be.bignumber.equal(initialamountInWei);
            await assertInLimbo(this.token, initialamountInWei);
            await assertTotalSupply(this.token, initialamountInWei);

            // Distribute
            let initialOwner = accounts[9];
            let pendingAmountInLimboInWei = caoToWei(900);
            await assertInCirculation(this.token, 0);
            let initialDistributedamountInWei = caoToWei(100);
            nonce = getNonce();
            txHash = await getHashOfDistributeData(this.token, initialOwner, initialDistributedamountInWei, nonce);
            signature0 = web3.eth.sign(accounts[5], txHash);
            signature1 = web3.eth.sign(accounts[6], txHash);
            let distributionTask = this.token.Distribute(
                initialOwner,
                initialDistributedamountInWei,
                nonce,
                accounts[5],
                signature0,
                accounts[6],
                signature1,
                { from: transactionAddress });
            let distributionEvent = await inTransaction(distributionTask, 'Distributed');
            distributionEvent.args._to.should.eq(initialOwner);
            distributionEvent.args._amount.should.be.bignumber.equal(initialDistributedamountInWei);
            await assertInCirculation(this.token, initialDistributedamountInWei);
            await assertTotalSupply(this.token, initialamountInWei);
            await assertBalanceOf(this.token, initialOwner, initialDistributedamountInWei);
            await assertInLimbo(this.token, pendingAmountInLimboInWei);

            // Use (Simple Transfer)
            let to = accounts[10];
            let transferAmount = caoToWei(10);
            await assertBalanceOf(this.token, to, 0);
            await this.token.transfer(to, transferAmount, { from: initialOwner });
            await assertInCirculation(this.token, initialDistributedamountInWei);
            await assertTotalSupply(this.token, initialamountInWei);
            await assertBalanceOf(this.token, initialOwner, caoToWei(90));
            await assertBalanceOf(this.token, to, transferAmount);

            // Destruct
            let destructionReference = "QWERY132456";
            let amountToBurn = caoToWei(10);
            await assertInPurgatory(this.token, 0);
            // Without valid reference
            await assertRevert(this.token.burn(amountToBurn, destructionReference, { from: initialOwner }));
            await assertInPurgatory(this.token, 0);
            // With valid reference
            await this.token.generateDestructionReference(destructionReference, { from: accounts[5] });
            await this.token.burn(amountToBurn, destructionReference, { from: initialOwner });
            await assertBalanceOf(this.token, initialOwner, caoToWei(80));
            await assertInPurgatory(this.token, amountToBurn);
            await assertInCirculation(this.token, caoToWei(90));
            await assertInLimbo(this.token, pendingAmountInLimboInWei);
            await assertTotalSupply(this.token, initialamountInWei);
            // Obliterate
            let amountToObliterate = caoToWei(6);
            await this.token.obliterate(amountToObliterate, { from: accounts[5] });
            await assertInPurgatory(this.token, caoToWei(4));
            await assertInCirculation(this.token, caoToWei(90));
            await assertInLimbo(this.token, pendingAmountInLimboInWei);
            await assertTotalSupply(this.token, caoToWei(994));
        });
    });
});