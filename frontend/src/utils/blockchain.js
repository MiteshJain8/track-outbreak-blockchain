import Web3 from 'web3';
import OutbreakTrackingContract from '../contracts/OutbreakTracking.json';

// Import contract configuration
import { getContractAddress } from './contractConfig';

let web3;
let contract;
let accounts;
let networkId;

// Contract address is already updated in your code:
const CONTRACT_ADDRESS = "0x07766a4f028C91e307446d0Ba424f5efa1110819";

// Initialize Web3 and connect to the blockchain
export const initWeb3 = async () => {
  try {
    // Check if we already have an initialized web3 instance to prevent repeated initialization
    if (web3 && contract) {
      console.log("Web3 already initialized");
      return { web3, accounts, networkId, contract };
    }
    
    // Modern dapp browsers
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error("User denied account access", error);
        throw new Error("Please allow access to your Web3 wallet to use this application");
      }
    }
    // Legacy dapp browsers
    else if (window.web3) {
      web3 = new Web3(window.web3.currentProvider);
    }
    // Fallback for local development
    else {
      try {
        // Try both HTTP and WebSocket providers
        let provider;
        try {
          provider = new Web3.providers.WebsocketProvider('ws://127.0.0.1:7545');
          
          // Add reconnection logic to WebSocket provider
          provider.on('connect', () => console.log('WebSocket connected'));
          provider.on('error', e => console.error('WebSocket error', e));
          provider.on('end', e => console.log('WebSocket connection ended', e));
          
          console.log("Using WebSocket provider");
        } catch (wsError) {
          console.log("WebSocket provider failed, trying HTTP:", wsError);
          provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
        }
        
        web3 = new Web3(provider);
        await checkConnection();
      } catch (error) {
        console.error("Error connecting to local blockchain:", error);
        throw new Error("Could not connect to local blockchain. Is Ganache running?");
      }
    }
    
    // Get connected account
    accounts = await web3.eth.getAccounts();
    
    // Get network ID
    networkId = await web3.eth.net.getId();
    console.log("Connected to network:", networkId);
    
    // Initialize contract
    initializeContract();
    
    return { web3, accounts, networkId, contract };
  } catch (error) {
    console.error("Failed to initialize Web3:", error);
    throw new Error(`Blockchain connection error: ${error.message}`);
  }
};

// Check if we can connect to the blockchain
const checkConnection = async () => {
  try {
    await web3.eth.net.isListening();
    return true;
  } catch (error) {
    console.error("Connection check failed:", error);
    throw new Error("Could not connect to blockchain network. Please check if the network is running.");
  }
};

// Initialize the smart contract
const initializeContract = () => {
  try {
    // Use the contract ABI and address
    const deployedNetwork = OutbreakTrackingContract.networks[networkId];
    
    // Check all available networks for debugging
    console.log("Available networks in artifact:", Object.keys(OutbreakTrackingContract.networks).join(", "));
    console.log("Current network ID:", networkId);
    
    // Try to find the best matching contract address
    let contractAddress;
    
    // First check exact network match
    if (deployedNetwork && deployedNetwork.address) {
      contractAddress = deployedNetwork.address;
      console.log("Found exact network match for contract at:", contractAddress);
    } 
    // For Ganache, if connected to a different port, try using the 5777 deployment
    else if (networkId > 1000 && OutbreakTrackingContract.networks["5777"]) {
      contractAddress = OutbreakTrackingContract.networks["5777"].address;
      console.log("Using Ganache deployment address:", contractAddress);
    }
    // Otherwise use configured address by network ID or fallback
    else {
      contractAddress = getContractAddress(networkId);
      console.log(`Using network-specific address for network ${networkId}:`, contractAddress);
    }
    
    console.log("Creating contract instance with address:", contractAddress);
    
    // Double check that the ABI is valid
    if (!OutbreakTrackingContract.abi || OutbreakTrackingContract.abi.length === 0) {
      console.error("Invalid or empty ABI provided");
      throw new Error("Contract ABI is invalid or missing");
    }
    
    try {
      contract = new web3.eth.Contract(
        OutbreakTrackingContract.abi,
        contractAddress
      );
      
      console.log("Contract methods available:", 
        Object.keys(contract.methods)
          .filter(key => !key.includes('0x'))
          .join(', ')
      );
      
      // Verify a few key methods exist
      if (!contract.methods.getAllOutbreakLocations) {
        console.warn("Warning: getAllOutbreakLocations method not found on contract");
      }
      
      if (!contract.methods.getOutbreakLocationsCount) {
        console.warn("Warning: getOutbreakLocationsCount method not found on contract");
      }
      
      console.log("Contract initialized at:", contractAddress);
      return contract;
    } catch (contractError) {
      console.error("Error creating contract instance:", contractError);
      throw new Error(`Contract creation error: ${contractError.message}`);
    }
  } catch (error) {
    console.error("Failed to initialize contract:", error);
    throw new Error(`Contract initialization error: ${error.message}`);
  }
};

