import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../LoadingSpinner';

// Route for pages that should only be accessible when NOT logged in
// If user is logged in, redirects to the homepage
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useContext(AuthContext);
  
  // Show loading spinner while authentication state is being determined
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (currentUser) {
    // Redirect to homepage for all users
    return <Navigate to="/" />;
  }
  
  // If not logged in, render the children (public page)
  return children || <Outlet />;
};

export default PublicRoute; 