import { Web3 } from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure environment variables are loaded (important for ES modules hoisting)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Web3 using the RPC URL from .env
const rpcUrl = process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

// Load ABI and Address from Truffle build directory
const contractPath = path.resolve(__dirname, '../BlockChain/build/contracts/EnergyTrade.json');
let contractAbi = [];
let contractAddress = process.env.DEPLOYED_SMART_CONTRACT;

try {
  if (fs.existsSync(contractPath)) {
    const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    contractAbi = contractData.abi;
    
    // Auto-detect address from network if not explicitly set in .env
    if (!contractAddress && contractData.networks) {
      const networks = Object.keys(contractData.networks);
      if (networks.length > 0) {
        // Use the latest deployed network address
        const latestNetwork = networks[networks.length - 1];
        contractAddress = contractData.networks[latestNetwork].address;
      }
    }
    console.log(`Loaded EnergyTrade ABI from ${contractPath}`);
  } else {
    console.warn(`Contract JSON not found at ${contractPath}. Using fallback ABI.`);
    // Basic ABI fallback if JSON not built yet
    contractAbi = [
      {
        "inputs": [
          { "internalType": "address payable", "name": "_seller", "type": "address" },
          { "internalType": "uint256", "name": "_units", "type": "uint256" },
          { "internalType": "uint256", "name": "_priceINR", "type": "uint256" }
        ],
        "name": "executeTrade",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      }
    ];
  }
} catch (err) {
  console.error('Error loading contract JSON:', err);
}



// Ensure private key is properly prefixed with '0x'
const privateKeyString = process.env.M_PRIVATE_KEY || '';
const privateKey = privateKeyString.startsWith('0x') ? privateKeyString : `0x${privateKeyString}`;

// Set up the admin account (the relayer)
let adminAccount = null;
if (privateKeyString.length > 0) {
    adminAccount = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(adminAccount);
    console.log(`Admin account set: ${adminAccount.address}`);
}

const contract = new web3.eth.Contract(contractAbi, contractAddress);

/**
 * Execute a trade on-chain from the backend.
 * The backend admin wallet pays the ETH to the seller.
 */
export const processTradeOnChain = async (sellerAddress, buyerAddress, units, priceINR, ethAmountNeeded) => {
  if (!adminAccount) {
    throw new Error('Admin wallet private key not configured properly.');
  }

  try {
    const valueInWei = web3.utils.toWei(ethAmountNeeded.toString(), 'ether');
    
    // Create the transaction
    const tx = contract.methods.executeTrade(
      sellerAddress,
      buyerAddress,
      Math.floor(units),
      Math.floor(priceINR)
    );

    // Estimate gas
    const gas = await tx.estimateGas({ from: adminAccount.address, value: valueInWei });
    const gasPrice = await web3.eth.getGasPrice();

    // Send the transaction and wait for receipt
    const receipt = await tx.send({
      from: adminAccount.address,
      gas: gas,
      gasPrice: gasPrice,
      value: valueInWei
    });

    console.log('Transaction successful with hash:', receipt.transactionHash);
    return receipt.transactionHash;
  } catch (err) {
    console.error('Web3 Transaction failed:', err);
    throw new Error('Blockchain transaction failed: ' + err.message);
  }
};

/**
 * Verify a transaction on-chain by its hash.
 * Ensures the transaction was successful and matches expectation.
 */
export const verifyTransaction = async (txHash, expectedEthAmount) => {
  try {
    const tx = await web3.eth.getTransaction(txHash);
    const receipt = await web3.eth.getTransactionReceipt(txHash);

    if (!tx || !receipt || !receipt.status) {
      return { valid: false, error: 'Transaction failed or not found' };
    }

    // Verify the amount sent (allowing for larger UI exchange rate tolerance)
    const valEth = web3.utils.fromWei(tx.value, 'ether');
    const diff = Math.abs(parseFloat(valEth) - parseFloat(expectedEthAmount));
    if (diff > 0.05) {
      console.warn(`Value mismatch warned: expected ${expectedEthAmount}, found ${valEth}. Diff: ${diff}`);
      return { valid: false, error: `Value mismatch: expected ${expectedEthAmount}, found ${valEth}` };
    }

    // Verify it was sent to our contract
    if (tx.to && tx.to.toLowerCase() !== contractAddress.toLowerCase()) {
      return { valid: false, error: 'Transaction directed to wrong contract' };
    }

    return { 
      valid: true, 
      from: tx.from, 
      to: tx.to,
      value: valEth,
      hash: txHash 
    };
  } catch (err) {
    console.error('on-chain verification failed:', err);
    return { valid: false, error: err.message };
  }
};