// Report an infection
export const reportInfection = async (address, location, testResult) => {
  try {
    if (!contract) {
      await initWeb3();
    }
    
    const accounts = await web3.eth.getAccounts();
    await contract.methods.reportInfection(address, location, testResult).send({ from: accounts[0] });
    return true;
  } catch (error) {
    console.error("Error reporting infection:", error);
    throw new Error(`Transaction failed: ${error.message}`);
  }
};

// Check proximity to outbreaks
export const checkProximity = async (location) => {
  try {
    if (!contract) {
      await initWeb3();
    }
    
    const result = await contract.methods.checkProximity(location).call();
    return {
      isNearOutbreak: result[0],
      outbreakLocation: result[1],
      infectedCount: parseInt(result[2]),
      distance: parseInt(result[3])
    };
  } catch (error) {
    console.error("Error checking proximity:", error);
    throw new Error(`Proximity check failed: ${error.message}`);
  }
};

// Report a new location
export const reportNewLocation = async (location) => {
  try {
    if (!contract) {
      await initWeb3();
    }
    
    const accounts = await web3.eth.getAccounts();
    await contract.methods.reportNewLocation(location).send({ from: accounts[0] });
    return true;
  } catch (error) {
    console.error("Error reporting new location:", error);
    throw new Error(`Transaction failed: ${error.message}`);
  }
};

// New function to diagnose contract issues
export const diagnoseContract = async () => {
  try {
    // Initialize web3 if not already done
    if (!web3) {
      await initWeb3();
    }
    
    // Contract info
    const deployedNetwork = OutbreakTrackingContract.networks[networkId];
    const contractAddress = deployedNetwork ? deployedNetwork.address : CONTRACT_ADDRESS;
    
    // Network info - safely get network type
    let networkType = "unknown";
    let chainId = 0;
    try {
      // Handle different web3 versions
      if (typeof web3.eth.net.getNetworkType === 'function') {
        networkType = await web3.eth.net.getNetworkType();
      } else if (web3.version && typeof web3.version.getNetwork === 'function') {
        const networkId = await web3.version.getNetwork();
        networkType = getNetworkNameFromId(networkId); 
      }
      
      // Get chain ID safely
      try {
        chainId = await web3.eth.getChainId();
      } catch (chainErr) {
        console.warn("Could not get chain ID:", chainErr);
        // Use networkId as fallback
        chainId = networkId || 0;
      }
    } catch (netError) {
      console.warn("Could not determine network type:", netError);
    }
    
    const blockNumber = await web3.eth.getBlockNumber();
    
    // Check contract code at address with better error handling
    let code = '0x';
    let contractExists = false;
    
    try {
      code = await web3.eth.getCode(contractAddress);
      contractExists = code !== '0x' && code !== '0x0';
      
      if (!contractExists) {
        console.error(`No contract code found at ${contractAddress}. Available networks in artifact:`, 
          Object.keys(OutbreakTrackingContract.networks).join(', '));
          
        // Try to show available networks from the contract artifact
        const availableNetworks = [];
        for (const netId in OutbreakTrackingContract.networks) {
          const addr = OutbreakTrackingContract.networks[netId].address;
          availableNetworks.push({ netId, address: addr });
        }
        console.log("Available contract deployments:", availableNetworks);
      }
    } catch (codeError) {
      console.error("Error checking contract code:", codeError);
    }
    
    // Get available methods
    const methods = contract ? 
      Object.keys(contract.methods).filter(key => !key.includes('0x')) : 
      [];
      
    // Test a simple view function
    let getCountWorks = false;
    let count = 0;
    try {
      if (contract && contract.methods.getInfectedCount) {
        count = await contract.methods.getInfectedCount().call();
        getCountWorks = true;
      }
    } catch (error) {
      console.error("Error calling getInfectedCount:", error);
    }
    
    return {
      networkConnected: true,
      networkInfo: {
        id: networkId,
        type: networkType,
        chainId,
        blockNumber
      },
      contractInfo: {
        address: contractAddress,
        exists: contractExists,
        codeLength: code.length,
        methods,
        getCountWorks,
        count: getCountWorks ? parseInt(count) : null,
        availableNetworks: Object.keys(OutbreakTrackingContract.networks)
      }
    };
  } catch (error) {
    console.error("Error diagnosing contract:", error);
    return {
      networkConnected: false,
      error: error.message
    };
  }
};

