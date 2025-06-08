import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PublicRoute = ({ element }) => {
  const { currentUser, loading } = useContext(AuthContext);
  const location = useLocation();
  
  // Get the redirect URL from query parameters if it exists
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect');
  
  if (loading) {
    return <div className="loading-overlay"><div className="spinner"></div></div>;
  }
  
  // If user is authenticated, redirect to dashboard or the specified redirect path
  if (currentUser) {
    if (redirectPath) {
      return <Navigate to={`/${redirectPath}`} replace />;
    }
    return <Navigate to="/dashboard/found" replace />;
  }
  
  // Not logged in, show the public route
  return element;
};

export default PublicRoute; 