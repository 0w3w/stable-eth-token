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
  assert.equal(cacaosInPurgatory, cacaosInPurgatory);
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
  assertInCirculation,
  assertTotalSupply
};