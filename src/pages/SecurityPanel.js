import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/SecurityPanel.css';

const SecurityPanel = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('claims');
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || (currentUser.role !== 'security' && currentUser.role !== 'admin')) {
        navigate('/unauthorized');
        return;
      }

      try {
        setLoading(true);
        
        // Use Promise.all to fetch all data in parallel
        const [itemsResponse, claimsResponse, notificationsResponse] = await Promise.all([
          fetch('/api/security/items', {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          }),
          fetch('/api/security/claims', {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          }),
          fetch('/api/notifications', {
            headers: {
              'Authorization': `Bearer ${currentUser.token}`
            }
          })
        ]);

        // Check responses
        if (!itemsResponse.ok) {
          throw new Error('Failed to fetch items');
        }
        if (!claimsResponse.ok) {
          throw new Error('Failed to fetch claims');
        }
        if (!notificationsResponse.ok) {
          throw new Error('Failed to fetch notifications');
        }

        // Parse data in parallel
        const [itemsData, claimsData, notificationsData] = await Promise.all([
          itemsResponse.json(),
          claimsResponse.json(),
          notificationsResponse.json()
        ]);

        setItems(itemsData.items || []);
        setClaims(claimsData.claims || []);
        setNotifications(notificationsData.notifications || []);
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load security panel data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  // Handle claim status update
  const handleClaimAction = async (claimId, newStatus) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/security/claims/${claimId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update claim status');
      }

      setClaims(claims.map(claim => 
        claim.id === claimId ? { ...claim, status: newStatus } : claim
      ));

      const itemsResponse = await fetch('/api/security/items', {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setItems(itemsData.items || []);
      }

      alert(`Claim has been ${newStatus}`);
    } catch (err) {
      console.error('Error updating claim status:', err);
      alert('Failed to update claim: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle item status update
  const handleItemStatusChange = async (itemId, newStatus) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/security/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update item status');
      }
      
      setItems(items.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      ));

      alert(`Item status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating item status:', err);
      alert('Failed to update item status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Switch to admin panel
  const handleSwitchToAdmin = () => {
    navigate('/admin');
  };

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update notifications in state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId ? { ...notification, status: 'read' } : notification
      ));

    } catch (err) {
      console.error('Error marking notification as read:', err);
      alert('Failed to mark notification as read: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && items.length === 0 && claims.length === 0) {
    return (
      <div className="security-panel loading">
        <div className="loading-spinner"></div>
        <p>Loading security panel...</p>
      </div>
    );
  }

  return (
    <div className="security-panel">
      {actionLoading && (
        <div className="action-loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      
      <div className="panel-header">
        <h1>Security Panel</h1>
        <div className="user-info">
          <span>Logged in as: {currentUser.name}</span>
          <span className="role-badge">{currentUser.role}</span>
          {currentUser.role === 'admin' && (
            <button className="switch-panel-btn" onClick={handleSwitchToAdmin}>
              Switch to Admin Panel
            </button>
          )}
          <Link to="/" className="back-home-link">Back to Home</Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="panel-navigation">
        <button 
          className={`nav-tab ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          Pending Claims {claims.filter(c => c.status === 'pending').length > 0 && 
            <span className="badge">{claims.filter(c => c.status === 'pending').length}</span>}
        </button>
        <button 
          className={`nav-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items Management
        </button>
        <button 
          className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications {notifications.filter(n => n.status === 'unread').length > 0 && 
            <span className="badge">{notifications.filter(n => n.status === 'unread').length}</span>}
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'claims' && (
          <div className="panel-section">
            <h2>Claims Management</h2>
            {claims.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item</th>
                    <th>Image</th>
                    <th>Claimer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map(claim => (
                    <tr key={claim.id} className={claim.status === 'pending' ? 'pending-row' : ''}>
                      <td>{claim.id}</td>
                      <td>{claim.item_title || 'Unknown Item'}</td>
                      <td>
                        {claim.item_image ? (
                          <img 
                            src={claim.item_image} 
                            alt={claim.item_title || 'Item image'} 
                            className="item-thumbnail"
                            onError={(e) => { 
                              e.target.onerror = null; 
                              e.target.src = fallbackImageSrc;
                            }}
                          />
                        ) : (
                          <img 
                            src={fallbackImageSrc} 
                            alt="No image available" 
                            className="item-thumbnail"
                          />
                        )}
                      </td>
                      <td>{claim.claimer_name || 'Unknown User'}</td>
                      <td>{formatDate(claim.date || claim.created_at)}</td>
                      <td>
                        <span className={`status-badge status-${claim.status}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="action-buttons">
                        {claim.status === 'pending' && (
                          <>
                            <button 
                              className="approve-btn"
                              onClick={() => handleClaimAction(claim.id, 'approved')}
                              disabled={actionLoading}
                            >
                              Approve
                            </button>
                            <button 
                              className="reject-btn"
                              onClick={() => handleClaimAction(claim.id, 'rejected')}
                              disabled={actionLoading}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No claims found.</p>
            )}
          </div>
        )}

        {activeTab === 'items' && (
          <div className="panel-section">
            <h2>Items Management</h2>
            {items.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.title}</td>
                      <td>{item.category || 'N/A'}</td>
                      <td>{item.location || 'N/A'}</td>
                      <td>{formatDate(item.date || item.created_at)}</td>
                      <td>
                        <span className={`status-badge status-${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <select 
                          value={item.status}
                          onChange={(e) => handleItemStatusChange(item.id, e.target.value)}
                          className="status-select"
                          disabled={actionLoading}
                        >
                          <option value="claimed">Claimed</option>
                          <option value="returned">Returned</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No items found.</p>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="panel-section">
            <h2>Notifications</h2>
            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${notification.status === 'unread' ? 'unread' : ''}`}
                  >
                    <div className="notification-content">
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>
                    {notification.status === 'unread' && (
                      <button 
                        className="mark-read-btn"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={actionLoading}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No notifications found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityPanel; 