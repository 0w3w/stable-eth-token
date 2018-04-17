// Useful Links
// - Example test code https://medium.com/@gus_tavo_guim/testing-your-smart-contracts-with-javascript-40d4edc2abed
// - Web3 JavaScript app API https://github.com/ethereum/wiki/wiki/JavaScript-API
var CacaoCreationTest = artifacts.require("CacaoCreationTest");

var oneFinney = 1000000000000000; // One finney is 0.001, which is the minimum ammount of cacao that a user can transact (1 Cent of a MXN)
var halfFinney = 500000000000000;

function assertEvent(result, expectedEvent){
    for (var i = 0; i < result.logs.length; i++) {
       var theLog = result.logs[i];
       if (theLog.event == expectedEvent.name) {
          // We found the event!
          if(expectedEvent.validateArguments && !expectedEvent.validateArguments(theLog.args)){
             continue;
          }
          return;
       }
    }
    assert(false, "Event " + expectedEvent.name + " was not triggered.");
 }

contract('startCreation', async (accounts) => {
    let contractInstance;

    beforeEach('setup contract for each test', async function () {
        contractInstance = await CacaoCreationTest.new();
    });

    it("should be able to start the process if the sender address and ammount are valid.", async () => {
        await contractInstance.setMockState(true);
        let isCreating = await contractInstance.isCreating();
        assert(!isCreating, "Contract should not be creating");
        let result = await contractInstance.startCreation(oneFinney);
        isCreating = await contractInstance.isCreating();
        assert(isCreating, "Contract should be creating");
   });

   it("should not be able to start the process if the sender address is not valid.", async () => {
        await contractInstance.setMockState(false);
        let isCreating = await contractInstance.isCreating();
        assert(!isCreating, "Contract should not be creating");
        try {
            let result = await contractInstance.startCreation(oneFinney);
            assert.fail("Should have failed");
        } catch(err) {
            assert(err.toString().includes('revert'), err.toString())
        }
    });

    it("should not be able to start the process if the ammount is not valid.", async () => {
         await contractInstance.setMockState(true);
         let isCreating = await contractInstance.isCreating();
         assert(!isCreating, "Contract should not be creating");
         try {
             let result = await contractInstance.startCreation(halfFinney);
             assert.fail("Should have failed");
         } catch(err) {
             assert(err.toString().includes('revert'), err.toString())
         }
     });
});
