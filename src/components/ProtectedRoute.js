import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { cloneElement } from 'react';

// DEPRECATED: This component is being replaced by PrivateRoute in src/components/routes/PrivateRoute.jsx
// Keeping for compatibility with existing code
const ProtectedRoute = ({ element, allowedRoles = [] }) => {
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    console.log('ProtectedRoute at', location.pathname);
    console.log('Current user:', currentUser);
    console.log('Allowed roles:', allowedRoles);
    console.warn('ProtectedRoute is deprecated. Use PrivateRoute from src/components/routes/PrivateRoute.jsx');
    
    if (!currentUser) {
      console.log('Access denied: User not logged in');
    } else if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
      console.log(`Access denied: User role ${currentUser.role} not in allowed roles`);
    } else {
      console.log('Access granted to', location.pathname);
    }
  }, [currentUser, allowedRoles, location.pathname]);

  // If not logged in, redirect to login
  if (!currentUser) {
    console.log('Redirecting to login from', location.pathname);
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If admin, allow access to everything
  if (currentUser.role === 'admin') {
    return cloneElement(element, { currentUserId: currentUser.id });
  }

  // If security staff, allow access to all but admin routes
  if (currentUser.role === 'security' && !allowedRoles.includes('admin')) {
    return cloneElement(element, { currentUserId: currentUser.id });
  }

  // If roles specified and user doesn't have permission
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    console.log('Redirecting to unauthorized from', location.pathname);
    return <Navigate to="/unauthorized" replace />;
  }

  // If user is authenticated and authorized, pass currentUserId to the element
  return cloneElement(element, { currentUserId: currentUser.id });
};

export default ProtectedRoute; 