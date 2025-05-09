import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user');
    console.log('Initializing AuthContext, stored user:', storedUser);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Found stored user, setting currentUser:', parsedUser);
        setCurrentUser(parsedUser);
        
        // Verify token with backend (optional but recommended)
        verifyToken(parsedUser.token);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Verify the token with backend
  const verifyToken = async (token) => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/verify-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // If token is invalid, log the user out
      if (!response.ok) {
        logout();
      }
    } catch (error) {
      console.error('Token verification error:', error);
    }
  };

  const login = (userData) => {
    console.log('Login function called with:', userData);
    // Set the user in state and localStorage
    setCurrentUser(userData);
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('User data stored in localStorage');
      setAuthError(null);
    } catch (error) {
      console.error('Error storing user data:', error);
      setAuthError('Error storing authentication data');
    }
    return userData;
  };

  const register = (userData) => {
    console.log('Register function called with:', userData);
    // Set the user in state and localStorage
    setCurrentUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setAuthError(null);
    return userData;
  };

  const logout = async () => {
    console.log('Logout function called');
    
    // If we have a token, inform backend about logout
    if (currentUser && currentUser.token) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          }
        });
      } catch (error) {
        console.error('Logout API error:', error);
      }
    }
    
    // Clear user data locally
    setCurrentUser(null);
    localStorage.removeItem('user');
    console.log('User removed from localStorage');
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading,
    authError
  };

  console.log('AuthContext current value:', { currentUser, loading, authError });

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 