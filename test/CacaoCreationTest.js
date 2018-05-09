const CacaoCreationTest = artifacts.require("CacaoCreationTest");
const Cacao = artifacts.require("Cacao");

const oneFinneyInWeis = 1000000000000000; // One finney is 0.001, which is the minimum amount of cacao that a user can transact (1 Cent of a MXN), Weis
const halfFinneyInWeis = 500000000000000;

async function assertTotalSupply(contractInstance, expectedSupply){
    const totalSupply = await contractInstance.totalSupply();
    assert.equal(totalSupply, expectedSupply);
}

contract('CacaoCreation', async (accounts) => {
    let contractInstance;

    beforeEach('setup contract for each test', async function () {
        contractInstance = await CacaoCreationTest.new();
    });

    it("should be able to start the process if the sender address and amount are valid.", async () => {
        await contractInstance.setMockState(true);
        let isCreating = await contractInstance.isCreating();
        assert(!isCreating, "Contract should not be creating");
        let result = await contractInstance.startCreation(oneFinneyInWeis);
        isCreating = await contractInstance.isCreating();
        assert(isCreating, "Contract should be creating");
   });

   it("should not be able to start the process if the sender address is not valid.", async () => {
        await contractInstance.setMockState(false);
        let isCreating = await contractInstance.isCreating();
        assert(!isCreating, "Contract should not be creating");
        try {
            let result = await contractInstance.startCreation(oneFinneyInWeis);
            assert.fail("Should have failed");
        } catch(err) {
            assert(err.toString().includes('revert'), err.toString())
        }
    });

    it("should not be able to start the process if the amount is not valid.", async () => {
         await contractInstance.setMockState(true);
         let isCreating = await contractInstance.isCreating();
         assert(!isCreating, "Contract should not be creating");
         try {
             let result = await contractInstance.startCreation(halfFinneyInWeis);
             assert.fail("Should have failed");
         } catch(err) {
             assert(err.toString().includes('revert'), err.toString())
         }
     });
});

contract('Cacao', async (accounts) => {
    let contractInstance;

    beforeEach('setup contract for each test', async function () {
        contractInstance = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7]); // Distribution Addresses
    });

    it("creates coin", async () => {
        let initialamountCao = 1000;
        let initialamountFinney = (initialamountCao * oneFinneyInWeis);
        // Start Creation
        assertTotalSupply(contractInstance, 0);
        let isCreating = await contractInstance.isCreating();
        assert(!isCreating, "Contract should not be creating");
        let result = await contractInstance.startCreation(initialamountFinney, { from: accounts[0] });
        isCreating = await contractInstance.isCreating();
        assert(isCreating, "Contract should be creating");
        assertTotalSupply(contractInstance, 0);
        // ConfirmCreation
        result = await contractInstance.confirmCreation(true, { from: accounts[1] });        
        result = await contractInstance.confirmCreation(true, { from: accounts[2] });
        // Verify Cacaos in Limbo
        isCreating = await contractInstance.isCreating();
        assert.isFalse(isCreating, "Contract should not be creating");
        let cacaosInLimbo = await contractInstance.cacaosInLimbo();
        assert.equal(cacaosInLimbo, initialamountFinney);
        assertTotalSupply(contractInstance, initialamountFinney);
        // startDistribution
        let cacaosInCirculation = await contractInstance.cacaosInCirculation();        
        assert.equal(cacaosInCirculation, 0);
        let initialDistributedamount = 100;
        let initialDistributedamountFinney = (initialDistributedamount * oneFinneyInWeis);
        result = await contractInstance.startDistribution(accounts[8], initialDistributedamountFinney, { from: accounts[5] });
        assertTotalSupply(contractInstance, initialamountFinney);
        // confirmDistribution
        result = await contractInstance.confirmDistribution(accounts[8], true, { from: accounts[6] });
        //cacaosInCirculation = await contractInstance.cacaosInCirculation();        
        //assert.equal(cacaosInCirculation, initialDistributedamountFinney);
        //assertTotalSupply(contractInstance, initialamountFinney);
   });
});