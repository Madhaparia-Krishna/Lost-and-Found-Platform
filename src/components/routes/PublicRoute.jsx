import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../LoadingSpinner';

// Route for pages that should only be accessible when NOT logged in
// If user is logged in, redirects to appropriate dashboard based on role
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useContext(AuthContext);
  
  // Show loading spinner while authentication state is being determined
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (currentUser) {
    // Redirect to appropriate dashboard based on role
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" />;
    } else if (currentUser.role === 'security') {
      return <Navigate to="/security" />;
    } else {
      return <Navigate to="/dashboard" />;
    }
  }
  
  // If not logged in, render the children (public page)
  return children || <Outlet />;
};

export default PublicRoute; 