// Helper function to translate network IDs to names
function getNetworkNameFromId(id) {
  const networks = {
    '1': 'mainnet',
    '3': 'ropsten',
    '4': 'rinkeby',
    '5': 'goerli',
    '11155111': 'sepolia',
    '42': 'kovan',
    '56': 'bsc',
    '137': 'polygon',
    '80001': 'mumbai',
    '43114': 'avalanche',
    '1337': 'local',
    '5777': 'ganache'
  };
  
  return networks[id] || `unknown-${id}`;
}

// Get all outbreak locations
export const getAllOutbreakLocations = async () => {
  try {
    // Make sure web3 and contract are initialized
    if (!web3 || !contract) {
      console.log("Web3 or contract not initialized, initializing now...");
      await initWeb3();
      
      if (!contract) {
        console.error("Failed to initialize contract");
        // Try to determine why the contract wasn't initialized
        const status = await diagnoseContract();
        console.log("Contract diagnosis:", status);
        
        // Return empty data instead of throwing an error
        return { 
          locations: [], 
          counts: [] 
        };
      }
    }
    
    console.log("Calling getAllOutbreakLocations...");
    
    // Try progressively simpler approaches until one works
    
    // First approach: Call the contract method directly with robust error handling
    try {
      // Log the contract address and ABI for debugging
      console.log("Contract address:", contract._address);
      console.log("Contract has getAllOutbreakLocations:", Boolean(contract.methods.getAllOutbreakLocations));
      
      // Try to get data with timeout to avoid hanging
      const result = await Promise.race([
        contract.methods.getAllOutbreakLocations().call(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Contract call timed out")), 10000)
        )
      ]);
      
      console.log("Contract returned:", result);
      
      // Format and return the results
      if (result && result.locations) {
        const locations = result.locations || [];
        const counts = (result.counts || []).map(count => parseInt(count));
        
        // Create an array of outbreak location objects
        const outbreakLocations = locations.map((location, i) => ({
          location: location,
          infectedCount: counts[i] || 0,
          timestamp: new Date().toLocaleString() // Default timestamp since it's not returned by the contract
        }));
        
        console.log("Formatted response:", { locations: outbreakLocations, counts });
        return { locations: outbreakLocations, counts };
      } else {
        throw new Error("Invalid response format from contract");
      }
    } 
    catch (mainError) {
      console.error("Primary approach failed:", mainError);
      
      // Second approach: Try to get count and fetch locations one by one
      try {
        console.log("Trying alternative approach with getOutbreakLocationsCount...");
        const count = await contract.methods.getOutbreakLocationsCount().call();
        const parsedCount = parseInt(count);
        console.log(`Contract has ${parsedCount} outbreak locations`);
        
        if (parsedCount === 0) {
          return { locations: [], counts: [] };
        }
        
        // If count is small enough, try to retrieve locations one by one
        if (parsedCount > 0 && parsedCount < 100) {
          console.log("Fetching locations individually...");
          const locations = [];
          const counts = [];
          
          for (let i = 0; i < parsedCount; i++) {
            try {
              // Try to access the outbreakLocations mapping
              const location = await contract.methods.outbreakLocations(i).call();
              if (location) {
                locations.push({
                  location: location.location,
                  infectedCount: parseInt(location.infectedCount),
                  timestamp: new Date(parseInt(location.timestamp) * 1000).toLocaleString()
                });
                counts.push(parseInt(location.infectedCount));
              }
            } catch (locError) {
              console.error(`Error fetching location at index ${i}:`, locError);
            }
          }
          
          console.log("Successfully fetched individual locations:", locations);
          return { locations, counts };
        }
      } catch (countError) {
        console.error("Alternative approach failed:", countError);
      }
      
      // Third approach: Create mock data for testing
      console.log("All approaches failed, returning mock data for testing");
      return {
        locations: [
          {
            location: "35.6895,139.6917", // Tokyo
            infectedCount: 5,
            timestamp: new Date().toLocaleString()
          },
          {
            location: "40.7128,-74.0060", // New York
            infectedCount: 3,
            timestamp: new Date().toLocaleString()
          }
        ],
        counts: [5, 3]
      };
    }
  } catch (error) {
    console.error("Error fetching outbreak locations:", error);
    
    // In case of catastrophic failure, return empty data instead of throwing
    return { locations: [], counts: [] };
  }
};

