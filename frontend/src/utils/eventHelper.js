import Web3 from 'web3';

/**
 * Creates a subscription to contract events with proper error handling
 * and fallback to polling if subscription fails
 * 
 * @param {Object} contract - Web3 contract instance
 * @param {String} eventName - Name of the event to subscribe to
 * @param {Object} options - Event filter options
 * @param {Function} onData - Callback for event data
 * @param {Function} onError - Callback for errors
 * @returns {Object} - An object with subscription cleanup methods
 */
export const createSafeEventSubscription = (contract, eventName, options = {}, onData, onError) => {
  if (!contract || !contract.events || !contract.events[eventName]) {
    console.error(`Event ${eventName} not found on contract`);
    return {
      unsubscribe: () => {},
      isActive: false
    };
  }
  
  // Store the last checked block for polling fallback
  let lastCheckedBlock = 0;
  let subscription = null;
  let pollingInterval = null;
  let isSubscriptionActive = false;
  
  // Attempt to create a real-time subscription
  try {
    console.log(`Subscribing to ${eventName} events...`);
    subscription = contract.events[eventName](options)
      .on('connected', (subId) => {
        console.log(`${eventName} subscription connected with ID:`, subId);
        isSubscriptionActive = true;
      })
      .on('data', (event) => {
        console.log(`${eventName} event received:`, event);
        if (onData) onData(event);
      })
      .on('error', (error) => {
        console.error(`Error in ${eventName} event:`, error);
        isSubscriptionActive = false;
        if (onError) onError(error);
        
        // If subscription fails, fall back to polling
        setupPolling();
      });
  } catch (error) {
    console.error(`Failed to subscribe to ${eventName} events:`, error);
    // Fall back to polling if subscription fails
    setupPolling();
  }
  
  // Setup polling as a fallback
  const setupPolling = async () => {
    if (pollingInterval) clearInterval(pollingInterval);
    
    try {
      // Get current block to start polling from
      const web3 = new Web3(window.ethereum || 'http://localhost:7545');
      lastCheckedBlock = await web3.eth.getBlockNumber();
      console.log(`Setting up polling for ${eventName} events starting from block ${lastCheckedBlock}`);
      
      // Poll for past events every 10 seconds
      pollingInterval = setInterval(async () => {
        try {
          const currentBlock = await web3.eth.getBlockNumber();
          if (currentBlock > lastCheckedBlock) {
            console.log(`Polling for ${eventName} events from block ${lastCheckedBlock} to ${currentBlock}`);
            
            const events = await contract.getPastEvents(eventName, {
              fromBlock: lastCheckedBlock,
              toBlock: currentBlock
            });
            
            events.forEach(event => {
              console.log(`${eventName} event found via polling:`, event);
              if (onData) onData(event);
            });
            
            lastCheckedBlock = currentBlock;
          }
        } catch (error) {
          console.error(`Error polling for ${eventName} events:`, error);
          if (onError) onError(error);
        }
      }, 10000); // Poll every 10 seconds
    } catch (error) {
      console.error(`Error setting up polling for ${eventName}:`, error);
    }
  };
  
  // Return an object with methods to cleanup subscriptions
  return {
    unsubscribe: () => {
      console.log(`Unsubscribing from ${eventName} events`);
      try {
        if (subscription) {
          if (typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
          } else if (typeof subscription.removeAllListeners === 'function') {
            subscription.removeAllListeners();
          }
        }
      } catch (e) {
        console.error(`Error unsubscribing from ${eventName}:`, e);
      }
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    },
    isActive: () => isSubscriptionActive
  };
};

export default createSafeEventSubscription;
