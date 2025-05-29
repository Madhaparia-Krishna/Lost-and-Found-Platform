import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for data
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    itemsFound: 0,
    itemsReturned: 0,
    pendingClaims: 0
  });

  // Fetch users data from API
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser || currentUser.role !== 'admin') {
        navigate('/unauthorized');
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.users);
        setStats(prev => ({
          ...prev,
          totalUsers: data.users.length
        }));
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users data');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, navigate]);

  // Fetch logs data
  useEffect(() => {
    const fetchLogs = async () => {
      if (!currentUser || currentUser.role !== 'admin') {
        navigate('/unauthorized');
        return;
      }

      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        
        const response = await fetch('/api/admin/logs', {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.statusText}`);
        }

        const data = await response.json();
        setLogs(data.logs);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err.message || 'Failed to load system logs');
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [currentUser, navigate, activeTab]);

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      const data = await response.json();
      
      // Update the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      alert(`User role updated successfully to ${newRole}`);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update user role: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch to security panel
  const handleSwitchToSecurity = () => {
    navigate('/security');
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading && users.length === 0) {
    return <div className="admin-panel loading">Loading admin panel...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h1>Admin Panel</h1>
        <div className="user-info">
          <span>Logged in as: {currentUser.name}</span>
          <span className="role-badge">{currentUser.role}</span>
          {currentUser.role === 'admin' && (
            <button className="switch-panel-btn" onClick={handleSwitchToSecurity}>
              Switch to Security Panel
            </button>
          )}
          <Link to="/" className="back-home-link">Back to Home</Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

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
            {users.length > 0 ? (
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
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <select 
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="role-select"
                          disabled={loading}
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
            ) : (
              <p>No users found.</p>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="panel-section">
            <h2>System Logs</h2>
            {loading ? (
              <div className="loading">Loading logs...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : logs.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>User</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.action}</td>
                      <td>{log.details}</td>
                      <td>{log.user_name || 'System'}</td>
                      <td>{log.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No logs found.</p>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="panel-section">
            <h2>Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-value">{stats.totalUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Items Found</h3>
                <p className="stat-value">{stats.itemsFound || "N/A"}</p>
              </div>
              <div className="stat-card">
                <h3>Items Returned</h3>
                <p className="stat-value">{stats.itemsReturned || "N/A"}</p>
              </div>
              <div className="stat-card">
                <h3>Pending Claims</h3>
                <p className="stat-value">{stats.pendingClaims || "N/A"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 