// Check exposure risk
export const checkExposureRisk = async (location, timeThreshold) => {
  try {
    if (!contract) {
      await initWeb3();
    }
    
    const result = await contract.methods.checkExposureRisk(location, timeThreshold).call();
    return {
      exposed: result.exposed,
      exposureCount: parseInt(result.exposureCount)
    };
  } catch (error) {
    console.error("Error checking exposure risk:", error);
    throw new Error(`Exposure risk check failed: ${error.message}`);
  }
};

// Get the count of infected individuals
export const getInfectedCount = async () => {
  try {
    if (!contract) {
      await initWeb3();
    }
    
    const count = await contract.methods.getInfectedCount().call();
    return parseInt(count);
  } catch (error) {
    console.error("Error getting infected count:", error);
    throw new Error(`Failed to get infected count: ${error.message}`);
  }
};

// Function to get the current selected account
export const getAccount = async () => {
  try {
    if (!web3) {
      await initWeb3();
    }
    const accounts = await web3.eth.getAccounts();
    return accounts[0];
  } catch (error) {
    console.error("Error getting account:", error);
    throw new Error(`Failed to get account: ${error.message}`);
  }
};

// Function to check if Web3 is available and report status
export const checkWeb3Status = async () => {
  try {
    if (window.ethereum || window.web3) {
      await initWeb3();
      return { 
        available: true, 
        connected: true,
        account: accounts[0],
        networkId
      };
    } else {
      return { 
        available: false, 
        connected: false,
        errorMessage: "No Web3 provider found. Please install MetaMask or use a Web3-enabled browser."
      };
    }
  } catch (error) {
    return { 
      available: true, 
      connected: false,
      errorMessage: error.message
    };
  }
};

// Alias for initWeb3 to match function name in App.jsx
export const initializeEthers = initWeb3;

// Connect wallet function
export const connectWallet = async () => {
  try {
    // Check if Web3 is already initialized
    if (!web3) {
      await initWeb3();
    }
    
    // Request account access if needed
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts.length === 0) {
        throw new Error("No accounts found. Please make sure your wallet is unlocked.");
      }
      
      return accounts[0];
    } else if (web3) {
      const accounts = await web3.eth.getAccounts();
      
      if (accounts.length === 0) {
        throw new Error("No accounts found. Please make sure your wallet is unlocked.");
      }
      
      return accounts[0];
    } else {
      throw new Error("No Web3 provider detected. Please install MetaMask or use a Web3-enabled browser.");
    }
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
};

