export const CONTRACT_ADDRESS = '0x1AF27eb775db0425E04fe4502C1bBB1bb97c62E0';

export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "_seller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_buyer",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_units",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_priceINR",
        "type": "uint256"
      }
    ],
    "name": "executeTrade",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];
