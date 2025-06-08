import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to="/" className="primary-btn">
            <i className="fas fa-home"></i> Go Home
          </Link>
          <Link to="/dashboard/found" className="secondary-btn">
            <i className="fas fa-search"></i> Browse Found Items
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 