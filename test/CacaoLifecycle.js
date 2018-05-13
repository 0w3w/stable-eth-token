import { assertBalanceOf, assertInLimbo, assertInPurgatory, assertInCirculation, assertTotalSupply } from './helpers/assertAmounts.js';
import { inTransaction } from './helpers/expectEvent.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(web3.BigNumber))
  .should();

contract('Cacao', async (accounts) => {
    let contractInstance;
    // One finney is 0.001, which is the minimum initialAmount of cacao that a user can transact (1 Cent of a MXN), Unit is Weis
    let initialamountInWei = web3.toWei(1000, "finney");

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
        creationEvent.args._ammount.should.be.bignumber.equal(initialamountInWei);
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
        let pendingAmountInLimboInWei = web3.toWei(900, "finney"); 
        await assertInCirculation(contractInstance, 0);
        let initialDistributedamountInWei = web3.toWei(100, "finney");
        await contractInstance.startDistribution(initialOwner, initialDistributedamountInWei, { from: accounts[5] });
        await assertTotalSupply(contractInstance, initialamountInWei);
        // confirmDistribution
        let confirmDistributionTask = contractInstance.confirmDistribution(initialOwner, true, { from: accounts[6] });
        let distributionEvent = await inTransaction(confirmDistributionTask, 'Distributed');
        distributionEvent.args._to.should.eq(initialOwner);
        distributionEvent.args._ammount.should.be.bignumber.equal(initialDistributedamountInWei);
        await assertInCirculation(contractInstance, initialDistributedamountInWei);
        await assertTotalSupply(contractInstance, initialamountInWei);
        await assertBalanceOf(contractInstance, initialOwner, initialDistributedamountInWei);
        await assertInLimbo(contractInstance, pendingAmountInLimboInWei);
        
        /*
            Use (Simple Transfer)
        */
        let to = accounts[9];
        let transferAmount = web3.toWei(10, "finney");
        await assertBalanceOf(contractInstance, to, 0);
        await contractInstance.transfer(to, transferAmount, { from: initialOwner });
        await assertInCirculation(contractInstance, initialDistributedamountInWei);
        await assertTotalSupply(contractInstance, initialamountInWei);
        await assertBalanceOf(contractInstance, initialOwner, web3.toWei(90, "finney"));
        await assertBalanceOf(contractInstance, to, transferAmount);
        
        /*
            Destruct
        */
        let destructionReference = "QWERY132456";
        let amountToBurn = web3.toWei(10, "finney");
        await assertInPurgatory(contractInstance, 0);
        // Without valid reference
        await assertRevert(contractInstance.burn(amountToBurn, destructionReference, { from: initialOwner }));
        await assertInPurgatory(contractInstance, 0);
        // With valid reference
        await contractInstance.generateDestructionReference(destructionReference, { from: accounts[5] });
        await contractInstance.burn(amountToBurn, destructionReference, { from: initialOwner });
        await assertBalanceOf(contractInstance, initialOwner, web3.toWei(80, "finney"));
        await assertInPurgatory(contractInstance, amountToBurn);
        await assertInCirculation(contractInstance, web3.toWei(90, "finney"));
        await assertInLimbo(contractInstance, pendingAmountInLimboInWei);
        await assertTotalSupply(contractInstance, initialamountInWei);
        // Obliterate
        let amountToObliterate = web3.toWei(6, "finney");
        await contractInstance.obliterate(amountToObliterate, { from: accounts[5] });
        await assertInPurgatory(contractInstance, web3.toWei(4, "finney"));
        await assertInCirculation(contractInstance, web3.toWei(90, "finney"));
        await assertInLimbo(contractInstance, pendingAmountInLimboInWei);
        await assertTotalSupply(contractInstance, web3.toWei(994, "finney"));
   });
});