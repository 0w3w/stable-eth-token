import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

const oneFinneyInWeis = 1000000000000000; // One finney is 0.001, which is the minimum initialAmount of cacao that a user can transact (1 Cent of a MXN), Weis
const halfFinneyInWeis = 500000000000000;


async function distribute(contractInstance, distributionAddresses, amountInWeis, distributeTo) {
    let result = await contractInstance.startDistribution(distributeTo, amountInWeis, { from: distributionAddresses[0] });
    result = await contractInstance.confirmDistribution(distributeTo, true, { from: distributionAddresses[1] });
}

async function createAndDistribute(contractInstance, creationAddresses, distributionAddresses, amountInWeis, distributeTo) {
    let result = await contractInstance.startCreation(amountInWeis, { from: creationAddresses[0] });
    result = await contractInstance.confirmCreation(true, { from: creationAddresses[1] });        
    result = await contractInstance.confirmCreation(true, { from: creationAddresses[2] });
    await distribute(contractInstance, distributionAddresses, amountInWeis, distributeTo);
}

contract('Cacao:StandardToken', function (accounts) {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const owner = accounts[8];
    const recipient = accounts[9];
    const anotherAccount = accounts[10];
    const initialAmount = 100 * oneFinneyInWeis;
  
    beforeEach(async function () {
        this.token = await Cacao.new(
            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4], // Creation Address 1 is msg.sender
            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2]);
        await createAndDistribute(this.token, creationAddresses, distributionAddresses, initialAmount, owner);
    });
  
    describe('total supply', function () {
      it('returns the total initialAmount of tokens', async function () {
        const totalSupply = await this.token.totalSupply();
  
        assert.equal(totalSupply, initialAmount);
      });
    });
  
    describe('balanceOf', function () {
      describe('when the requested account has no tokens', function () {
        it('returns zero', async function () {
          const balance = await this.token.balanceOf(anotherAccount);
  
          assert.equal(balance, 0);
        });
      });
  
      describe('when the requested account has some tokens', function () {
        it('returns the total initialAmount of tokens', async function () {
          const balance = await this.token.balanceOf(owner);
  
          assert.equal(balance, initialAmount);
        });
      });
    });
  
    describe('transfer', function () {
      describe('when the recipient is not the zero address', function () {
        const to = recipient;
  
        describe('when the sender does not have enough balance', function () {
          const amount = initialAmount + 1;
  
          it('reverts', async function () {
            await assertRevert(this.token.transfer(to, amount, { from: owner }));
          });
        });
  
        describe('when the sender has enough balance', function () {
          it('transfers the requested initialAmount', async function () {
            await this.token.transfer(to, initialAmount, { from: owner });

            const senderBalance = await this.token.balanceOf(owner);
            assert.equal(senderBalance, 0);
  
            const recipientBalance = await this.token.balanceOf(to);
            assert.equal(recipientBalance, initialAmount);
          });
  
          it('emits a transfer event', async function () {
            const { logs } = await this.token.transfer(to, initialAmount, { from: owner });
  
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Transfer');
            assert.equal(logs[0].args.from, owner);
            assert.equal(logs[0].args.to, to);
            assert(logs[0].args.value.eq(initialAmount));
          });
        });
      });
  
      describe('when the recipient is the zero address', function () {
        const to = ZERO_ADDRESS;
  
        it('reverts', async function () {
          await assertRevert(this.token.transfer(to, 100, { from: owner }));
        });
      });
    });
  });