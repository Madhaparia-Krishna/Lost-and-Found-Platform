import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children, requireRole }) => {
  const { currentUser, loading } = useContext(AuthContext);
  
  if (loading) {
    // Show loading spinner while checking authentication
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  // Not logged in - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // If a specific role is required, check for it
  if (requireRole && currentUser.role !== requireRole) {
    // Check if admin (can access any page)
    if (currentUser.role === 'admin') {
      return children;
    }
    
    // For security staff, they can access security and user pages but not admin
    if (currentUser.role === 'security' && requireRole !== 'admin') {
      return children;
    }
    
    // Role doesn't match, redirect to unauthorized page
    return <Navigate to="/unauthorized" />;
  }
  
  // User is authenticated and has the right role (or no specific role required)
  return children;
};

export default PrivateRoute; 