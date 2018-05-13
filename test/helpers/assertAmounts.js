const assert = require('chai').assert;

const assertBalanceOf = async (contractInstance, account, expectedAmount) => {
  const accountBalance = await contractInstance.balanceOf(account);
  assert.equal(accountBalance, expectedAmount);
}

const assertInLimbo = async (contractInstance, expectedAmount) => {
  const cacaosInLimbo = await contractInstance.cacaosInLimbo();
  assert.equal(cacaosInLimbo, expectedAmount);
}

const assertInPurgatory = async (contractInstance, expectedAmount) => {
  const cacaosInPurgatory = await contractInstance.cacaosInPurgatory();
  assert.equal(cacaosInPurgatory, expectedAmount);
}

const assertBurned = async (contractInstance, expectedAmount) => {
  const cacaosBurned = await contractInstance.cacaosBurned();
  assert.equal(cacaosBurned, expectedAmount);
}

const assertInCirculation = async (contractInstance, expectedCirculation) => {
  const cacaosInCirculation = await contractInstance.cacaosInCirculation();
  assert.equal(cacaosInCirculation, expectedCirculation);
}

const assertTotalSupply = async (contractInstance, expectedSupply) => {
  const totalSupply = await contractInstance.totalSupply();
  assert.equal(totalSupply, expectedSupply);
}

module.exports = {
  assertBalanceOf,
  assertInLimbo,
  assertInPurgatory,
  assertBurned,
  assertInCirculation,
  assertTotalSupply
};