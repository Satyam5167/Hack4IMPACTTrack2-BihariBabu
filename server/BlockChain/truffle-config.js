require('dotenv').config({ path: '../.env' });
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",     
     port: 8545,            
     network_id: "*",       
    },
    sepolia: {
      provider: () => new HDWalletProvider(
        process.env.M_PRIVATE_KEY,
        process.env.RPC_URL
      ),
      network_id: 11155111,       // Sepolia's id
      gas: 4465030,
      confirmations: 2,           // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,         // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true,           // Skip dry run before migrations? (default: false for public nets )
      networkCheckTimeout: 1000000 // Increase check timeout
    }
  },
  compilers: {
    solc: {
      version: "0.8.20",      
    }
  }
};
