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
      provider: () => {
        const provider = new HDWalletProvider({
          privateKeys: [process.env.M_PRIVATE_KEY],
          providerOrUrl: process.env.RPC_URL,   // Must be HTTPS, not WSS
          pollingInterval: 8000,                 // ← fixes PollingBlockTracker spam
        });
        return provider;
      },
      network_id: 11155111,
      gas: 4465030,
      gasPrice: 20000000000,          // 20 gwei — add explicit gasPrice
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      networkCheckTimeout: 1000000,
    }
  },
  compilers: {
    solc: {
      version: "0.8.20",
    }
  },
  // Suppress Web3 deprecation + PollingBlockTracker noise
  mocha: {
    timeout: 100000
  }
};