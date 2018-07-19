import { createCoin, distributeCoin, caoToWei } from './helpers/helperMethods.js';
import assertRevert from './helpers/assertRevert.js';
const Cacao = artifacts.require("Cacao");

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

contract('CacaoFreeze', async (accounts) => {
    const creationAddresses = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]];
    const distributionAddresses = [accounts[5], accounts[6], accounts[7]];
    const delegatedTransferAddress = accounts[8];
    const delegatedTransferFee = caoToWei(1);
    let destructionReference = "QWERY132456";
    let creationAmount = caoToWei(1000);
    let amountToDistribute = caoToWei(100);
    let amountToBurn = caoToWei(10);
    let amountToObliterate = caoToWei(6);
    let amountToSend = caoToWei(5);
    let owner = accounts[9];
    let spender = accounts[10];
    let to = accounts[11];

    beforeEach('setup contract for each test', async function () {
        this.token = await Cacao.new(
            accounts[1], accounts[2], accounts[3], accounts[4], // Creation Addresses (Including msg.sender as #1)
            accounts[5], accounts[6], accounts[7], // Distribution Addresses
            delegatedTransferAddress, delegatedTransferFee);
        await createCoin(this.token, creationAddresses, creationAmount);
        await distributeCoin(this.token, distributionAddresses, amountToDistribute, owner);
    });

    describe('freeze', function () {
        describe('when the sender address is a creator address', function () {
            it("succeeds", async function () {
                await this.token.freeze({ from: creationAddresses[1] });
            });
        });
        describe('when the sender address is not a creator address', function () {
            it("fails", async function () {
                await assertRevert(this.token.freeze({ from: distributionAddresses[1] }));
            });
        });
        describe('when the contract is frozen', function () {
            describe('ERC20 external and public methods', function () {
                describe('reverts', function () {
                    it("transfer", async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.transfer(to, amountToSend, { from: owner }));
                    });
                    it("approve", async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.approve(spender, amountToSend, { from: owner }));
                    });
                    it("approve", async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.approve(spender, amountToSend, { from: owner }));
                    });
                    it("transfer from", async function () {
                        await this.token.approve(spender, amountToSend, { from: owner });
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.transferFrom(owner, to, amountToSend, { from: spender }));
                    });
                    it("decrease approval", async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.decreaseApproval(spender, amountToSend, { from: owner }));
                    });
                    it("increase approval", async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.increaseApproval(spender, amountToSend, { from: owner }));
                    });
                });
                describe('success', function () {
                    beforeEach(async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                    });
                    it("total supply", async function () {
                        const totalSupply = await this.token.totalSupply();
                        assert.equal(totalSupply, creationAmount);
                    });
                    it('balanceOf', async function () {
                        const balance = await this.token.balanceOf(owner);
                        assert.equal(balance, amountToDistribute);
                    });
                });
            });
            describe('CacaoCreation external and public methods', function () {
                describe('reverts', function () {
                    it("startCreation", async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.startCreation(creationAmount, { from: creationAddresses[0] }));
                    });
                    it("confirmCreation", async function () {
                        this.token.startCreation(creationAmount, { from: creationAddresses[0] });
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.confirmCreation(true, { from: creationAddresses[1] }));
                    });
                });
                describe('success', function () {
                    beforeEach(async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                    });
                    it("isCreating", async function () {
                        let isCreating = await this.token.isCreating();
                    });
                });
            });
            describe('CacaoDistribution external and public methods', function () {
                describe('reverts', function () {
                    it("startDistribution", async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.startDistribution(owner, amountToDistribute, { from: distributionAddresses[0] }));
                    });
                    it("confirmDistribution", async function () {
                        this.token.startDistribution(owner, amountToDistribute, { from: distributionAddresses[0] });
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.confirmDistribution(owner, true, { from: distributionAddresses[1] }));
                    });
                });
            });
            describe('CacaoDestruction external and public methods', function () {
                describe('reverts', function () {
                    it("generateDestructionReference", async function () {
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] }));
                    });
                    it("burn", async function () {
                        await this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] });
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.burn(amountToBurn, destructionReference, { from: owner }));
                    });
                    it("obliterate", async function () {
                        await this.token.generateDestructionReference(destructionReference, { from: distributionAddresses[1] });
                        await this.token.burn(amountToBurn, destructionReference, { from: owner });
                        await this.token.freeze({ from: creationAddresses[1] });
                        await assertRevert(this.token.obliterate(amountToObliterate, { from: creationAddresses[0] }));
                    });
                });
            });
        });
    });
});