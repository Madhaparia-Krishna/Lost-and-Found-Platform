import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const TestRole = () => {
  const { currentUser } = useContext(AuthContext);
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    console.log('Current user in TestRole component:', currentUser);
    
    // Try to get user from localStorage
    try {
      const storedUser = localStorage.getItem('user');
      console.log('User from localStorage:', storedUser);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('Parsed user:', parsedUser);
        console.log('User role:', parsedUser.role);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }, [currentUser]);
  
  const createSecurityUser = async () => {
    try {
      setMessage('Creating security user...');
      const response = await axios.get('/api/debug/create-security');
      console.log('Security user creation response:', response.data);
      setMessage(`Security user created: ${response.data.security.email} (Password: Security@123)`);
    } catch (error) {
      console.error('Error creating security user:', error);
      setMessage(`Error: ${error.response?.data?.message || error.message}`);
    }
  };
  
  const setUserAsSecurityRole = async () => {
    if (!currentUser || !currentUser.id) {
      setMessage('You must be logged in to use this function');
      return;
    }
    
    try {
      setMessage('Setting current user as security...');
      const response = await axios.get(`/api/debug/set-security/${currentUser.id}`);
      console.log('Set security role response:', response.data);
      setMessage('Role updated. Please log out and log back in to see changes.');
    } catch (error) {
      console.error('Error setting security role:', error);
      setMessage(`Error: ${error.response?.data?.message || error.message}`);
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>User Role Test</h1>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          background: message.includes('Error') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') ? '#721c24' : '#155724',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={createSecurityUser}
          style={{ 
            padding: '10px 15px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Create Security User
        </button>
        
        <button 
          onClick={setUserAsSecurityRole}
          style={{ 
            padding: '10px 15px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Set Current User as Security
        </button>
      </div>
      
      {currentUser ? (
        <div>
          <h2>Current User Info:</h2>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '5px',
            overflow: 'auto'
          }}>
            {JSON.stringify(currentUser, null, 2)}
          </pre>
          
          <div style={{ marginTop: '20px', padding: '15px', background: '#e8f4f8', borderRadius: '5px' }}>
            <h3>Role Information:</h3>
            <p><strong>User Role:</strong> {currentUser.role || 'No role defined'}</p>
            <p><strong>Is Admin:</strong> {currentUser.role === 'admin' ? 'Yes' : 'No'}</p>
            <p><strong>Is Security:</strong> {currentUser.role === 'security' ? 'Yes' : 'No'}</p>
            <p><strong>Is Regular User:</strong> {currentUser.role === 'user' ? 'Yes' : 'No'}</p>
          </div>
        </div>
      ) : (
        <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '5px' }}>
          <p>No user is currently logged in.</p>
        </div>
      )}
    </div>
  );
};

export default TestRole; 