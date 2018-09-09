const createCoin = async (contractInstance, creationAddresses, amountInWeis, transactionAddress) => {
    //Sign messages
    let nonce = getNonce();
    let txHash = await getHashOfCreateData(contractInstance, amountInWeis, nonce);
    const signature0 = web3.eth.sign(creationAddresses[0], txHash);
    const signature1 = web3.eth.sign(creationAddresses[1], txHash);
    const signature2 = web3.eth.sign(creationAddresses[2], txHash);
    // Create Coin
    await contractInstance.create(amountInWeis,
        nonce,
        creationAddresses[0],
        signature0,
        creationAddresses[1],
        signature1,
        creationAddresses[2],
        signature2, { from: transactionAddress });
}

const distributeCoin = async (contractInstance, distributionAddresses, transactionAddress, amountInWeis, distributeTo) => {
    //Sign messages
    let nonce = getNonce();
    let txHash = await getHashOfDistributeData(contractInstance, distributeTo, amountInWeis, nonce);
    const signature0 = web3.eth.sign(distributionAddresses[0], txHash);
    const signature1 = web3.eth.sign(distributionAddresses[1], txHash);
    // Distribute Coin
    await contractInstance.Distribute(
        distributeTo,
        amountInWeis,
        nonce,
        distributionAddresses[0],
        signature0,
        distributionAddresses[1],
        signature1,
        { from: transactionAddress });
}

const createAndDistributeCoin = async (contractInstance, creationAddresses, distributionAddresses, transactionAddress, amountInWeis, distributeTo) => {
    await createCoin(contractInstance, creationAddresses, amountInWeis, transactionAddress);
    await distributeCoin(contractInstance, distributionAddresses, transactionAddress, amountInWeis, distributeTo);
}

const caoToWei = (amount) => {
    return amount * 1000;
}

const getHashOfHashDelegatedTransfer = async (contractInstance, from, to, value, nonce) => {
    const txHash = await contractInstance.hashDelegatedTransfer.call(
        from,
        to,
        value,
        nonce);
    return txHash;
}

const getHashOfCreateData = async (contractInstance, ammount, nonce) => {
    const txHash = await contractInstance.hashCreateData.call(
        ammount,
        nonce);
    return txHash;
}

const getHashOfDistributeData = async (contractInstance, to, ammount, nonce) => {
    const txHash = await contractInstance.hashDistributeData.call(
        to,
        ammount,
        nonce);
    return txHash;
}

const getHashOfReplaceAddress = async (contractInstance, oldAddress, newAddress, nonce) => {
    const txHash = await contractInstance.hashReplaceData.call(
        oldAddress,
        newAddress,
        nonce);
    return txHash;
}

const getNonce = () => {
    return Math.random().toString(36).substring(7);;
}


module.exports = {
    caoToWei,
    createAndDistributeCoin,
    createCoin,
    distributeCoin,
    getHashOfCreateData,
    getHashOfDistributeData,
    getHashOfHashDelegatedTransfer,
    getHashOfReplaceAddress,
    getNonce
};