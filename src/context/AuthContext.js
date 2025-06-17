import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_BASE_URL, authApi } from '../utils/api';

export const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // Set to true while checking localStorage
  const [authError, setAuthError] = useState(null);

  // Clear any stored user data when the application loads
  useEffect(() => {
    // Clear stored user data to ensure no user is logged in by default
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setLoading(false);
    console.log('AuthContext initialized: No user logged in by default');
  }, []);
  
  // Add a separate effect to log the current value
  useEffect(() => {
    console.log('AuthContext current value:', { currentUser, loading, authError });
  }, [currentUser, loading, authError]);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      // Use the authApi from our api.js utility
      const userData = await authApi.login({ email, password });
      
      // Ensure we have a valid token
      if (!userData || !userData.token) {
        throw new Error('Authentication failed: No token received');
      }
      
      // Check if the user is banned
      if (userData.is_banned) {
        throw new Error("You've been banned from this system.");
      }
      
      // Save to state and localStorage
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.message || 'Login failed. Please try again.';
      setAuthError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name, email, password) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      // Use the authApi from our api.js utility
      const userData = await authApi.register({ name, email, password });
      
      // Ensure we have a valid token
      if (!userData || !userData.token) {
        throw new Error('Registration failed: No token received');
      }
      
      // Save to state and localStorage
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      
      return userData;
    } catch (error) {
      console.error('Registration error:', error);
      const errorMsg = error.message || 'Registration failed. Please try again.';
      setAuthError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Remove from state and localStorage
    setCurrentUser(null);
    localStorage.removeItem('user');
    
    // Remove authorization header
    delete axios.defaults.headers.common['Authorization'];
  };

  // Value object to be provided to consumers
  const authContextValue = {
    currentUser,
    loading,
    authError,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 