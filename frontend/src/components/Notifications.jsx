import React, { useState, useEffect } from 'react';

const Notifications = ({ type, message, onClose, onRetry }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    setVisible(true);
    
    // Auto-hide success notifications after 5 seconds
    if (type === 'success' && onClose) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Allow time for fade-out animation
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [type, message, onClose]);
  
  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // Allow time for fade-out animation
  };
  
  const handleRetry = () => {
    if (onRetry) onRetry();
  };
  
  return (
    <div className={`notification ${type} ${visible ? 'visible' : 'hidden'}`}>
      <div className="notification-content">
        <span className={`notification-icon ${type}`}>
          {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
        </span>
        <span className="notification-message">{message}</span>
        
        <div className="notification-actions">
          {type === 'error' && onRetry && (
            <button className="retry-btn" onClick={handleRetry}>
              Retry
            </button>
          )}
          <button className="close-btn" onClick={handleClose}>
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;