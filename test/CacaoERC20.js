import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

async function distribute(contractInstance, distributionAddresses, amountInWeis, distributeTo) {
    await contractInstance.startDistribution(distributeTo, amountInWeis, { from: distributionAddresses[0] });
    await contractInstance.confirmDistribution(distributeTo, true, { from: distributionAddresses[1] });
}

async function createAndDistribute(contractInstance, creationAddresses, distributionAddresses, amountInWeis, distributeTo) {
    await contractInstance.startCreation(amountInWeis, { from: creationAddresses[0] });
    await contractInstance.confirmCreation(true, { from: creationAddresses[1] });        
    await contractInstance.confirmCreation(true, { from: creationAddresses[2] });
    await distribute(contractInstance, distributionAddresses, amountInWeis, distributeTo);
}

contract('StandardToken', function (accounts) {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const owner = accounts[9];
    const recipient = accounts[10];
    const anotherAccount = accounts[11];
    const initialAmount = web3.toWei(100, "finney");
  
    beforeEach(async function () {
        this.token = await Cacao.new(
            creationAddresses[1], creationAddresses[2], creationAddresses[3], creationAddresses[4], // Creation Address 1 is msg.sender
            distributionAddresses[0], distributionAddresses[1], distributionAddresses[2]);
        await createAndDistribute(this.token, creationAddresses, distributionAddresses, initialAmount, owner);
    });
  
    describe('total supply', function () {
      it('returns the total amount of tokens', async function () {
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
        it('returns the total amount of tokens', async function () {
          const balance = await this.token.balanceOf(owner);
  
          assert.equal(balance, initialAmount);
        });
      });
    });
  
    describe('transfer', function () {
      describe('when the recipient is not the zero address', function () {
        const to = recipient;
  
        describe('when the sender does not have enough balance', function () {
          const amount = web3.toWei(101, "finney");
  
          it('reverts', async function () {
            await assertRevert(this.token.transfer(to, amount, { from: owner }));
          });
        });
  
        describe('when the sender has enough balance', function () {
          const amount = initialAmount;
  
          it('transfers the requested amount', async function () {
            await this.token.transfer(to, amount, { from: owner });
  
            const senderBalance = await this.token.balanceOf(owner);
            assert.equal(senderBalance, 0);
  
            const recipientBalance = await this.token.balanceOf(to);
            assert.equal(recipientBalance, amount);
          });
  
          it('emits a transfer event', async function () {
            const { logs } = await this.token.transfer(to, amount, { from: owner });
  
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Transfer');
            assert.equal(logs[0].args.from, owner);
            assert.equal(logs[0].args.to, to);
            assert(logs[0].args.value.eq(amount));
          });
        });
      });
  
      describe('when the recipient is the zero address', function () {
        const to = ZERO_ADDRESS;
  
        it('reverts', async function () {
          await assertRevert(this.token.transfer(to, initialAmount, { from: owner }));
        });
      });
    });
  
    describe('approve', function () {
      describe('when the spender is not the zero address', function () {
        const spender = recipient;
  
        describe('when the sender has enough balance', function () {
          const amount = initialAmount;
  
          it('emits an approval event', async function () {
            const { logs } = await this.token.approve(spender, amount, { from: owner });
  
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Approval');
            assert.equal(logs[0].args.owner, owner);
            assert.equal(logs[0].args.spender, spender);
            assert(logs[0].args.value.eq(amount));
          });
  
          describe('when there was no approved amount before', function () {
            it('approves the requested amount', async function () {
              await this.token.approve(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, amount);
            });
          });
  
          describe('when the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.token.approve(spender, 1, { from: owner });
            });
  
            it('approves the requested amount and replaces the previous one', async function () {
              await this.token.approve(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, amount);
            });
          });
        });
  
        describe('when the sender does not have enough balance', function () {
          const amount = 101;
  
          it('emits an approval event', async function () {
            const { logs } = await this.token.approve(spender, amount, { from: owner });
  
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Approval');
            assert.equal(logs[0].args.owner, owner);
            assert.equal(logs[0].args.spender, spender);
            assert(logs[0].args.value.eq(amount));
          });
  
          describe('when there was no approved amount before', function () {
            it('approves the requested amount', async function () {
              await this.token.approve(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, amount);
            });
          });
  
          describe('when the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.token.approve(spender, 1, { from: owner });
            });
  
            it('approves the requested amount and replaces the previous one', async function () {
              await this.token.approve(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, amount);
            });
          });
        });
      });
  
      describe('when the spender is the zero address', function () {
        const amount = initialAmount;
        const spender = ZERO_ADDRESS;
  
        it('approves the requested amount', async function () {
          await this.token.approve(spender, amount, { from: owner });
  
          const allowance = await this.token.allowance(owner, spender);
          assert.equal(allowance, amount);
        });
  
        it('emits an approval event', async function () {
          const { logs } = await this.token.approve(spender, amount, { from: owner });
  
          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });
      });
    });
  
    describe('transfer from', function () {
      const spender = recipient;
  
      describe('when the recipient is not the zero address', function () {
        const to = anotherAccount;
  
        describe('when the spender has enough approved balance', function () {
          beforeEach(async function () {
            await this.token.approve(spender, initialAmount, { from: owner });
          });
  
          describe('when the owner has enough balance', function () {
            const amount = initialAmount;
  
            it('transfers the requested amount', async function () {
              await this.token.transferFrom(owner, to, amount, { from: spender });
  
              const senderBalance = await this.token.balanceOf(owner);
              assert.equal(senderBalance, 0);
  
              const recipientBalance = await this.token.balanceOf(to);
              assert.equal(recipientBalance, amount);
            });
  
            it('decreases the spender allowance', async function () {
              await this.token.transferFrom(owner, to, amount, { from: spender });
  
              const allowance = await this.token.allowance(owner, spender);
              assert(allowance.eq(0));
            });
  
            it('emits a transfer event', async function () {
              const { logs } = await this.token.transferFrom(owner, to, amount, { from: spender });
  
              assert.equal(logs.length, 1);
              assert.equal(logs[0].event, 'Transfer');
              assert.equal(logs[0].args.from, owner);
              assert.equal(logs[0].args.to, to);
              assert(logs[0].args.value.eq(amount));
            });
          });
  
          describe('when the owner does not have enough balance', function () {
            const amount = 101;
  
            it('reverts', async function () {
              await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
            });
          });
        });
  
        describe('when the spender does not have enough approved balance', function () {
          beforeEach(async function () {
            await this.token.approve(spender, 99, { from: owner });
          });
  
          describe('when the owner has enough balance', function () {
            const amount = initialAmount;
  
            it('reverts', async function () {
              await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
            });
          });
  
          describe('when the owner does not have enough balance', function () {
            const amount = 101;
  
            it('reverts', async function () {
              await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
            });
          });
        });
      });
  
      describe('when the recipient is the zero address', function () {
        const amount = initialAmount;
        const to = ZERO_ADDRESS;
  
        beforeEach(async function () {
          await this.token.approve(spender, amount, { from: owner });
        });
  
        it('reverts', async function () {
          await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
        });
      });
    });
  
    describe('decrease approval', function () {
      describe('when the spender is not the zero address', function () {
        const spender = recipient;
  
        describe('when the sender has enough balance', function () {
          const amount = initialAmount;
  
          it('emits an approval event', async function () {
            const { logs } = await this.token.decreaseApproval(spender, amount, { from: owner });
  
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Approval');
            assert.equal(logs[0].args.owner, owner);
            assert.equal(logs[0].args.spender, spender);
            assert(logs[0].args.value.eq(0));
          });
  
          describe('when there was no approved amount before', function () {
            it('keeps the allowance to zero', async function () {
              await this.token.decreaseApproval(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, 0);
            });
          });
  
          describe('when the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.token.approve(spender, amount + 1, { from: owner });
            });
  
            it('decreases the spender allowance subtracting the requested amount', async function () {
              await this.token.decreaseApproval(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, 1);
            });
          });
        });
  
        describe('when the sender does not have enough balance', function () {
          const amount = 101;
  
          it('emits an approval event', async function () {
            const { logs } = await this.token.decreaseApproval(spender, amount, { from: owner });
  
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Approval');
            assert.equal(logs[0].args.owner, owner);
            assert.equal(logs[0].args.spender, spender);
            assert(logs[0].args.value.eq(0));
          });
  
          describe('when there was no approved amount before', function () {
            it('keeps the allowance to zero', async function () {
              await this.token.decreaseApproval(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, 0);
            });
          });
  
          describe('when the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.token.approve(spender, amount + 1, { from: owner });
            });
  
            it('decreases the spender allowance subtracting the requested amount', async function () {
              await this.token.decreaseApproval(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, 1);
            });
          });
        });
      });
  
      describe('when the spender is the zero address', function () {
        const amount = initialAmount;
        const spender = ZERO_ADDRESS;
  
        it('decreases the requested amount', async function () {
          await this.token.decreaseApproval(spender, amount, { from: owner });
  
          const allowance = await this.token.allowance(owner, spender);
          assert.equal(allowance, 0);
        });
  
        it('emits an approval event', async function () {
          const { logs } = await this.token.decreaseApproval(spender, amount, { from: owner });
  
          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(0));
        });
      });
    });
  
    describe('increase approval', function () {
      const amount = initialAmount;
  
      describe('when the spender is not the zero address', function () {
        const spender = recipient;
  
        describe('when the sender has enough balance', function () {
          it('emits an approval event', async function () {
            const { logs } = await this.token.increaseApproval(spender, amount, { from: owner });
  
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Approval');
            assert.equal(logs[0].args.owner, owner);
            assert.equal(logs[0].args.spender, spender);
            assert(logs[0].args.value.eq(amount));
          });
  
          describe('when there was no approved amount before', function () {
            it('approves the requested amount', async function () {
              await this.token.increaseApproval(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, amount);
            });
          });
  
          describe('when the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.token.approve(spender, 1, { from: owner });
            });
  
            it('increases the spender allowance adding the requested amount', async function () {
              await this.token.increaseApproval(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, amount + 1);
            });
          });
        });
  
        describe('when the sender does not have enough balance', function () {
          const amount = 101;
  
          it('emits an approval event', async function () {
            const { logs } = await this.token.increaseApproval(spender, amount, { from: owner });
  
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Approval');
            assert.equal(logs[0].args.owner, owner);
            assert.equal(logs[0].args.spender, spender);
            assert(logs[0].args.value.eq(amount));
          });
  
          describe('when there was no approved amount before', function () {
            it('approves the requested amount', async function () {
              await this.token.increaseApproval(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, amount);
            });
          });
  
          describe('when the spender had an approved amount', function () {
            beforeEach(async function () {
              await this.token.approve(spender, 1, { from: owner });
            });
  
            it('increases the spender allowance adding the requested amount', async function () {
              await this.token.increaseApproval(spender, amount, { from: owner });
  
              const allowance = await this.token.allowance(owner, spender);
              assert.equal(allowance, amount + 1);
            });
          });
        });
      });
  
      describe('when the spender is the zero address', function () {
        const spender = ZERO_ADDRESS;
  
        it('approves the requested amount', async function () {
          await this.token.increaseApproval(spender, amount, { from: owner });
  
          const allowance = await this.token.allowance(owner, spender);
          assert.equal(allowance, amount);
        });
  
        it('emits an approval event', async function () {
          const { logs } = await this.token.increaseApproval(spender, amount, { from: owner });
  
          assert.equal(logs.length, 1);
          assert.equal(logs[0].event, 'Approval');
          assert.equal(logs[0].args.owner, owner);
          assert.equal(logs[0].args.spender, spender);
          assert(logs[0].args.value.eq(amount));
        });
      });
    });
  });