import React, { useState } from 'react';
import { 
  reportInfection, 
  checkProximity, 
  reportNewLocation, 
  checkExposureRisk 
} from '../utils/blockchain';

const OutbreakForm = ({ account, locationString, setLocationString, setNotification, setLoading, setExposureData }) => {
  const [individualAddress, setIndividualAddress] = useState('');
  const [testResult, setTestResult] = useState(false);
  const [timeThreshold, setTimeThreshold] = useState(14);

  const handleReportInfection = async () => {
    try {
      setLoading(true);
      await reportInfection(
        individualAddress || account,
        locationString,
        testResult
      );
      setNotification("Infection reported successfully!");
    } catch (error) {
      console.error("Error reporting infection:", error);
      setNotification("Error reporting infection: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckLocation = async () => {
    try {
      setLoading(true);
      const result = await checkProximity(locationString);
      const isNearOutbreak = result[0];
      
      if (isNearOutbreak) {
        setNotification(`Warning! You are near an outbreak area: ${result[1]} with ${result[2].toString()} cases.`);
      } else {
        setNotification("You are not near any known outbreak areas.");
      }
    } catch (error) {
      console.error("Error checking location:", error);
      setNotification("Error checking location proximity: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportCurrentLocation = async () => {
    try {
      setLoading(true);
      await reportNewLocation(locationString);
      setNotification("Location reported successfully!");
    } catch (error) {
      console.error("Error reporting location:", error);
      setNotification("Error reporting location: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExposureRisk = async () => {
    try {
      setLoading(true);
      // Convert days to seconds
      const thresholdInSeconds = timeThreshold * 24 * 60 * 60;
      const [exposed, exposureCount] = await checkExposureRisk(locationString, thresholdInSeconds);
      
      setExposureData({ exposed, exposureCount: exposureCount.toNumber() });
      
      if (exposed) {
        setNotification(`Warning! You have potential exposure to ${exposureCount.toString()} infected individuals in the last ${timeThreshold} days.`);
      } else {
        setNotification(`No exposure detected in the last ${timeThreshold} days at your current location.`);
      }
    } catch (error) {
      console.error("Error checking exposure risk:", error);
      setNotification("Error checking exposure risk: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Report Infection</h2>
      <div className="form-group">
        <label>Individual Address:</label>
        <input
          type="text"
          value={individualAddress}
          onChange={(e) => setIndividualAddress(e.target.value)}
          placeholder="Enter wallet address or leave blank for self"
        />
      </div>

      <div className="form-group">
        <label>Location:</label>
        <input
          type="text"
          value={locationString}
          onChange={(e) => setLocationString(e.target.value)}
          placeholder="latitude,longitude"
        />
      </div>

      <div className="form-group">
        <label>Test Result:</label>
        <select
          value={testResult.toString()}
          onChange={(e) => setTestResult(e.target.value === "true")}
        >
          <option value="false">Negative</option>
          <option value="true">Positive</option>
        </select>
      </div>

      <div className="form-group">
        <label>Time Threshold (days):</label>
        <input
          type="number"
          value={timeThreshold}
          onChange={(e) => setTimeThreshold(parseInt(e.target.value) || 14)}
          placeholder="Days to check (default: 14)"
          min="1"
          max="30"
        />
      </div>

      <button
        className="btn"
        onClick={handleReportInfection}
      >
        Report Infection
      </button>

      <div className="action-buttons">
        <button
          className="btn secondary"
          onClick={handleCheckLocation}
        >
          Check Proximity
        </button>
        <button
          className="btn secondary"
          onClick={handleReportCurrentLocation}
        >
          Report My Location
        </button>
      </div>
      
      <button
        className="btn secondary"
        onClick={handleCheckExposureRisk}
        style={{ marginTop: '1rem' }}
      >
        Check Exposure Risk
      </button>
    </div>
  );
};

export default OutbreakForm;