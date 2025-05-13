/**
 * Contract configuration utilities
 * This file centralizes blockchain contract addresses and network information
 */

// Main contract address - use the most recently deployed address
export const OUTBREAK_CONTRACT_ADDRESS = "0x07766a4f028C91e307446d0Ba424f5efa1110819";

// Network specific contract addresses
export const NETWORK_CONTRACTS = {
  // Ethereum mainnet
  1: {
    outbreakTracking: "0x07766a4f028C91e307446d0Ba424f5efa1110819" // Replace with mainnet address if deployed
  },
  // Sepolia testnet - updated with correct contract address
  11155111: {
    outbreakTracking: "0xa064c7c657F4Da33C6F99766488cE133c2d8B18E" 
  },
  // Local Ganache
  5777: {
    outbreakTracking: "0xa064c7c657F4Da33C6F99766488cE133c2d8B18E" // Local Ganache deployment
  },
  // Additional networks
  31337: { // Hardhat
    outbreakTracking: "0x07766a4f028C91e307446d0Ba424f5efa1110819"
  }
};

// Helper to get the correct contract address for the current network
export const getContractAddress = (networkId) => {
  if (networkId && NETWORK_CONTRACTS[networkId]) {
    return NETWORK_CONTRACTS[networkId].outbreakTracking;
  }
  // Return fallback address
  return OUTBREAK_CONTRACT_ADDRESS;
};

// New function to help verify contract deployment
export const getContractStatusByNetwork = (networkId) => {
  return {
    address: NETWORK_CONTRACTS[networkId]?.outbreakTracking || 'Not deployed',
    networkName: getNetworkNameById(networkId),
    isConfigured: Boolean(NETWORK_CONTRACTS[networkId])
  };
};

// Helper function to get network name from ID
const getNetworkNameById = (id) => {
  const networks = {
    1: 'Ethereum Mainnet',
    3: 'Ropsten Testnet',
    4: 'Rinkeby Testnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    42: 'Kovan Testnet',
    56: 'BSC Mainnet',
    97: 'BSC Testnet',
    137: 'Polygon Mainnet',
    80001: 'Mumbai Testnet',
    5777: 'Ganache',
    1337: 'Local Network',
    31337: 'Hardhat Network'
  };
  
  return networks[id] || `Unknown Network (ID: ${id})`;
};

export default {
  OUTBREAK_CONTRACT_ADDRESS,
  NETWORK_CONTRACTS,
  getContractAddress,
  getContractStatusByNetwork,
  getNetworkNameById
};
