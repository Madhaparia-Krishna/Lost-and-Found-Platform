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

  // Check for existing user in localStorage when the application loads
  useEffect(() => {
    try {
      // Try to get user from localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Validate that we have the minimum required data
        if (userData && userData.token) {
          console.log('Found existing user in localStorage:', userData.email);
          setCurrentUser(userData);
          
          // Set authorization header for all future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
        } else {
          console.log('Invalid user data in localStorage, clearing');
          localStorage.removeItem('user');
        }
      } else {
        console.log('No user found in localStorage');
      }
    } catch (error) {
      console.error('Error checking localStorage for user:', error);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
    
    console.log('AuthContext initialized');
  }, []);
  
  // Add a separate effect to log the current value
  useEffect(() => {
    console.log('AuthContext current value:', { 
      isLoggedIn: !!currentUser, 
      userEmail: currentUser?.email,
      loading, 
      authError 
    });
  }, [currentUser, loading, authError]);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      console.log('AuthContext login function called with email:', email);
      
      // Use the authApi from our api.js utility
      console.log('Calling authApi.login');
      const userData = await authApi.login({ email, password });
      console.log('authApi.login returned:', userData);
      
      // Ensure we have a valid token
      if (!userData || !userData.token) {
        console.error('No token received in login response');
        throw new Error('Authentication failed: No token received');
      }
      
      console.log('Valid token received, checking if user is banned');
      
      // Check if the user is banned
      if (userData.is_banned || userData.is_deleted) {
        console.error('User account is banned or deleted');
        throw new Error("Your account has been suspended or deleted.");
      }
      
      console.log('User is not banned, saving to state and localStorage');
      
      // Save to state and localStorage
      setCurrentUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      
      console.log('Login successful, returning user data');
      return userData;
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      const errorMsg = error.message || 'Login failed. Please try again.';
      setAuthError(errorMsg);
      throw error; // Re-throw the original error for the component to handle
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