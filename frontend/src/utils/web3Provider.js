import Web3 from 'web3';

// Keep track of reconnection attempts
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Create a WebSocket provider with reconnection logic
export const createWebSocketProvider = (url = 'ws://127.0.0.1:7545') => {
  // Clear reconnect attempts on new connection
  reconnectAttempts = 0;
  
  console.log(`Creating WebSocket provider for ${url}`);
  
  // Create provider with custom options
  const provider = new Web3.providers.WebsocketProvider(url, {
    reconnect: {
      auto: true,
      delay: 5000, // ms
      maxAttempts: MAX_RECONNECT_ATTEMPTS,
    }
  });
  
  // Setup event handlers
  provider.on('connect', () => {
    console.log('WebSocket connected');
    reconnectAttempts = 0;
  });
  
  provider.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
  
  provider.on('end', (e) => {
    console.log('WebSocket connection ended:', e);
    
    // Only try to reconnect if we haven't exceeded max attempts
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`WebSocket reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    } else {
      console.error(`Max WebSocket reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
    }
  });
  
  return provider;
};

// Get Web3 with the appropriate provider
export const getWeb3 = (useWebSockets = true) => {
  try {
    // Modern dapp browsers
    if (window.ethereum) {
      console.log("Using window.ethereum provider");
      return new Web3(window.ethereum);
    }
    // Legacy dapp browsers
    else if (window.web3) {
      console.log("Using window.web3 provider");
      return new Web3(window.web3.currentProvider);
    }
    // Custom provider
    else if (useWebSockets) {
      try {
        const provider = createWebSocketProvider();
        console.log("Using WebSocket provider for Web3");
        return new Web3(provider);
      } catch (wsError) {
        console.error("WebSocket provider failed:", wsError);
        // Fall back to HTTP
        console.log("Falling back to HTTP provider");
        return new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));
      }
    } else {
      // HTTP provider
      console.log("Using HTTP provider for Web3");
      return new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));
    }
  } catch (error) {
    console.error("Error creating Web3 instance:", error);
    throw new Error(`Failed to create Web3 instance: ${error.message}`);
  }
};

// Helper to determine if a provider is WebSocket-based
export const isWebSocketProvider = (web3Instance) => {
  if (!web3Instance || !web3Instance.currentProvider) return false;
  
  const provider = web3Instance.currentProvider;
  return (
    provider.constructor.name === 'WebsocketProvider' ||
    provider.connection?.constructor.name === 'WebSocket' ||
    (typeof provider.supportsSubscriptions === 'function' && provider.supportsSubscriptions())
  );
};

export default getWeb3;
