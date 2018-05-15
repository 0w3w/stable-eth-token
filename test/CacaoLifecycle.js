import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction } from './helpers/expectEvent.js';
import { caoToWei } from './helpers/helperMethods.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('Cacao', async (accounts) => {
    let contractInstance;
    let initialamountInWei = caoToWei(1000)

    beforeEach('setup contract for each test', async function () {
        contractInstance = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7]); // Distribution Addresses
    });

    it("Lifecycle", async () => {

        /*
            Create
        */

        // Start Creation
        await assertTotalSupply(contractInstance, 0);
        let isCreating = await contractInstance.isCreating();
        await assert(!isCreating, "Contract should not be creating");
        await contractInstance.startCreation(initialamountInWei, { from: accounts[0] });
        isCreating = await contractInstance.isCreating();
        await assert(isCreating, "Contract should be creating");
        await assertTotalSupply(contractInstance, 0);
        // ConfirmCreation
        await contractInstance.confirmCreation(true, { from: accounts[1] });
        let confirmCreationTask = contractInstance.confirmCreation(true, { from: accounts[2] });
        let creationEvent = await inTransaction(confirmCreationTask, 'Created');
        creationEvent.args._amount.should.be.bignumber.equal(initialamountInWei);
        // Verify Cacaos in Limbo
        isCreating = await contractInstance.isCreating();
        assert.isFalse(isCreating, "Contract should not be creating");
        await assertInLimbo(contractInstance, initialamountInWei);
        await assertTotalSupply(contractInstance, initialamountInWei);

        /*
            Distribute
        */

        // startDistribution
        let initialOwner = accounts[8];
        let pendingAmountInLimboInWei = caoToWei(900); 
        await assertInCirculation(contractInstance, 0);
        let initialDistributedamountInWei = caoToWei(100);
        await contractInstance.startDistribution(initialOwner, initialDistributedamountInWei, { from: accounts[5] });
        await assertTotalSupply(contractInstance, initialamountInWei);
        // confirmDistribution
        let confirmDistributionTask = contractInstance.confirmDistribution(initialOwner, true, { from: accounts[6] });
        let distributionEvent = await inTransaction(confirmDistributionTask, 'Distributed');
        distributionEvent.args._to.should.eq(initialOwner);
        distributionEvent.args._amount.should.be.bignumber.equal(initialDistributedamountInWei);
        await assertInCirculation(contractInstance, initialDistributedamountInWei);
        await assertTotalSupply(contractInstance, initialamountInWei);
        await assertBalanceOf(contractInstance, initialOwner, initialDistributedamountInWei);
        await assertInLimbo(contractInstance, pendingAmountInLimboInWei);
        
        /*
            Use (Simple Transfer)
        */
        let to = accounts[9];
        let transferAmount = caoToWei(10);
        await assertBalanceOf(contractInstance, to, 0);
        await contractInstance.transfer(to, transferAmount, { from: initialOwner });
        await assertInCirculation(contractInstance, initialDistributedamountInWei);
        await assertTotalSupply(contractInstance, initialamountInWei);
        await assertBalanceOf(contractInstance, initialOwner, caoToWei(90));
        await assertBalanceOf(contractInstance, to, transferAmount);
        
        /*
            Destruct
        */
        let destructionReference = "QWERY132456";
        let amountToBurn = caoToWei(10);
        await assertInPurgatory(contractInstance, 0);
        // Without valid reference
        await assertRevert(contractInstance.burn(amountToBurn, destructionReference, { from: initialOwner }));
        await assertInPurgatory(contractInstance, 0);
        // With valid reference
        await contractInstance.generateDestructionReference(destructionReference, { from: accounts[5] });
        await contractInstance.burn(amountToBurn, destructionReference, { from: initialOwner });
        await assertBalanceOf(contractInstance, initialOwner, caoToWei(80));
        await assertInPurgatory(contractInstance, amountToBurn);
        await assertInCirculation(contractInstance, caoToWei(90));
        await assertInLimbo(contractInstance, pendingAmountInLimboInWei);
        await assertTotalSupply(contractInstance, initialamountInWei);
        // Obliterate
        let amountToObliterate = caoToWei(6);
        await contractInstance.obliterate(amountToObliterate, { from: accounts[5] });
        await assertInPurgatory(contractInstance, caoToWei(4));
        await assertInCirculation(contractInstance, caoToWei(90));
        await assertInLimbo(contractInstance, pendingAmountInLimboInWei);
        await assertTotalSupply(contractInstance, caoToWei(994));
   });
});