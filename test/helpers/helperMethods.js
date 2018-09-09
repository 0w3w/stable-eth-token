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

const signMessage = (address, message) => {
    const messageHex = '0x' + Buffer.from(message).toString('hex');
    const signature = web3.eth.sign(address, messageHex);
    const r = signature.slice(0, 66)
    const s = '0x' + signature.slice(66, 130)
    const v = '0x' + signature.slice(130, 132)

    // eth_sign calculated the signature over keccak256("\x19Ethereum Signed Message:\n" + len(givenMessage) + givenMessage)))
    // this gives context to a signature and prevents signing of transactions.
    const messageHash = web3.sha3('\x19Ethereum Signed Message:\n' + message.length + message);
    return {
        address: address,
        messageHex: messageHex,
        signature: signature,
        hash: (new String(messageHash)).valueOf(),
        r: (new String(r)).valueOf(),
        s: (new String(s)).valueOf(),
        v: (web3.toDecimal(v) + 27)
    };
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

const getNonce = () => {
    return Math.random().toString(36).substring(7);;
}


module.exports = {
    caoToWei,
    createAndDistributeCoin,
    createCoin,
    distributeCoin,
    signMessage,
    getHashOfCreateData,
    getHashOfDistributeData,
    getHashOfHashDelegatedTransfer,
    getNonce
};