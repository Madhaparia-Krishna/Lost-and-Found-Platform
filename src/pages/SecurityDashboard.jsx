import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { securityApi, API_BASE_URL, notificationsApi } from '../utils/api';
import emailService from '../utils/emailService';
import { AuthContext } from '../context/AuthContext';
import '../styles/SecurityDashboard.css';
import { api } from '../utils/api';

const SecurityDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('items');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionStatus, setActionStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [itemsError, setItemsError] = useState(null);
  const [claimsError, setClaimsError] = useState(null);
  const [notificationsError, setNotificationsError] = useState(null);
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";

  // Refresh data function
  const refreshData = () => {
    console.log("Refreshing security dashboard data...");
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || (currentUser.role !== 'security' && currentUser.role !== 'admin')) {
        navigate('/unauthorized');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Use individual try-catch blocks for each API call to prevent one failure from stopping all
      try {
        await fetchPendingItems();
      } catch (err) {
        console.error("Error loading pending items:", err);
      }
      
      try {
        await fetchApprovedItems();
      } catch (err) {
        console.error("Error loading approved items:", err);
      }
      
      try {
        await fetchPendingClaims();
      } catch (err) {
        console.error("Error loading pending claims:", err);
      }
      
      try {
        await fetchNotifications();
      } catch (err) {
        console.error("Error loading notifications:", err);
      }
      
      setLoading(false);
    };
    
    loadData();
  }, [refreshTrigger, currentUser, navigate]);

  const fetchPendingItems = async () => {
    try {
      console.log("Fetching pending items...");
      const itemsArray = await securityApi.getPendingItems();
      console.log("Received pending items:", itemsArray.length);
      
      setPendingItems(itemsArray);
      setItemsError(null);
    } catch (error) {
      console.error('Error fetching pending items:', error);
      setItemsError('Error fetching pending items');
      setPendingItems([]);
    }
  };

  const fetchApprovedItems = async () => {
    try {
      console.log("Fetching all items for security view...");
      const itemsArray = await securityApi.getAllItems();
      console.log("Received all items:", itemsArray.length);
      
      // Filter to only get approved found items
      const approvedFoundItems = itemsArray.filter(item => {
        console.log(`Checking item ${item.id || 'unknown'}: status=${item.status}, approved=${item.is_approved}`);
        return item.status === 'found' && item.is_approved === true;
      });
      
      console.log("Filtered approved items count:", approvedFoundItems.length);
      setApprovedItems(approvedFoundItems);
      setItemsError(null);
    } catch (error) {
      console.error('Error fetching approved items:', error);
      setApprovedItems([]);
      setItemsError('Error fetching approved items');
    }
  };

  const fetchPendingClaims = async () => {
    try {
      console.log("Fetching pending claims...");
      const claimsArray = await securityApi.getPendingClaims();
      console.log("Received pending claims:", claimsArray.length);
      setPendingClaims(claimsArray);
      setClaimsError(null);
    } catch (error) {
      console.error('Error fetching pending claims:', error);
      setPendingClaims([]);
      setClaimsError('Error fetching pending claims');
    }
  };
  
  const fetchNotifications = async () => {
    try {
      console.log("Fetching notifications...");
      // Use the notificationsApi utility
      const result = await notificationsApi.getAll();
      console.log("Received notifications:", result.notifications.length);
      setNotifications(result.notifications);
      setNotificationsError(null);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setNotificationsError('Error fetching notifications');
    }
  };

  const handleApproveItem = async (itemId) => {
    try {
      setActionStatus({ type: 'loading', message: `Approving item ${itemId}...` });
      await securityApi.approveItem(itemId);
      setActionStatus({ type: 'success', message: 'Item approved successfully!' });
      refreshData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error approving item:', error);
      setActionStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error approving item' 
      });
    }
  };

  const handleRejectItem = async (itemId) => {
    try {
      setActionStatus({ type: 'loading', message: `Rejecting item ${itemId}...` });
      await securityApi.rejectItem(itemId);
      setActionStatus({ type: 'success', message: 'Item rejected successfully!' });
      refreshData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error rejecting item:', error);
      setActionStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error rejecting item' 
      });
    }
  };

  const handleMarkItemReceived = async (itemId) => {
    try {
      setActionStatus({ type: 'loading', message: `Marking item ${itemId} as received...` });
      await securityApi.markItemReceived(itemId);
      setActionStatus({ type: 'success', message: 'Item marked as received successfully!' });
      refreshData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error marking item as received:', error);
      setActionStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error marking item as received' 
      });
    }
  };

  const handleMarkItemReturned = async (itemId) => {
    try {
      setActionStatus({ type: 'loading', message: `Marking item ${itemId} as returned...` });
      await securityApi.markItemReturned(itemId);
      setActionStatus({ type: 'success', message: 'Item marked as returned successfully!' });
      refreshData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error marking item as returned:', error);
      setActionStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Error marking item as returned' 
      });
    }
  };

  const handleClaimAction = async (claimId, action) => {
    try {
      setActionStatus({ type: 'loading', message: `Processing claim ${claimId}...` });
      setActionLoading(true);
      await securityApi.processClaim(claimId, action);
      setActionStatus({ type: 'success', message: `Claim ${action}ed successfully!` });
      refreshData();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (error) {
      console.error(`Error ${action}ing claim:`, error);
      setActionStatus({ 
        type: 'error', 
        message: error.response?.data?.message || `Error ${action}ing claim` 
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      setActionLoading(true);
      console.log(`Marking notification ${notificationId} as read...`);
      await notificationsApi.markAsRead(notificationId);
      
      // Update notifications in state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId ? { ...notification, status: 'read' } : notification
      ));
      
      setActionStatus({ type: 'success', message: 'Notification marked as read' });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setActionStatus({ 
        type: 'error', 
        message: 'Failed to mark notification as read'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Send email notification manually
  const sendEmailNotification = async (email, name, item) => {
    try {
      setActionStatus({ type: 'loading', message: `Sending notification to ${email}...` });
      const result = await emailService.sendMatchNotification(
        email,
        name,
        item.title,
        'manual-notification',
        {
          category: item.category,
          date: item.date || new Date(),
          description: item.description
        }
      );

      if (result.success) {
        setActionStatus({ type: 'success', message: `Email notification sent to ${email}` });
      } else {
        setActionStatus({ type: 'error', message: 'Failed to send email notification' });
      }
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error sending email:', error);
      setActionStatus({ type: 'error', message: 'Failed to send email notification' });
    }
  };

  if (loading) {
    return <div className="loading">Loading security dashboard...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button className="refresh-btn" onClick={refreshData}>Try Again</button>
        <button className="back-btn" onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  // Separate lost and found items
  const foundItems = pendingItems.filter(item => {
    console.log(`Checking found item ${item.id || 'unknown'}: status=${item.status}, approved=${item.is_approved}, is_approved type: ${typeof item.is_approved}`);
    // MySQL boolean values might be coming as 0/1 integers instead of true/false
    return item.status === 'found' && (item.is_approved === false || item.is_approved === 0);
  });
  
  const lostItems = pendingItems.filter(item => {
    console.log(`Checking lost item ${item.id || 'unknown'}: status=${item.status}`);
    return item.status === 'lost';
  });
  
  console.log(`Found ${foundItems.length} pending found items and ${lostItems.length} lost items`);
  console.log('Pending items from API:', pendingItems);
  console.log('Filtered found items:', foundItems);

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

  return (
    <div className="security-dashboard">
      <div className="dashboard-header">
        <h1>Security Dashboard</h1>
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
          {currentUser && currentUser.role === 'admin' && (
            <Link to="/admin" className="nav-link admin-link">Admin Panel</Link>
          )}
        </div>
      </div>
      
      <div className="dashboard-info-banner">
        <p><strong>Important:</strong> Found items must be approved before they appear on the public "View All Items" page.</p>
        <p>Use the "Approve Item" button to make items visible to the public.</p>
      </div>
      
      {actionStatus && (
        <div className={`action-status ${actionStatus.type}`}>
          {actionStatus.message}
        </div>
      )}
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Pending Found Items ({foundItems.length})
        </button>
        <button
          className={`tab ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          Approved Items ({approvedItems.length})
        </button>
        <button
          className={`tab ${activeTab === 'lost' ? 'active' : ''}`}
          onClick={() => setActiveTab('lost')}
        >
          Lost Items ({lostItems.length})
        </button>
        <button
          className={`tab ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          Pending Claims ({pendingClaims.length})
        </button>
      </div>

      <div className="dashboard-actions">
        <button className="refresh-btn" onClick={refreshData}>
          Refresh Data
        </button>
      </div>

      {activeTab === 'items' && (
        <div className="pending-items">
          <h2>Pending Found Items</h2>
          <p className="section-description">
            These items need your approval before they will be visible on the public "View All Items" page.
          </p>
          {renderErrorMessage(itemsError, fetchPendingItems)}
          {foundItems.length === 0 && !itemsError ? (
            <p>No pending found items to review</p>
          ) : (
            <div className="items-grid">
              {foundItems.map((item) => (
                <div key={item.id} className="item-card">
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
                    <div className="approval-badge pending">Awaiting Approval</div>
                    <h3>{item.title}</h3>
                    <p className="category">{item.category}</p>
                    <p className="description">{item.description}</p>
                    <p className="location"><strong>Location:</strong> {item.location}</p>
                    <p className="found-date"><strong>Found on:</strong> {item.date ? new Date(item.date).toLocaleDateString() : 'Not specified'}</p>
                    <p className="reporter">Reported by: {item.reporter_name || 'Anonymous'}</p>
                    <p className="report-date">Report date: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}</p>
                    
                    <div className="item-actions">
                      <button
                        className="approve-button"
                        onClick={() => handleApproveItem(item.id)}
                      >
                        Approve Item
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => handleRejectItem(item.id)}
                      >
                        Reject Item
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'approved' && (
        <div className="approved-items">
          <h2>Approved Found Items</h2>
          {renderErrorMessage(itemsError, fetchApprovedItems)}
          {approvedItems.length === 0 && !itemsError ? (
            <p>No approved found items</p>
          ) : (
            <div className="items-grid">
              {approvedItems.map((item) => (
                <div key={item.id} className="item-card approved-item-card">
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
                    <div className="approval-badge approved">Approved</div>
                    {item.is_received && <div className="status-badge received">Received</div>}
                    {item.is_returned && <div className="status-badge returned">Returned</div>}
                    <h3>{item.title}</h3>
                    <p className="category">{item.category}</p>
                    <p className="description">{item.description}</p>
                    <p className="location"><strong>Location:</strong> {item.location}</p>
                    <p className="found-date"><strong>Found on:</strong> {item.date ? new Date(item.date).toLocaleDateString() : 'Not specified'}</p>
                    <p className="reporter">Reported by: {item.reporter_name || 'Anonymous'}</p>
                    <p className="report-date">Report date: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}</p>
                    
                    <div className="item-actions">
                      {!item.is_received && (
                        <button
                          className="receive-button"
                          onClick={() => handleMarkItemReceived(item.id)}
                        >
                          Mark as Received
                        </button>
                      )}
                      {item.is_received && !item.is_returned && (
                        <button
                          className="return-button"
                          onClick={() => handleMarkItemReturned(item.id)}
                        >
                          Mark as Returned
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'lost' && (
        <div className="lost-items">
          <h2>Lost Items</h2>
          {renderErrorMessage(itemsError, fetchPendingItems)}
          {lostItems.length === 0 && !itemsError ? (
            <p>No lost items reported</p>
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
                    <p className="report-date">Report date: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}</p>
                    
                    <button
                      className="notification-button"
                      onClick={() => sendEmailNotification(
                        item.reporter_email || "user@example.com",
                        item.reporter_name || "User",
                        item
                      )}
                    >
                      Send Match Notification
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="pending-claims">
          <h2>Pending Claims</h2>
          {renderErrorMessage(claimsError, fetchPendingClaims)}
          {pendingClaims.length === 0 && !claimsError ? (
            <p>No pending claims to review</p>
          ) : (
            <div className="claims-grid">
              {pendingClaims.map((claim) => (
                <div key={claim.id} className="claim-card">
                  <div className="claim-details">
                    <h3>Claim for: {claim.item_title}</h3>
                    <p className="claimer">Claimed by: {claim.claimer_name}</p>
                    <p className="description">{claim.claim_description}</p>
                    <p className="contact">Contact: {claim.contact_info}</p>
                    <p className="date">Date: {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'Unknown'}</p>
                    <div className="claim-actions">
                      <button
                        className="approve-button"
                        onClick={() => handleClaimAction(claim.id, 'approve')}
                      >
                        Approve Claim
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => handleClaimAction(claim.id, 'reject')}
                      >
                        Reject Claim
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard; 