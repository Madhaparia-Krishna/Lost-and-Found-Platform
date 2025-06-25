import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { itemsApi, API_BASE_URL, notificationsApi } from '../utils/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // Store all items for debugging
  const [matchNotifications, setMatchNotifications] = useState([]); // Store match notifications
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('lost');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionStatus, setActionStatus] = useState(null);
  const [showDebug, setShowDebug] = useState(false); // Toggle for debug view
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";

  // Refresh data function
  const refreshData = () => {
    console.log("Refreshing dashboard data...");
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    if (!currentUser || !currentUser.token) return;
    
    try {
      const result = await notificationsApi.getAll(currentUser.token);
      
      // Filter only match notifications for lost items and sort by newest first
      const matchNotifs = result.notifications
        .filter(n => (n.type === 'match' && n.item_status === 'lost') || 
                     (n.type === 'new_found_item' && n.user_has_lost_items === true))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setMatchNotifications(matchNotifs);
      console.log(`Fetched ${matchNotifs.length} relevant notifications`);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };
  
  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    if (!currentUser || !currentUser.token) return;
    
    try {
      await notificationsApi.markAsRead(notificationId, currentUser.token);
      
      // Update local state to mark notification as read
      setMatchNotifications(matchNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: 'read' }
          : notification
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        await fetchItems();
        await fetchNotifications();
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data. Please try again later.");
      }
      
      setLoading(false);
    };
    
    loadData();
    
    // Set up polling for notifications every 30 seconds
    const notificationInterval = setInterval(fetchNotifications, 30000);
    
    // Cleanup
    return () => clearInterval(notificationInterval);
  }, [refreshTrigger, currentUser, navigate]);

  const fetchItems = async () => {
    try {
      console.log("Fetching items...");
      setActionStatus({
        type: 'loading',
        message: 'Fetching items from server...'
      });
      
      const itemsArray = await itemsApi.getAll();
      console.log("Received items:", itemsArray.length);
      
      // Store all items for debugging
      setAllItems(itemsArray);
      
      // Log all items for debugging
      console.log("All items from API:", itemsArray);
      
      // Filter for found items - include all approved found items
      const approvedFoundItems = itemsArray.filter(item => {
        // Check for case-insensitive status matching
        const isFound = item.status && item.status.toLowerCase() === 'found';
        const isApproved = item.is_approved === true || item.is_approved === 1;
        const isNotDeleted = item.is_deleted !== true && item.is_deleted !== 1;
        console.log(`Item ${item.id}: status=${item.status}, isFound=${isFound}, isApproved=${isApproved}, isNotDeleted=${isNotDeleted}`);
        return isFound && isApproved && isNotDeleted;
      });
      
      // Filter for lost items - include all lost items
      const allLostItems = itemsArray.filter(item => {
        // Check for case-insensitive status matching
        const isLost = item.status && item.status.toLowerCase() === 'lost';
        const isNotDeleted = item.is_deleted !== true && item.is_deleted !== 1;
        return isLost && isNotDeleted;
      });
      
      // Filter for user's own items
      const userOwnedItems = itemsArray.filter(item => 
        item.user_id === currentUser.id &&
        (item.is_deleted !== true && item.is_deleted !== 1)
      );
      
      console.log("Filtered found items:", approvedFoundItems.length);
      console.log("Filtered lost items:", allLostItems.length);
      console.log("User's items:", userOwnedItems.length);
      
      setFoundItems(approvedFoundItems);
      setLostItems(allLostItems);
      setUserItems(userOwnedItems);
      setError(null);
      
      // Show success message
      setActionStatus({
        type: 'success',
        message: `Successfully loaded ${itemsArray.length} items from the server`
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Error fetching items');
      setActionStatus({
        type: 'error',
        message: `Failed to fetch items: ${error.message}`
      });
      setFoundItems([]);
      setLostItems([]);
      setUserItems([]);
      setAllItems([]);
    }
  };

  // Toggle debug view
  const toggleDebugView = () => {
    setShowDebug(!showDebug);
  };

  const isOwner = (item) => {
    return currentUser && item.user_id === currentUser.id;
  };

  const canSeeFullDetails = (item) => {
    if (item.status !== 'found') return true;
    if (isOwner(item)) return true;
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'security')) return true;
    return false;
  };

  // Handle claim request
  const handleClaimRequest = (itemId) => {
    navigate(`/claim/${itemId}`);
  };

  // Render error message
  const renderErrorMessage = (errorMsg) => {
    if (!errorMsg) return null;
    
    return (
      <div className="section-error">
        <p>{errorMsg}</p>
        <button onClick={refreshData}>Retry</button>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
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
          <Link to="/items" className="nav-link">View All Items</Link>
          <Link to="/found" className="nav-link">Report Found Item</Link>
          <Link to="/lost" className="nav-link">Report Lost Item</Link>
          {currentUser && (currentUser.role === 'security' || currentUser.role === 'admin') && (
            <Link to="/security" className="nav-link security-link">Security Dashboard</Link>
          )}
          {currentUser && currentUser.role === 'admin' && (
            <Link to="/admin" className="nav-link admin-link">Admin Panel</Link>
          )}
        </div>
      </div>
      
      {actionStatus && (
        <div className={`action-status ${actionStatus.type}`}>
          {actionStatus.message}
        </div>
      )}
      
      {/* Match Notifications Section */}
      {matchNotifications.length > 0 && (
        <div className="match-notifications-section">
          <h2>Match Notifications</h2>
          <div className="match-notifications-container">
            {matchNotifications.slice(0, 3).map((notification) => (
              <div 
                key={notification.id}
                className={`match-notification-card ${notification.status}`}
                onClick={() => {
                  if (notification.related_item_id) {
                    navigate(`/items/${notification.related_item_id}`);
                    markNotificationAsRead(notification.id);
                  }
                }}
              >
                <div className="match-notification-content">
                  <div className="match-notification-header">
                    <span className="match-icon">🔍</span>
                    <span className="match-status">{notification.status === 'unread' ? 'New Match!' : 'Match'}</span>
                    {notification.status === 'unread' && (
                      <span className="unread-indicator"></span>
                    )}
                  </div>
                  <p>{notification.message}</p>
                  <div className="match-notification-footer">
                    <span className="notification-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    <button 
                      className="view-match-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (notification.related_item_id) {
                          navigate(`/items/${notification.related_item_id}`);
                          markNotificationAsRead(notification.id);
                        }
                      }}
                    >
                      View Match
                    </button>
                    {notification.status === 'unread' && (
                      <button
                        className="mark-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationAsRead(notification.id);
                        }}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {matchNotifications.length > 3 && (
              <div className="more-notifications">
                <span>{matchNotifications.length - 3} more notifications</span>
                <button 
                  className="view-all-btn"
                  onClick={() => document.querySelector('.notification-button').click()}
                >
                  View all
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'lost' ? 'active' : ''}`}
          onClick={() => setActiveTab('lost')}
        >
          Lost Items ({lostItems.length})
        </button>
        <button
          className={`tab ${activeTab === 'found' ? 'active' : ''}`}
          onClick={() => setActiveTab('found')}
        >
          Found Items ({foundItems.length})
        </button>
        <button
          className={`tab ${activeTab === 'my-items' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-items')}
        >
          My Items ({userItems.length})
        </button>
        {(currentUser.role === 'admin' || currentUser.role === 'security') && (
          <button
            className={`tab ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            Debug View ({allItems.length})
          </button>
        )}
      </div>

      <div className="dashboard-actions">
        <button className="refresh-btn" onClick={refreshData}>
          Refresh Data
        </button>
      </div>

      {activeTab === 'lost' && (
        <div className="lost-items">
          <h2>Lost Items</h2>
          {renderErrorMessage(error)}
          {lostItems.length === 0 && !error ? (
            <p>No lost items to display</p>
          ) : (
            <div className="items-grid">
              {lostItems.map((item) => (
                <div key={item.id} className="item-card lost-item-card">
                  {item.image && (
                    <div className="item-image">
                      <img 
                        src={`${API_BASE_URL}/uploads/${item.image}`} 
                        alt={item.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImageSrc;
                        }}
                      />
                    </div>
                  )}
                  <div className="item-details">
                    <div className="status-badge lost">Lost</div>
                    <h3>{item.title}</h3>
                    <p className="category">{item.category}</p>
                    <p className="description">{item.description}</p>
                    <p className="location"><strong>Last seen:</strong> {item.location}</p>
                    <p className="lost-date"><strong>Lost on:</strong> {item.date ? new Date(item.date).toLocaleDateString() : 'Not specified'}</p>
                    <p className="reporter">Reported by: {item.reporter_name || 'Anonymous'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'found' && (
        <div className="found-items">
          <h2>Found Items</h2>
          {renderErrorMessage(error)}
          {foundItems.length === 0 && !error ? (
            <p>No found items to display</p>
          ) : (
            <div className="items-grid">
              {foundItems.map((item) => (
                <div key={item.id} className="item-card found-item-card">
                  {item.image && (
                    <div className="item-image">
                      <img 
                        src={`${API_BASE_URL}/uploads/${item.image}`} 
                        alt={item.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImageSrc;
                        }}
                      />
                    </div>
                  )}
                  <div className="item-details">
                    <div className="status-badge found">Found</div>
                    <h3>{item.title}</h3>
                    <p className="category">{item.category}</p>
                    <p className="description">{item.description}</p>
                    
                    {canSeeFullDetails(item) ? (
                      <>
                        <p className="location"><strong>Location:</strong> {item.location}</p>
                        <p className="found-date"><strong>Found on:</strong> {item.date ? new Date(item.date).toLocaleDateString() : 'Not specified'}</p>
                      </>
                    ) : (
                      <div className="restricted-info">
                        <p><i className="fas fa-lock"></i> Location and date details are hidden</p>
                        <p className="info-note">These details are only visible to security staff and the person who reported the item.</p>
                      </div>
                    )}
                    
                    <div className="item-actions">
                      <button 
                        className="claim-button"
                        onClick={() => handleClaimRequest(item.id)}
                      >
                        Request This Item
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'my-items' && (
        <div className="my-items">
          <h2>My Items</h2>
          {renderErrorMessage(error)}
          
          <div className="info-box approval-info">
            <i className="fas fa-info-circle info-icon"></i>
            <div className="info-content">
              <h4>Found Item Approval Process</h4>
              <p>All reported found items must be approved by security staff before they're visible to other users. 
              Items with "Pending Approval" status are still being reviewed.</p>
            </div>
          </div>
          
          {userItems.length === 0 && !error ? (
            <p>You haven't reported any items yet</p>
          ) : (
            <div className="items-grid">
              {userItems.map((item) => (
                <div key={item.id} className="item-card my-item-card">
                  {item.image && (
                    <div className="item-image">
                      <img 
                        src={`${API_BASE_URL}/uploads/${item.image}`} 
                        alt={item.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImageSrc;
                        }}
                      />
                    </div>
                  )}
                  <div className="item-details">
                    <div className={`status-badge ${item.status}`}>{item.status}</div>
                    {item.is_approved === false && item.status === 'found' && (
                      <div className="approval-badge pending">Pending Approval</div>
                    )}
                    <h3>{item.title}</h3>
                    <p className="category">{item.category}</p>
                    <p className="description">{item.description}</p>
                    <p className="location"><strong>Location:</strong> {item.location}</p>
                    <p className="date"><strong>Date:</strong> {item.date ? new Date(item.date).toLocaleDateString() : 'Not specified'}</p>
                    <p className="status"><strong>Status:</strong> {item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'debug' && (
        <div className="debug-view">
          <h2>Debug View - All Items ({allItems.length})</h2>
          <p className="section-description">
            This view shows all items from the database, regardless of status or approval.
          </p>
          {allItems.length === 0 && !error ? (
            <p>No items found in the database</p>
          ) : (
            <div className="debug-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Approved</th>
                    <th>Deleted</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.title}</td>
                      <td>{item.status}</td>
                      <td>{item.category}</td>
                      <td>{item.location}</td>
                      <td>{item.is_approved ? 'Yes' : 'No'}</td>
                      <td>{item.is_deleted ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 