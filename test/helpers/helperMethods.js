const createCoin = async (contractInstance, creationAddresses, amountInWeis) => {
    await contractInstance.startCreation(amountInWeis, { from: creationAddresses[0] });
    await contractInstance.confirmCreation(true, { from: creationAddresses[1] });
    await contractInstance.confirmCreation(true, { from: creationAddresses[2] });
}

const distributeCoin = async (contractInstance, distributionAddresses, amountInWeis, distributeTo) => {
    await contractInstance.startDistribution(distributeTo, amountInWeis, { from: distributionAddresses[0] });
    await contractInstance.confirmDistribution(distributeTo, true, { from: distributionAddresses[1] });
}

const createAndDistributeCoin = async (contractInstance, creationAddresses, distributionAddresses, amountInWeis, distributeTo) => {
    await createCoin(contractInstance, creationAddresses, amountInWeis);
    await distributeCoin(contractInstance, distributionAddresses, amountInWeis, distributeTo);
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

const getHashOfTransaction = async (contractInstance, from, to, value, nonce) => {
    const txHash = await contractInstance.hashDelegatedTransfer.call(
        from,
        to,
        value,
        nonce);
    return txHash;
}

module.exports = {
    caoToWei,
    createAndDistributeCoin,
    createCoin,
    distributeCoin,
    signMessage,
    getHashOfTransaction
};