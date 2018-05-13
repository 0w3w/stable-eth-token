const createCoin = async (contractInstance, creationAddresses, amountInWeis) => {
    await contractInstance.startCreation(amountInWeis, { from: creationAddresses[0] });
    await contractInstance.confirmCreation(true, { from: creationAddresses[1] });        
    await contractInstance.confirmCreation(true, { from: creationAddresses[2] });
}

const distributeCoin = async (contractInstance, distributionAddresses, amountInWeis, distributeTo) => {
    await contractInstance.startDistribution(distributeTo, amountInWeis, { from: distributionAddresses[0] });
    await contractInstance.confirmDistribution(distributeTo, true, { from: distributionAddresses[1] });
}

const createAndDistributeCoin = async(contractInstance, creationAddresses, distributionAddresses, amountInWeis, distributeTo) => {
    await createCoin(contractInstance, creationAddresses, amountInWeis);
    await distributeCoin(contractInstance, distributionAddresses, amountInWeis, distributeTo);
}

module.exports = {
    createCoin,
    distributeCoin,
    createAndDistributeCoin
};