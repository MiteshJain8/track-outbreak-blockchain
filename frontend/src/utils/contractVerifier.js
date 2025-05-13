import Web3 from 'web3';
import OutbreakTrackingContract from '../contracts/OutbreakTracking.json';
import { diagnoseContract as blockchainDiagnostic } from './blockchain';
import { OUTBREAK_CONTRACT_ADDRESS, NETWORK_CONTRACTS } from './contractConfig';

// Contract verification - tries to call the methods directly
export const verifyContractMethods = async () => {
  try {
    // Connect to the blockchain
    const web3 = new Web3(window.ethereum || 'http://127.0.0.1:7545');
    
    // Check network connection
    const networkId = await web3.eth.net.getId();
    console.log("Connected to network:", networkId);
    
    // Get the contract ABI
    const { abi } = OutbreakTrackingContract;
    console.log("Contract ABI methods:", abi.filter(item => item.type === 'function').map(fn => fn.name));
    
    // Look for the specific method
    const getAllLocationsMethod = abi.find(item => 
      item.type === 'function' && 
      item.name === 'getAllOutbreakLocations'
    );
    console.log("getAllOutbreakLocations signature:", getAllLocationsMethod);
    
    // Get the contract address from the network or hardcoded value
    const deployedNetwork = OutbreakTrackingContract.networks[networkId];
    
    // Try multiple possible contract addresses
    const possibleAddresses = [
      deployedNetwork?.address,
      OutbreakTrackingContract.networks["5777"]?.address, // Check if Ganache deployment exists
      NETWORK_CONTRACTS[networkId]?.outbreakTracking, // Get network specific address
      OUTBREAK_CONTRACT_ADDRESS  // Fallback to our main address
    ].filter(Boolean); // Remove undefined entries
    
    console.log("Possible contract addresses:", possibleAddresses);
    
    // Try each address until one works
    let contractAddress = null;
    let contract = null;
    
    for (const address of possibleAddresses) {
      try {
        // Check if contract code exists at address
        const code = await web3.eth.getCode(address);
        if (code !== '0x' && code !== '0x0') {
          console.log(`Found contract code at address: ${address}`);
          contractAddress = address;
          contract = new web3.eth.Contract(abi, address);
          break;
        } else {
          console.log(`No contract code found at address: ${address}`);
        }
      } catch (e) {
        console.warn(`Error checking address ${address}:`, e.message);
      }
    }
    
    if (!contract || !contractAddress) {
      return {
        success: false,
        networkId,
        contractAddress: possibleAddresses[0] || "Not found",
        methods: abi.filter(item => item.type === 'function').map(fn => fn.name),
        error: "No contract code found at any of the possible addresses"
      };
    }
    
    // Verify basic read methods
    const infectedCount = await contract.methods.getInfectedCount().call()
      .catch(e => { 
        console.error("Error calling getInfectedCount:", e); 
        return "Error";
      });
      
    const outbreakCount = await contract.methods.getOutbreakLocationsCount().call()
      .catch(e => { 
        console.error("Error calling getOutbreakLocationsCount:", e); 
        return "Error";
      });
    
    console.log("Infected count:", infectedCount);
    console.log("Outbreak locations count:", outbreakCount);
    
    // Try to get all outbreak locations
    try {
      const result = await contract.methods.getAllOutbreakLocations().call();
      console.log("getAllOutbreakLocations result:", result);
      return {
        success: true,
        networkId,
        contractAddress,
        methods: abi.filter(item => item.type === 'function').map(fn => fn.name),
        infectedCount: typeof infectedCount === 'string' ? infectedCount : parseInt(infectedCount),
        outbreakCount: typeof outbreakCount === 'string' ? outbreakCount : parseInt(outbreakCount),
        locations: result?.locations || [],
        counts: result?.counts || []
      };
    } catch (error) {
      console.error("Error calling getAllOutbreakLocations:", error);
      
      // If the main method fails, try to get locations individually
      try {
        const count = parseInt(outbreakCount);
        if (count > 0 && count < 100) {
          console.log("Trying to access individual outbreak locations");
          
          const locationsArray = [];
          const countsArray = [];
          
          for (let i = 0; i < count; i++) {
            try {
              const location = await contract.methods.outbreakLocations(i).call();
              locationsArray.push(location.location);
              countsArray.push(parseInt(location.infectedCount));
            } catch (e) {
              console.error(`Error accessing location ${i}:`, e);
            }
          }
          
          return {
            success: true,
            networkId,
            contractAddress,
            methods: abi.filter(item => item.type === 'function').map(fn => fn.name),
            infectedCount: typeof infectedCount === 'string' ? infectedCount : parseInt(infectedCount),
            outbreakCount: typeof outbreakCount === 'string' ? outbreakCount : parseInt(outbreakCount),
            locations: locationsArray,
            counts: countsArray,
            note: "Retrieved individually, not from getAllOutbreakLocations"
          };
        }
      } catch (e) {
        console.error("Error retrieving locations individually:", e);
      }
      
      return {
        success: false,
        networkId,
        contractAddress,
        methods: abi.filter(item => item.type === 'function').map(fn => fn.name),
        infectedCount: typeof infectedCount === 'string' ? infectedCount : parseInt(infectedCount),
        outbreakCount: typeof outbreakCount === 'string' ? outbreakCount : parseInt(outbreakCount),
        error: error.message
      };
    }
  } catch (error) {
    console.error("Contract verification failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check the contract for valid ABI and methods
export const validateContractABI = () => {
  try {
    // Get the ABI
    const { abi } = OutbreakTrackingContract;
    
    // Check if ABI exists and is an array
    if (!abi || !Array.isArray(abi) || abi.length === 0) {
      return {
        valid: false,
        message: "ABI is missing or empty"
      };
    }
    
    // Check for required methods
    const requiredMethods = [
      'getAllOutbreakLocations',
      'getInfectedCount',
      'getOutbreakLocationsCount',
      'reportInfection',
      'checkProximity',
      'reportNewLocation'
    ];
    
    const foundMethods = requiredMethods.map(method => {
      const found = abi.some(item => 
        item.type === 'function' && 
        item.name === method
      );
      return { method, found };
    });
    
    const missingMethods = foundMethods.filter(item => !item.found).map(item => item.method);
    
    return {
      valid: missingMethods.length === 0,
      methods: abi.filter(item => item.type === 'function').map(fn => fn.name),
      missingMethods,
      events: abi.filter(item => item.type === 'event').map(e => e.name)
    };
  } catch (error) {
    return {
      valid: false,
      message: error.message
    };
  }
};

// Proxy function to use the blockchain.js diagnoseContract
export const diagnoseContract = async () => {
  return await blockchainDiagnostic();
};

export default { verifyContractMethods, validateContractABI, diagnoseContract };
