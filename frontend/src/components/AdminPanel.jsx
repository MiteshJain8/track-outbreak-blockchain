import React, { useState, useEffect } from 'react';
import { getInfectedCount } from '../utils/blockchain';

const AdminPanel = ({ outbreakLocations, infections, fetchOutbreakLocations }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [totalInfected, setTotalInfected] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const count = await getInfectedCount();
        setTotalInfected(count);
      } catch (error) {
        console.error("Error fetching infected count:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRefreshData = async () => {
    setLoading(true);
    try {
      await fetchOutbreakLocations();
      const count = await getInfectedCount();
      setTotalInfected(count);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel">
      <h2>Health Official Dashboard</h2>
      
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab-button ${activeTab === 'outbreaks' ? 'active' : ''}`}
          onClick={() => setActiveTab('outbreaks')}
        >
          Outbreak Locations
        </button>
        <button 
          className={`tab-button ${activeTab === 'infections' ? 'active' : ''}`}
          onClick={() => setActiveTab('infections')}
        >
          Infection Reports
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Total Infections</h4>
                <p>{totalInfected}</p>
              </div>
              <div className="stat-card">
                <h4>Outbreak Areas</h4>
                <p>{outbreakLocations.length}</p>
              </div>
              <div className="stat-card">
                <h4>Recent Reports</h4>
                <p>{infections.length}</p>
              </div>
            </div>
            
            <button 
              className="btn"
              onClick={handleRefreshData}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </>
        )}
        
        {activeTab === 'outbreaks' && (
          <div>
            <h3>All Outbreak Locations</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Location (Lat, Long)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Infected Count</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {outbreakLocations.map((loc, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '0.75rem' }}>{loc.location}</td>
                    <td style={{ padding: '0.75rem' }}>{loc.infectedCount}</td>
                    <td style={{ padding: '0.75rem' }}>{loc.timestamp}</td>
                  </tr>
                ))}
                {outbreakLocations.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '0.75rem', textAlign: 'center' }}>No outbreak locations reported yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'infections' && (
          <div>
            <h3>Recent Infection Reports</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Address</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Location</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Reported Time</th>
                </tr>
              </thead>
              <tbody>
                {infections.map((inf, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {inf.address.substring(0, 6)}...{inf.address.substring(inf.address.length - 4)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{inf.location}</td>
                    <td style={{ padding: '0.75rem' }}>{inf.timestamp}</td>
                  </tr>
                ))}
                {infections.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '0.75rem', textAlign: 'center' }}>No infections reported yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
