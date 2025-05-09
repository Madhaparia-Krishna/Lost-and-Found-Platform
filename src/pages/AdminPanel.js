import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const { currentUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('users');

  // Mock users data
  const [users, setUsers] = useState([
    { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin', created_at: '2023-10-01' },
    { id: 2, name: 'Security User', email: 'security@example.com', role: 'security', created_at: '2023-10-05' },
    { id: 3, name: 'Regular User', email: 'user@example.com', role: 'user', created_at: '2023-10-10' },
    { id: 4, name: 'Jane Doe', email: 'jane@example.com', role: 'user', created_at: '2023-10-15' },
    { id: 5, name: 'Sam Smith', email: 'sam@example.com', role: 'user', created_at: '2023-10-20' },
  ]);

  // Mock system logs
  const logs = [
    { id: 1, action: 'User login', by_user: 'admin@example.com', created_at: '2023-11-10 09:15:32' },
    { id: 2, action: 'Item added', by_user: 'security@example.com', created_at: '2023-11-10 10:22:45' },
    { id: 3, action: 'Claim approved', by_user: 'security@example.com', created_at: '2023-11-10 11:37:18' },
    { id: 4, action: 'User registered', by_user: 'system', created_at: '2023-11-10 13:42:56' },
    { id: 5, action: 'User role changed', by_user: 'admin@example.com', created_at: '2023-11-10 14:50:29' },
  ];

  const handleRoleChange = (userId, newRole) => {
    // In a real app, this would update the database
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
    alert(`User ${userId} role changed to ${newRole}`);
  };

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h1>Admin Panel</h1>
        <div className="user-info">
          <span>Logged in as: {currentUser.name}</span>
          <span className="role-badge">{currentUser.role}</span>
        </div>
      </div>

      <div className="panel-navigation">
        <button 
          className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button 
          className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          System Logs
        </button>
        <button 
          className={`nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'users' && (
          <div className="panel-section">
            <h2>User Management</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.created_at}</td>
                    <td>
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="user">User</option>
                        <option value="security">Security</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="panel-section">
            <h2>System Logs</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Action</th>
                  <th>By User</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{log.id}</td>
                    <td>{log.action}</td>
                    <td>{log.by_user}</td>
                    <td>{log.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="panel-section">
            <h2>Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-value">{users.length}</p>
              </div>
              <div className="stat-card">
                <h3>Items Found</h3>
                <p className="stat-value">32</p>
              </div>
              <div className="stat-card">
                <h3>Items Returned</h3>
                <p className="stat-value">24</p>
              </div>
              <div className="stat-card">
                <h3>Pending Claims</h3>
                <p className="stat-value">8</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 