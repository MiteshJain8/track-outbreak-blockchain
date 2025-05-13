import Web3 from 'web3';
import OutbreakTrackingContract from '../contracts/OutbreakTracking.json';
import { NETWORK_CONTRACTS, getNetworkNameById } from './contractConfig';

/**
 * Utility to verify contract deployments across different networks
 */

export const verifyContractDeployment = async (targetNetworkIds = null) => {
  const results = {
    networks: [],
    success: false,
    message: '',
    timestamp: new Date().toISOString()
  };

  try {
    // Use current provider if available
    const provider = window.ethereum || window.web3?.currentProvider || null;
    
    if (!provider) {
      results.message = 'No web3 provider detected';
      return results;
    }

    const web3 = new Web3(provider);
    const currentNetworkId = await web3.eth.net.getId();
    
    // Determine which networks to check
    let networksToCheck = targetNetworkIds 
      ? (Array.isArray(targetNetworkIds) ? targetNetworkIds : [targetNetworkIds])
      : Object.keys(NETWORK_CONTRACTS).map(id => parseInt(id));
    
    // Always include the current network
    if (!networksToCheck.includes(currentNetworkId)) {
      networksToCheck.push(currentNetworkId);
    }
    
    // Get contract ABI
    const { abi } = OutbreakTrackingContract;
    
    // Check each network
    for (const networkId of networksToCheck) {
      const contractAddress = NETWORK_CONTRACTS[networkId]?.outbreakTracking;
      const networkResult = {
        networkId,
        networkName: getNetworkNameById(networkId),
        contractAddress,
        isCurrent: networkId === currentNetworkId,
        configured: Boolean(contractAddress),
        deployed: false,
        bytecodeLength: 0,
        error: null
      };
      
      if (contractAddress) {
        try {
          // For the current network, use the current provider
          // For other networks, we'd need to use a network-specific provider - skipped for simplicity
          if (networkId === currentNetworkId) {
            try {
              const code = await web3.eth.getCode(contractAddress);
              networkResult.deployed = code !== '0x' && code !== '0x0';
              networkResult.bytecodeLength = code.length;
              
              if (networkResult.deployed) {
                // Try a simple contract call to verify it's working
                const contract = new web3.eth.Contract(abi, contractAddress);
                try {
                  const count = await contract.methods.getInfectedCount().call();
                  networkResult.infectedCount = parseInt(count);
                  networkResult.contractFunctional = true;
                } catch (callError) {
                  networkResult.contractFunctional = false;
                  networkResult.error = `Contract call failed: ${callError.message}`;
                }
              }
            } catch (codeError) {
              networkResult.error = `Failed to get code: ${codeError.message}`;
            }
          } else {
            networkResult.message = 'Network not currently connected';
          }
        } catch (error) {
          networkResult.error = error.message;
        }
      }
      
      results.networks.push(networkResult);
    }
    
    // Set overall success if at least the current network is deployed
    const currentNetworkResult = results.networks.find(n => n.isCurrent);
    results.success = currentNetworkResult?.deployed || false;
    results.currentNetwork = currentNetworkResult;
    
  } catch (error) {
    results.message = `Verification failed: ${error.message}`;
  }
  
  return results;
};

export default { verifyContractDeployment };