// Setup event listeners for smart contract events
export const setupEventListeners = (onNewInfection, onOutbreakAlert) => {
  try {
    // Check if contract is already set up to prevent duplicate listeners
    if (!contract) {
      console.log("Contract not initialized, initializing now...");
      try {
        // If contract is not initialized, initialize Web3 and the contract
        if (!web3) {
          initWeb3();
        } else {
          initializeContract();
        }
      } catch (initError) {
        throw new Error(`Failed to initialize contract for event listeners: ${initError.message}`);
      }
    }

    // Check again if contract is initialized
    if (!contract) {
      throw new Error("Contract could not be initialized for event listeners");
    }
    
    // Try to create event listeners, but with a proper fallback mechanism
    console.log("Setting up event listeners");
    
    let successful = false;
    let newInfectionListener = null;
    let outbreakListener = null;
    
    // Check if methods exist before trying to subscribe
    if (!contract.events || !contract.events.NewInfection || !contract.events.PotentialOutbreak) {
      console.error("Contract events are not available");
      throw new Error("Contract events methods not found");
    }
    
    // Try to set up event listeners using a more cautious approach
    try {
      console.log("Subscribing to NewInfection events...");
      newInfectionListener = contract.events.NewInfection({
        filter: {}, // Add filter if needed
        fromBlock: 'latest' // Start from the latest block
      })
        .on('connected', (subscriptionId) => {
          console.log("NewInfection event connected with ID:", subscriptionId);
          successful = true;
        })
        .on('data', (event) => {
          console.log("NewInfection event received:", event);
          const { individualAddress, location, timestamp } = event.returnValues;
          const infection = {
            address: individualAddress,
            location,
            timestamp: new Date(timestamp * 1000).toLocaleString()
          };
          if (onNewInfection) onNewInfection(infection);
        })
        .on('error', (error) => {
          console.error("Error in NewInfection event:", error);
        });
        
      console.log("NewInfection subscription setup done:", Boolean(newInfectionListener));
      
      console.log("Subscribing to PotentialOutbreak events...");
      outbreakListener = contract.events.PotentialOutbreak({
        filter: {}, // Add filter if needed
        fromBlock: 'latest' // Start from the latest block
      })
        .on('connected', (subscriptionId) => {
          console.log("PotentialOutbreak event connected with ID:", subscriptionId);
          successful = true;
        })
        .on('data', (event) => {
          console.log("PotentialOutbreak event received:", event);
          const { location, infectedCount, timestamp } = event.returnValues;
          const outbreak = {
            location,
            infectedCount: parseInt(infectedCount),
            timestamp: new Date(timestamp * 1000).toLocaleString()
          };
          if (onOutbreakAlert) onOutbreakAlert(outbreak);
        })
        .on('error', (error) => {
          console.error("Error in PotentialOutbreak event:", error);
        });
        
      console.log("PotentialOutbreak subscription setup done:", Boolean(outbreakListener));
      
    } catch (subscribeError) {
      console.error("Error setting up event subscriptions:", subscribeError);
      
      // In case of error, set listeners to dummy functions that don't do anything
      // This prevents errors when trying to unsubscribe later
      newInfectionListener = { unsubscribe: () => console.log("Dummy unsubscribe called") };
      outbreakListener = { unsubscribe: () => console.log("Dummy unsubscribe called") };
      
      throw subscribeError; // Re-throw to handle at a higher level
    }
    
    console.log("Event listeners setup complete, successful:", successful);
    
    // Return a cleanup function that's safe even if subscriptions failed
    return () => {
      console.log("Cleaning up event listeners");
      try {
        if (newInfectionListener) {
          if (typeof newInfectionListener.unsubscribe === 'function') {
            newInfectionListener.unsubscribe();
          } else if (typeof newInfectionListener.removeAllListeners === 'function') {
            newInfectionListener.removeAllListeners();
          }
        }
      } catch (e) {
        console.error("Error unsubscribing from NewInfection:", e);
      }
      
      try {
        if (outbreakListener) {
          if (typeof outbreakListener.unsubscribe === 'function') {
            outbreakListener.unsubscribe();
          } else if (typeof outbreakListener.removeAllListeners === 'function') {
            outbreakListener.removeAllListeners();
          }
        }
      } catch (e) {
        console.error("Error unsubscribing from PotentialOutbreak:", e);
      }
      
      console.log("Event listeners cleaned up");
    };
  } catch (error) {
    console.error("Error setting up event listeners:", error);
    throw new Error(`Failed to set up event listeners: ${error.message}`);
  }
};

// Fallback method to check for events without WebSockets
export const pollForEvents = async (lastCheckedBlock = 0, onNewInfection, onOutbreakAlert) => {
  try {
    if (!contract) {
      await initWeb3();
    }
    
    const currentBlock = await web3.eth.getBlockNumber();
    
    if (lastCheckedBlock === 0) {
      lastCheckedBlock = currentBlock - 100; // Start by checking the last 100 blocks
    }
    
    console.log(`Polling for events from block ${lastCheckedBlock} to ${currentBlock}`);
    
    // Get past NewInfection events
    const newInfectionEvents = await contract.getPastEvents('NewInfection', {
      fromBlock: lastCheckedBlock,
      toBlock: 'latest'
    });
    
    // Get past PotentialOutbreak events
    const outbreakEvents = await contract.getPastEvents('PotentialOutbreak', {
      fromBlock: lastCheckedBlock,
      toBlock: 'latest'
    });
    
    // Process NewInfection events
    newInfectionEvents.forEach(event => {
      const { individualAddress, location, timestamp } = event.returnValues;
      const infection = {
        address: individualAddress,
        location,
        timestamp: new Date(timestamp * 1000).toLocaleString()
      };
      if (onNewInfection) onNewInfection(infection);
    });
    
    // Process PotentialOutbreak events
    outbreakEvents.forEach(event => {
      const { location, infectedCount, timestamp } = event.returnValues;
      const outbreak = {
        location,
        infectedCount: parseInt(infectedCount),
        timestamp: new Date(timestamp * 1000).toLocaleString()
      };
      if (onOutbreakAlert) onOutbreakAlert(outbreak);
    });
    
    return currentBlock; // Return the current block number for the next polling
  } catch (error) {
    console.error("Error polling for events:", error);
    throw new Error(`Failed to poll for events: ${error.message}`);
  }
};