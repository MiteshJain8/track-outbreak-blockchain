import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';

// Fix for Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// Custom icons for different markers
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const outbreakIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const OutbreakMap = ({ userLocation, outbreakLocations }) => {
  const parseLocationString = (locString) => {
    try {
      const [lat, lng] = locString.split(',').map(parseFloat);
      return isNaN(lat) || isNaN(lng) ? [0, 0] : [lat, lng];
    } catch {
      return [0, 0];
    }
  };

  // Determine appropriate zoom level and center
  const determineMapView = () => {
    if (outbreakLocations.length === 0) {
      return {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13
      };
    }
    
    // If we have outbreak locations, try to fit all points
    const points = [
      [userLocation.lat, userLocation.lng],
      ...outbreakLocations.map(loc => parseLocationString(loc.location))
    ].filter(point => point[0] !== 0 && point[1] !== 0);
    
    // If we only have the user location, center on it
    if (points.length <= 1) {
      return {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13
      };
    }
    
    // Otherwise, calculate the center by averaging all points
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    
    return {
      center: [
        lats.reduce((a, b) => a + b, 0) / lats.length,
        lngs.reduce((a, b) => a + b, 0) / lngs.length
      ],
      zoom: 11 // A bit zoomed out to show multiple points
    };
  };

  const mapView = determineMapView();

  return (
    <div className="map-container">
      <h2>Outbreak Map</h2>
      {userLocation.lat !== 0 && (
        <MapContainer
          center={mapView.center}
          zoom={mapView.zoom}
          style={{ height: "400px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* User location */}
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>Your location</Popup>
            <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
              You are here
            </Tooltip>
          </Marker>

          {/* Outbreak locations */}
          {outbreakLocations.map((loc, idx) => {
            const [lat, lng] = parseLocationString(loc.location);
            return lat !== 0 && lng !== 0 ? (
              <React.Fragment key={idx}>
                <Marker position={[lat, lng]} icon={outbreakIcon}>
                  <Popup>
                    <strong>Outbreak Area</strong><br/>
                    Cases: {loc.infectedCount}<br/>
                    Reported: {loc.timestamp}
                  </Popup>
                  <Tooltip direction="top" opacity={0.7}>
                    {loc.infectedCount} cases
                  </Tooltip>
                </Marker>
                <Circle
                  center={[lat, lng]}
                  radius={5000} // 5km radius - adjust as needed
                  pathOptions={{ 
                    color: "red", 
                    fillColor: "red", 
                    fillOpacity: 0.1 + Math.min(0.3, loc.infectedCount / 50) // Opacity increases with case count
                  }}
                >
                  <Popup>
                    5km radius around outbreak location.<br/>
                    {loc.infectedCount} cases reported.
                  </Popup>
                </Circle>
              </React.Fragment>
            ) : null;
          })}
        </MapContainer>
      )}
      <div style={{marginTop: '1rem', fontSize: '0.9rem', color: '#666'}}>
        <p>Blue marker: Your location | Red markers: Outbreak areas</p>
        <p>Red circles represent a 5km radius around each outbreak area.</p>
      </div>
    </div>
  );
};

export default OutbreakMap;