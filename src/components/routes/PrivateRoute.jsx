import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../LoadingSpinner';

const PrivateRoute = ({ children, requireRole }) => {
  const { currentUser, loading } = useContext(AuthContext);
  
  // Show loading spinner while authentication state is being determined
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // If user is not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // If a specific role is required, check for it
  if (requireRole && currentUser.role !== requireRole) {
    // Check if admin (can access any page)
    if (currentUser.role === 'admin') {
      return children || <Outlet />;
    }
    
    // For security staff, they can access security and user pages but not admin
    if (currentUser.role === 'security' && requireRole !== 'admin') {
      return children || <Outlet />;
    }
    
    // Role doesn't match, redirect to unauthorized page
    return <Navigate to="/unauthorized" />;
  }
  
  // User is authenticated and has the right role (or no specific role required)
  return children || <Outlet />;
};

export default PrivateRoute; 