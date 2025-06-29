import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/SuccessMessage.css';

const SuccessMessage = ({ 
  title = 'Thank You!', 
  message = 'Your request has been processed successfully.',
  submessage,
  onReset,
  resetButtonText = 'Report Another Item',
  showDashboardLink = true
}) => {
  useEffect(() => {
    // Scroll to the component when it mounts
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);
  
  return (
    <div className="success-message-container">
      <div className="success-icon">
        <i className="fas fa-check-circle"></i>
      </div>
      <h2>{title}</h2>
      <p className="main-message">{message}</p>
      {submessage && <p className="sub-message">{submessage}</p>}
      
      <div className="success-actions">
        {onReset && (
          <button 
            onClick={onReset}
            className="btn primary-btn"
          >
            <i className="fas fa-plus-circle me-2"></i>
            {resetButtonText}
          </button>
        )}
        
        {showDashboardLink && (
          <Link to="/dashboard" className="btn secondary-btn">
            <i className="fas fa-th-large me-2"></i>
            Go to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
};

export default SuccessMessage; 