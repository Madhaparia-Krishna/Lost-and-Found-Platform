import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

const Unauthorized = () => {
  return (
    <div className="auth-container">
      <div className="auth-card error-card">
        <h2>Access Denied</h2>
        <div className="error-icon">⚠️</div>
        <p className="error-message">
          You do not have permission to access this page.
        </p>
        <Link to="/" className="auth-button">Return to Home</Link>
      </div>
    </div>
  );
};

export default Unauthorized; 