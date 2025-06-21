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
  const [actionStatus, setActionStatus] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [usersError, setUsersError] = useState(null);
  const [logsError, setLogsError] = useState(null);
  const [statsError, setStatsError] = useState(null);

  // State for data
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    itemsFound: 0,
    itemsReturned: 0,
    pendingClaims: 0
  });
  const [bannedUsers, setBannedUsers] = useState([]);

  // Refresh data function
  const refreshData = () => {
    console.log("Refreshing admin panel data...");
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch users data from API
  const fetchUsers = async () => {
    try {
      console.log("Fetching users...");
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
      
      // Filter out banned users for the banned users tab
      const banned = data.users.filter(user => user.is_deleted === true);
      setBannedUsers(banned);
      
      setStats(prev => ({
        ...prev,
        totalUsers: data.users.length
      }));
      setUsersError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsersError('Failed to load users data');
      setUsers([]);
    }
  };

  // Fetch logs data
  const fetchLogs = async () => {
    try {
      console.log("Fetching logs...");
      
      // Try primary endpoint
      try {
        const response = await fetch('/api/admin/logs', {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Received logs data:", data);
        
        // Handle case where logs might be wrapped in an object
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs);
        } else if (Array.isArray(data)) {
          setLogs(data);
        } else {
          // Try to find any array property that might contain logs
          const arrayProps = Object.keys(data).filter(key => 
            Array.isArray(data[key]) && 
            data[key].length > 0
          );
          
          if (arrayProps.length > 0) {
            setLogs(data[arrayProps[0]]);
          } else {
            setLogs([]);
            setLogsError("No logs data available from API");
          }
        }
        setLogsError(null);
      } catch (err) {
        // Try fallback endpoint
        console.log("First endpoint failed, trying fallback endpoint...");
        try {
          const response = await fetch('/admin/logs', {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch logs from fallback: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log("Received logs from fallback:", data);
          
          if (data.logs && Array.isArray(data.logs)) {
            setLogs(data.logs);
          } else if (Array.isArray(data)) {
            setLogs(data);
          } else {
            setLogs([]);
            setLogsError("No logs data available from API");
          }
          setLogsError(null);
        } catch (fallbackErr) {
          console.error("Fallback endpoint also failed:", fallbackErr);
          setLogs([]);
          setLogsError("Failed to load system logs - API endpoints unavailable");
        }
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      setLogsError(err.message || 'Failed to load system logs');
      setLogs([]);
    }
  };

  // Fetch stats data
  const fetchStats = async () => {
    try {
      console.log("Fetching statistics...");
      
      // Try primary endpoint
      try {
        const response = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch statistics');
        }

        const data = await response.json();
        console.log("Received stats data:", data);
        
        // Handle case where stats might be wrapped in an object
        if (data.stats) {
          setStats(data.stats);
        } else {
          // If stats is not available, try to extract stats from the data itself
          const extractedStats = {
            totalUsers: data.totalUsers || data.users?.length || stats.totalUsers || 0,
            itemsFound: data.itemsFound || data.foundItems?.length || stats.itemsFound || 0,
            itemsReturned: data.itemsReturned || data.returnedItems?.length || stats.itemsReturned || 0,
            pendingClaims: data.pendingClaims || data.claims?.length || stats.pendingClaims || 0
          };
          setStats(extractedStats);
        }
        setStatsError(null);
      } catch (err) {
        // Try fallback endpoint
        console.log("First endpoint failed, trying fallback endpoint...");
        try {
          // Attempt to fetch items data to calculate stats
          const itemsResponse = await fetch('/items', {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          });
          
          if (!itemsResponse.ok) {
            throw new Error('Failed to fetch items for stats');
          }
          
          const itemsData = await itemsResponse.json();
          console.log("Received items data for stats:", itemsData);
          
          // Calculate stats from items data
          const items = Array.isArray(itemsData) ? itemsData : (itemsData.items || []);
          const foundItems = items.filter(item => item.status === 'found');
          const returnedItems = items.filter(item => item.is_returned === true);
          
          // Update stats with calculated values but keep user count
          setStats(prev => ({
            ...prev,
            itemsFound: foundItems.length,
            itemsReturned: returnedItems.length
          }));
          
          setStatsError(null);
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setStatsError('Failed to load statistics');
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/unauthorized');
      return;
    }

    setLoading(true);
    
    // Load data for the active tab
    const loadData = async () => {
      try {
        if (activeTab === 'users' || activeTab === 'stats' || activeTab === 'bannedUsers') {
          await fetchUsers();
        }
        
        if (activeTab === 'logs') {
          await fetchLogs();
        }
        
        if (activeTab === 'stats') {
          await fetchStats();
        }
      } catch (err) {
        console.error("Error loading admin panel data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, navigate, activeTab, refreshTrigger]);

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    try {
      setActionStatus({ type: 'loading', message: `Updating user ${userId} role to ${newRole}...` });
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

      // Update the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      setActionStatus({ type: 'success', message: `User role updated successfully to ${newRole}` });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating role:', err);
      setActionStatus({ 
        type: 'error', 
        message: err.message || 'Failed to update user role'
      });
    }
  };

  // Handle unbanning a user
  const handleUnbanUser = async (userId) => {
    try {
      setActionStatus({ type: 'loading', message: `Unbanning user ${userId}...` });
      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to unban user');
      }

      // Update the local state
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, is_deleted: false } : user
      );
      setUsers(updatedUsers);
      
      // Update banned users list
      setBannedUsers(bannedUsers.filter(user => user.id !== userId));

      setActionStatus({ type: 'success', message: `User unbanned successfully` });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error unbanning user:', err);
      setActionStatus({ 
        type: 'error', 
        message: err.message || 'Failed to unban user'
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Add error displays for each section
  const renderErrorMessage = (errorMsg, refreshFunction) => {
    if (!errorMsg) return null;
    
    return (
      <div className="section-error">
        <p>{errorMsg}</p>
        <button onClick={refreshFunction}>Retry</button>
      </div>
    );
  };

  if (loading && users.length === 0 && logs.length === 0) {
    return <div className="loading">Loading admin panel...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="dashboard-header">
        <h1>Admin Panel</h1>
        <div className="user-info">
          {currentUser && (
            <>
              <span>Logged in as: {currentUser.name || currentUser.email}</span>
              <span className="role-badge">{currentUser.role}</span>
            </>
          )}
        </div>
        <div className="navigation-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/security" className="nav-link">Security Dashboard</Link>
          <Link to="/items" className="nav-link">View All Items</Link>
        </div>
      </div>
      
      {actionStatus && (
        <div className={`action-status ${actionStatus.type}`}>
          {actionStatus.message}
        </div>
      )}
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={`tab ${activeTab === 'bannedUsers' ? 'active' : ''}`}
          onClick={() => setActiveTab('bannedUsers')}
          data-tab="bannedUsers"
          data-count={bannedUsers.length}
        >
          Banned Users
        </button>
        <button
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          System Logs
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      <div className="dashboard-actions">
        <button className="refresh-btn" onClick={refreshData}>
          Refresh Data
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="panel-section">
          <h2>User Management</h2>
          {renderErrorMessage(usersError, fetchUsers)}
          {users.length === 0 && !usersError ? (
            <p>No users found.</p>
          ) : (
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
                {users.filter(user => !user.is_deleted).map(user => (
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
                        disabled={user.role === 'admin' || user.role === 'security'}
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
          )}
        </div>
      )}

      {activeTab === 'bannedUsers' && (
        <div className="panel-section">
          <h2>Banned Users</h2>
          {renderErrorMessage(usersError, fetchUsers)}
          {bannedUsers.length === 0 && !usersError ? (
            <p>No banned users found.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Ban Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bannedUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.ban_reason || 'N/A'}</td>
                    <td>
                      <button 
                        onClick={() => handleUnbanUser(user.id)}
                        className="unban-btn"
                      >
                        Unban User
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="panel-section">
          <h2>System Logs</h2>
          {renderErrorMessage(logsError, fetchLogs)}
          {logs.length === 0 && !logsError ? (
            <p>No logs found.</p>
          ) : (
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
                    <td>{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="panel-section">
          <h2>Statistics</h2>
          {renderErrorMessage(statsError, fetchStats)}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Users</h3>
              <p className="stat-value">{stats.totalUsers || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Items Found</h3>
              <p className="stat-value">{stats.itemsFound || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Items Returned</h3>
              <p className="stat-value">{stats.itemsReturned || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Pending Claims</h3>
              <p className="stat-value">{stats.pendingClaims || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel; 