import React, { useState, useEffect } from "react";
import "./App.css";
import Map from "./components/Map";
import OutbreakForm from "./components/OutbreakForm";
import Notifications from "./components/Notifications";
import AdminPanel from "./components/AdminPanel";
import ContractDebug from "./components/ContractDebug";
import { 
  initializeEthers, 
  connectWallet,
  // setupEventListeners,
  pollForEvents,
  getAllOutbreakLocations,
  checkWeb3Status
} from "./utils/blockchain";
import createSafeEventSubscription from './utils/eventHelper';

// Import Web3 correctly to prevent errors in polling fallback
import Web3 from 'web3';

function App() {
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 0, lng: 0 });
  const [locationString, setLocationString] = useState("");
  const [outbreakLocations, setOutbreakLocations] = useState([]);
  // const [counts, setCounts] = useState([]);
  const [infections, setInfections] = useState([]);
  const [notification, setNotification] = useState("");
  const [exposureData, setExposureData] = useState({ exposed: false, exposureCount: 0 });
  const [isAdmin, setIsAdmin] = useState(false); // Simple admin toggle - in real app would use auth
  const [isLoading, setIsLoading] = useState(true);
  const [web3Status, setWeb3Status] = useState({
    available: false,
    connected: false,
    account: null,
    networkId: null,
    errorMessage: null
  });
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [lastCheckedBlock, setLastCheckedBlock] = useState(0);
  const [usingEventPolling, setUsingEventPolling] = useState(false);

  // Fix: Add a mounted ref to prevent state updates after unmounting
  const isMountedRef = React.useRef(true);
  
  // Fix: Add ref for event cleanup function
  const cleanupListenersRef = React.useRef(null);

  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    
    // Get user's geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        if (isMountedRef.current) {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationString(`${latitude},${longitude}`);
        }
      });
    }

    // Check if wallet is already connected
    const checkIfWalletIsConnected = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts.length > 0 && isMountedRef.current) {
            setAccount(accounts[0]);
            setIsConnected(true);
            await initializeBlockchain();
          }
        } catch (error) {
          console.error("Error connecting to MetaMask", error);
          if (isMountedRef.current) {
            setNotification({
              type: 'error',
              message: `MetaMask connection error: ${error.message}`
            });
          }
        }
      }
    };

    checkIfWalletIsConnected();
    
    // Cleanup function to prevent memory leaks and infinite loops
    return () => {
      isMountedRef.current = false;
      
      // Clean up event listeners if they exist
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
      }
    };
  }, []); // <-- Empty dependency array to run only once on mount

  // Separate effect for polling to avoid recreation on every state change
  useEffect(() => {
    let pollingInterval = null;
    
    if (isConnected && usingEventPolling) {
      console.log("Setting up event polling...");
      
      // Poll for events every 15 seconds
      pollingInterval = setInterval(async () => {
        if (!isMountedRef.current) return; // Don't proceed if component unmounted
        
        try {
          const newLastBlock = await pollForEvents(
            lastCheckedBlock,
            (infection) => {
              if (isMountedRef.current) {
                setInfections((prev) => [...prev, infection]);
                setNotification({
                  type: 'info',
                  message: `New infection reported at ${infection.location}`
                });
              }
            },
            (outbreak) => {
              if (isMountedRef.current) {
                setNotification({
                  type: 'warning',
                  message: `Potential outbreak alert! ${outbreak.infectedCount} cases at ${outbreak.location}`
                });
                fetchOutbreakLocations();
              }
            }
          );
          
          if (isMountedRef.current) {
            setLastCheckedBlock(newLastBlock);
          }
        } catch (error) {
          console.error("Error polling for events:", error);
        }
      }, 15000); // Poll every 15 seconds
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isConnected, usingEventPolling]); // Only depend on connection status and polling mode

  const initializeBlockchain = async () => {
    try {
      // Initialize ethers and get contract instance
      const { contract } = await initializeEthers();
      
      // Try to set up WebSocket event listeners with better error handling
      try {
        console.log("Attempting to set up event listeners...");
        
        // Clean up previous listeners if they exist
        if (cleanupListenersRef.current) {
          cleanupListenersRef.current();
        }
        
        // Use our safe event subscription helper
        const newInfectionSub = createSafeEventSubscription(
          contract,
          'NewInfection',
          {},
          (event) => {
            // Process the event data
            const { individualAddress, location, timestamp } = event.returnValues;
            const infection = {
              address: individualAddress,
              location,
              timestamp: new Date(timestamp * 1000).toLocaleString()
            };
            
            if (isMountedRef.current) {
              setInfections((prev) => [...prev, infection]);
              setNotification({
                type: 'info',
                message: `New infection reported at ${infection.location}`
              });
            }
          },
          (error) => {
            console.error("New infection event error:", error);
          }
        );
        
        const outbreakSub = createSafeEventSubscription(
          contract,
          'PotentialOutbreak',
          {},
          (event) => {
            // Process the event data
            const { location, infectedCount, timestamp } = event.returnValues;
            const outbreak = {
              location,
              infectedCount: parseInt(infectedCount),
              timestamp: new Date(timestamp * 1000).toLocaleString()
            };
            
            if (isMountedRef.current) {
              setNotification({
                type: 'warning',
                message: `Potential outbreak alert! ${outbreak.infectedCount} cases at ${outbreak.location}`
              });
              fetchOutbreakLocations();
            }
          },
          (error) => {
            console.error("Potential outbreak event error:", error);
          }
        );
        
        // Store the cleanup functions
        cleanupListenersRef.current = () => {
          newInfectionSub.unsubscribe();
          outbreakSub.unsubscribe();
        };
        
        // Check if we're using real-time events or polling
        setUsingEventPolling(!newInfectionSub.isActive || !outbreakSub.isActive);
        
        console.log("Event listeners set up successfully");
      } catch (eventError) {
        console.error("Event setup failed, falling back to polling:", eventError);
        
        if (isMountedRef.current) {
          setUsingEventPolling(true);
        }
      }

      // Load initial data
      fetchOutbreakLocations().catch(error => {
        console.error("Initial data fetch failed:", error);
      });
    } catch (error) {
      console.error("Error initializing blockchain:", error);
      
      if (isMountedRef.current) {
        setNotification({
          type: 'error',
          message: `Blockchain initialization error: ${error.message}`
        });
      }
    }
  };

  // Update the function that fetches outbreak locations
  const fetchOutbreakLocations = async () => {
    if (!isMountedRef.current) return; // Don't proceed if component unmounted
    
    try {
      setIsLoading(true);
      
      // Check Web3 status and blockchain connection
      const status = await checkWeb3Status();
      
      if (isMountedRef.current) {
        setWeb3Status(status);
        
        if (status.connected) {
          try {
            console.log("Connected to blockchain, fetching data...");
            
            // If connected, load the data
            const data = await getAllOutbreakLocations();
            
            // Check if we have valid data
            if (data && Array.isArray(data.locations)) {
              console.log("Received outbreak locations:", data.locations.length);
              
              if (data.locations.length > 0) {
                setOutbreakLocations(data.locations);
                setNotification({
                  type: 'success',
                  message: `Loaded ${data.locations.length} outbreak locations`
                });
              } else {
                setOutbreakLocations([]);
                setNotification({
                  type: 'info',
                  message: 'No outbreak locations found'
                });
              }
            } else {
              // If we got invalid data, show a warning
              console.warn("Received invalid outbreak locations data:", data);
              setOutbreakLocations([]);
              setNotification({
                type: 'warning',
                message: 'Unable to load outbreak data'
              });
            }
          } catch (dataError) {
            console.error("Error loading outbreak data:", dataError);
            
            // Show error but don't break the app
            setNotification({
              type: 'error',
              message: `Error loading data: ${dataError.message}`
            });
          }
        } else {
          // If not connected, show error notification
          setNotification({
            type: 'error',
            message: status.errorMessage || 'Failed to connect to blockchain. Please check your connection settings.'
          });
          
          // Try to reconnect if fewer than 3 retries
          if (connectionRetries < 3) {
            setConnectionRetries(prev => prev + 1);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching outbreak locations:", error);
      
      if (isMountedRef.current) {
        setNotification({
          type: 'error',
          message: `Connection error: ${error.message}`
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleConnectWallet = async () => {
    try {
      const addr = await connectWallet();
      setAccount(addr);
      setIsConnected(true);
      await initializeBlockchain();
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setNotification("Error connecting wallet: " + error.message);
    }
  };

  const handleFormSubmit = (newNotification) => {
    setNotification(newNotification);
    
    // Refresh outbreak locations after a successful submission
    if (newNotification.type === 'success') {
      refreshOutbreakLocations();
    }
  };
  
  // Function to refresh outbreak locations data
  const refreshOutbreakLocations = async () => {
    try {
      setIsLoading(true);
      const data = await getAllOutbreakLocations();
      setOutbreakLocations(data.locations);
      // setCounts(data.counts);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setNotification({
        type: 'error',
        message: `Failed to refresh data: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear notification after it's displayed
  const clearNotification = () => {
    setNotification("");
  };
  
  // Try to reconnect if the user clicks the retry button
  const handleRetryConnection = () => {
    // Explicitly call fetchOutbreakLocations instead of just incrementing retry count
    fetchOutbreakLocations();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Blockchain-Based Epidemic Outbreak Tracking</h1>
        <div className="header-controls">
          {!isConnected ? (
            <button className="btn" onClick={handleConnectWallet}>
              Connect Wallet
            </button>
          ) : (
            <>
              <p>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
              {web3Status.networkId && (
                <span className="network-info">Network ID: {web3Status.networkId}</span>
              )}
              {usingEventPolling && (
                <span className="polling-info">(Event Polling Active)</span>
              )}
              <button 
                className="btn admin-toggle" 
                onClick={() => setIsAdmin(!isAdmin)}
                style={{ marginLeft: '10px' }}
              >
                {isAdmin ? "User View" : "Admin View"}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="container">
        {notification && (
          <Notifications 
            type={notification.type} 
            message={notification.message} 
            onClose={clearNotification}
            onRetry={notification.type === 'error' ? handleRetryConnection : null}
          />
        )}

        {isAdmin && isConnected ? (
          <>
            <ContractDebug />
            <AdminPanel 
              outbreakLocations={outbreakLocations} 
              infections={infections}
              fetchOutbreakLocations={fetchOutbreakLocations}
            />
          </>
        ) : (
          <>
            <div className="grid">
              <OutbreakForm
                userLocation={userLocation}
                setUserLocation={setUserLocation}
                setInfections={setInfections}
                setOutbreakLocations={setOutbreakLocations}
                setIsConnected={setIsConnected}
                setAccount={setAccount}
                setExposureData={setExposureData}
                setLocationString={setLocationString}
                setIsAdmin={setIsAdmin}
                account={account}
                locationString={locationString}
                setNotification={setNotification}
                isLoading={isLoading}
                onFormSubmit={handleFormSubmit}
              />
              <Map
                userLocation={userLocation}
                outbreakLocations={outbreakLocations}
                isLoading={isLoading}
              />
            </div>

            {exposureData.exposed && (
              <div className="exposure-alert">
                <h3>Exposure Risk Alert</h3>
                <p>You may have been exposed to {exposureData.exposureCount} infected individuals.</p>
                <p>Please consider getting tested and limiting your movements.</p>
              </div>
            )}

            <div className="data-section">
              <h2>Recent Infections</h2>
              <div className="data-list">
                {infections.length > 0 ? (
                  infections.map((inf, idx) => (
                    <div key={idx} className="data-item">
                      <p>
                        <strong>Address:</strong> {inf.address.substring(0, 6)}...
                        {inf.address.substring(inf.address.length - 4)}
                      </p>
                      <p>
                        <strong>Location:</strong> {inf.location}
                      </p>
                      <p>
                        <strong>Time:</strong> {inf.timestamp}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>No infections reported yet</p>
                )}
              </div>

              <h2>Outbreak Locations</h2>
              <div className="data-list">
                {outbreakLocations.length > 0 ? (
                  outbreakLocations.map((loc, idx) => (
                    <div key={idx} className="data-item">
                      <p>
                        <strong>Location:</strong> {loc.location}
                      </p>
                      <p>
                        <strong>Cases:</strong> {loc.infectedCount}
                      </p>
                      <p>
                        <strong>Last update:</strong> {loc.timestamp}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>No outbreak locations reported yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;