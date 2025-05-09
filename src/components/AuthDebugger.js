import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const AuthDebugger = () => {
  const { currentUser, logout } = useContext(AuthContext);

  const style = {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    zIndex: 9999,
    maxWidth: '300px',
    overflowWrap: 'break-word'
  };

  return (
    <div style={style}>
      <p><strong>Auth Debug Panel</strong></p>
      <p>Status: {currentUser ? 'Logged In' : 'Not Logged In'}</p>
      {currentUser && (
        <>
          <p>User: {currentUser.name}</p>
          <p>Role: {currentUser.role}</p>
          <p>Email: {currentUser.email}</p>
          <button 
            onClick={logout}
            style={{
              backgroundColor: '#e74c3c',
              color: 'white', 
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Force Logout
          </button>
        </>
      )}
    </div>
  );
};

export default AuthDebugger; 