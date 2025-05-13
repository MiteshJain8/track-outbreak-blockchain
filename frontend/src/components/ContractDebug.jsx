import React, { useState } from 'react';
import { verifyContractMethods, validateContractABI, diagnoseContract } from '../utils/contractVerifier';
import { 
  OUTBREAK_CONTRACT_ADDRESS, 
  NETWORK_CONTRACTS, 
  getContractStatusByNetwork 
} from '../utils/contractConfig';

const ContractDebug = () => {
  const [results, setResults] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyContract = async () => {
    setLoading(true);
    try {
      const verification = await verifyContractMethods();
      setResults(verification);
    } catch (error) {
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateABI = () => {
    const validation = validateContractABI();
    setValidationResults(validation);
  };

  const handleDiagnoseContract = async () => {
    setLoading(true);
    try {
      const diagnosis = await diagnoseContract();
      setDiagnosticResults(diagnosis);
    } catch (error) {
      setDiagnosticResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderNetworkConfig = () => {
    return (
      <div style={{ marginBottom: '20px' }}>
        <h3>Network Configuration</h3>
        <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <p><strong>Default Contract Address:</strong> {OUTBREAK_CONTRACT_ADDRESS}</p>
          
          <div>
            <p><strong>Configured Networks:</strong></p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Network ID</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Network Name</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Contract Address</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(NETWORK_CONTRACTS).map(networkId => {
                  const status = getContractStatusByNetwork(parseInt(networkId));
                  return (
                    <tr key={networkId}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{networkId}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{status.networkName}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{status.address}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {diagnosticResults?.networkInfo && (
            <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#007bff' }}>
              Current Network: {getContractStatusByNetwork(diagnosticResults.networkInfo.id).networkName} (ID: {diagnosticResults.networkInfo.id})
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
      <h2>Contract Debugger</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleValidateABI}
          style={{ padding: '8px 16px', marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Validate ABI
        </button>
        
        <button 
          onClick={handleDiagnoseContract}
          style={{ padding: '8px 16px', marginRight: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
          disabled={loading}
        >
          {loading ? 'Diagnosing...' : 'Diagnose Contract'}
        </button>
        
        <button 
          onClick={handleVerifyContract}
          style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Verify Methods'}
        </button>
      </div>
      
      {renderNetworkConfig()}
      
      {diagnosticResults && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Contract Diagnosis</h3>
          <div style={{ 
            padding: '10px', 
            backgroundColor: diagnosticResults.networkConnected ? '#d4edda' : '#f8d7da',
            color: diagnosticResults.networkConnected ? '#155724' : '#721c24',
            borderRadius: '4px'
          }}>
            <p><strong>Network Connected:</strong> {diagnosticResults.networkConnected ? 'Yes' : 'No'}</p>
            
            {diagnosticResults.error && (
              <p><strong>Error:</strong> {diagnosticResults.error}</p>
            )}
            
            {diagnosticResults.networkInfo && (
              <div>
                <p><strong>Network ID:</strong> {diagnosticResults.networkInfo.id}</p>
                <p><strong>Network Type:</strong> {diagnosticResults.networkInfo.type}</p>
                <p><strong>Chain ID:</strong> {diagnosticResults.networkInfo.chainId}</p>
                <p><strong>Block Number:</strong> {diagnosticResults.networkInfo.blockNumber}</p>
              </div>
            )}
            
            {diagnosticResults.contractInfo && (
              <div>
                <p><strong>Contract Address:</strong> {diagnosticResults.contractInfo.address}</p>
                <p><strong>Contract Exists:</strong> {diagnosticResults.contractInfo.exists ? 'Yes' : 'No'}</p>
                <p><strong>Code Length:</strong> {diagnosticResults.contractInfo.codeLength}</p>
                
                {diagnosticResults.contractInfo.availableNetworks && (
                  <div>
                    <p><strong>Available Networks in Contract:</strong></p>
                    <ul>
                      {diagnosticResults.contractInfo.availableNetworks.map(netId => (
                        <li key={netId}>Network ID: {netId}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p><strong>GetCount Works:</strong> {diagnosticResults.contractInfo.getCountWorks ? 'Yes' : 'No'}</p>
                {diagnosticResults.contractInfo.getCountWorks && (
                  <p><strong>Count Value:</strong> {diagnosticResults.contractInfo.count}</p>
                )}
                
                {diagnosticResults.contractInfo.methods && (
                  <div>
                    <p><strong>Available Methods:</strong></p>
                    <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {diagnosticResults.contractInfo.methods.map(method => (
                        <li key={method}>{method}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {validationResults && (
        <div style={{ marginBottom: '20px' }}>
          <h3>ABI Validation</h3>
          <div style={{ 
            padding: '10px', 
            backgroundColor: validationResults.valid ? '#d4edda' : '#f8d7da',
            color: validationResults.valid ? '#155724' : '#721c24',
            borderRadius: '4px'
          }}>
            <p><strong>Valid:</strong> {validationResults.valid ? 'Yes' : 'No'}</p>
            {validationResults.message && <p><strong>Message:</strong> {validationResults.message}</p>}
            
            {validationResults.missingMethods && validationResults.missingMethods.length > 0 && (
              <div>
                <p><strong>Missing Methods:</strong></p>
                <ul>
                  {validationResults.missingMethods.map(method => (
                    <li key={method}>{method}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationResults.methods && (
              <details>
                <summary>Available Methods ({validationResults.methods.length})</summary>
                <ul>
                  {validationResults.methods.map(method => (
                    <li key={method}>{method}</li>
                  ))}
                </ul>
              </details>
            )}
            
            {validationResults.events && (
              <details>
                <summary>Available Events ({validationResults.events.length})</summary>
                <ul>
                  {validationResults.events.map(event => (
                    <li key={event}>{event}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
      
      {results && (
        <div>
          <h3>Method Verification</h3>
          <div style={{ 
            padding: '10px', 
            backgroundColor: results.success ? '#d4edda' : '#f8d7da',
            color: results.success ? '#155724' : '#721c24',
            borderRadius: '4px'
          }}>
            <p><strong>Success:</strong> {results.success ? 'Yes' : 'No'}</p>
            <p><strong>Network ID:</strong> {results.networkId}</p>
            <p><strong>Contract Address:</strong> {results.contractAddress}</p>
            
            {results.error && (
              <p><strong>Error:</strong> {results.error}</p>
            )}
            
            {results.infectedCount !== undefined && (
              <p><strong>Infected Count:</strong> {results.infectedCount}</p>
            )}
            
            {results.outbreakCount !== undefined && (
              <p><strong>Outbreak Locations Count:</strong> {results.outbreakCount}</p>
            )}
            
            {results.locations && (
              <details>
                <summary>Locations ({results.locations.length})</summary>
                <ul>
                  {results.locations.map((location, index) => (
                    <li key={index}>{location} - {results.counts[index]} cases</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDebug;
