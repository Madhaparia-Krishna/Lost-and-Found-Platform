import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { securityApi, API_BASE_URL, notificationsApi } from '../utils/api';
import emailService from '../utils/emailService';
import { AuthContext } from '../context/AuthContext';
import { Alert, Spinner, Form, Modal, Button, Badge, ButtonGroup, InputGroup } from 'react-bootstrap';
import '../styles/SecurityDashboard.css';
import axios from 'axios';

const SecurityDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);
  const [requestedItems, setRequestedItems] = useState([]);
  const [returnedItems, setReturnedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeKey, setActiveKey] = useState('dashboard'); // Default to dashboard
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionStatus, setActionStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [users, setUsers] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [itemToReject, setItemToReject] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalItems: 0,
    pendingItems: 0,
    requestedItems: 0,
    totalUsers: 0
  });
  
  // Dummy data for charts - replace with actual data from backend if available
  const itemApprovalData = {
    labels: ['Approved', 'Pending', 'Rejected'],
    datasets: [
      {
        data: [70, 20, 10], // Example counts
        backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'],
        hoverBackgroundColor: ['#27ae60', '#f39c12', '#c0392b'],
      },
    ],
  };

  const requestStatusData = {
    labels: ['Pending', 'Accepted', 'Rejected'],
    datasets: [
      {
        data: [5, 10, 2], // Example counts
        backgroundColor: ['#3498db', '#28a745', '#e74c3c'],
        hoverBackgroundColor: ['#2980b9', '#218838', '#c0392b'],
      },
    ],
  };

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
      
      try {
        await Promise.all([
          fetchApprovedItems(),
          fetchRequestedItems(),
          fetchPendingItems(),
          fetchNotifications(),
          fetchUsers()
        ]);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [refreshTrigger, currentUser, navigate]);

  const fetchPendingItems = async () => {
    try {
      console.log("Fetching pending items...");
      const itemsArray = await securityApi.getPendingItems();
      console.log("Received pending items:", itemsArray);
      
      // If there are pending items, automatically show the pending items tab
      if (itemsArray && itemsArray.length > 0 && activeKey === 'dashboard') {
        setActiveKey('pendingItems');
      }
      
      setPendingItems(Array.isArray(itemsArray) ? itemsArray : []);
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        pendingItems: Array.isArray(itemsArray) ? itemsArray.length : 0
      }));
    } catch (error) {
      console.error('Error fetching pending items:', error);
      setPendingItems([]);
      throw error;
    }
  };

  const fetchApprovedItems = async () => {
    try {
      console.log("Fetching all items for security view...");
      const itemsArray = await securityApi.getAllItems();
      console.log("Received all items:", itemsArray.length);
      
      // Filter to only get approved found items
      const approvedFoundItems = itemsArray.filter(item => {
        // Debug logging to check item properties
        console.log(`Item ${item.id}: status=${item.status}, is_approved=${item.is_approved}, is_deleted=${item.is_deleted}`);
        
        return item.status === 'found' && 
               item.is_approved === true && 
               item.is_deleted !== true;
      });
      
      console.log("Filtered approved items count:", approvedFoundItems.length);
      
      // If no approved items found, double check if is_approved is a boolean or string
      if (approvedFoundItems.length === 0 && itemsArray.length > 0) {
        console.log("No approved items found, checking if is_approved might be a string value...");
        
        // Try with string '1' which might be how MySQL returns boolean TRUE
        const alternativeApprovedItems = itemsArray.filter(item => 
          item.status === 'found' && 
          (item.is_approved === true || item.is_approved === 1 || item.is_approved === '1') && 
          item.is_deleted !== true
        );
        
        console.log("Alternative approved items count:", alternativeApprovedItems.length);
        
        if (alternativeApprovedItems.length > 0) {
          setApprovedItems(alternativeApprovedItems);
          return;
        }
      }
      
      setApprovedItems(approvedFoundItems);
    } catch (error) {
      console.error('Error fetching approved items:', error);
      setApprovedItems([]);
      throw error;
    }
  };

  const fetchRequestedItems = async () => {
    try {
      console.log("Fetching requested items...");
      const itemsArray = await securityApi.getAllItems();
      
      // Filter to only get requested items - remove the is_approved check
      // since requested items may not have the is_approved flag set to true
      const requestedItems = itemsArray.filter(item => 
        item.status === 'requested' && 
        item.is_deleted !== true
      );
      
      console.log("Filtered requested items count:", requestedItems.length);
      setRequestedItems(requestedItems);
    } catch (error) {
      console.error('Error fetching requested items:', error);
      setRequestedItems([]);
      throw error;
    }
  };
  
  const fetchNotifications = async () => {
    try {
      console.log("Fetching notifications...");
      // Use the notificationsApi utility
      const result = await notificationsApi.getAll();
      console.log("Received notifications:", result.notifications.length);
      setNotifications(result.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      throw error;
    }
  };

  const fetchUsers = async () => {
    try {
      console.log("Fetching users...");
      const usersArray = await securityApi.getUsers();
      console.log("Received users:", usersArray.length);
      setUsers(usersArray);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      throw error;
    }
  };

  const handleApproveItem = async (itemId) => {
    try {
      setActionLoading(true);
      
      // Optimistic update - remove from pending items immediately
      const itemToApprove = pendingItems.find(item => item.id === itemId);
      setPendingItems(prevItems => prevItems.filter(item => item.id !== itemId));
      
      // Add to approved items optimistically
      if (itemToApprove) {
        const approvedItem = { ...itemToApprove, is_approved: true };
        setApprovedItems(prev => [approvedItem, ...prev]);
      }
      
      // Show success message immediately
      setActionStatus({
        type: 'success',
        message: 'Item approved'
      });
      
      // Make the API call
      const response = await securityApi.approveItem(itemId);
      console.log('Item approval response:', response);
      
      // Clear status message after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
      
      // Refresh data in the background
      refreshData();
    } catch (error) {
      console.error('Error approving item:', error);
      
      // Revert optimistic update
      refreshData();
      
      setActionStatus({
        type: 'error',
        message: 'Failed to approve item'
      });
      
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectItem = (itemId) => {
    console.log(`Opening reject modal for item ${itemId}`);
    setItemToReject(itemId);
    setShowRejectModal(true);
  };

  const confirmRejectItem = async () => {
    if (!itemToReject || !rejectReason) {
      setActionStatus({ type: 'error', message: 'Please provide a reason for rejection.' });
      return;
    }
    
    try {
      setActionLoading(true);
      
      // Optimistic update - remove from pending items immediately
      setPendingItems(prevItems => prevItems.filter(item => item.id !== itemToReject));
      
      // Show success message immediately
      setActionStatus({
        type: 'success',
        message: 'Item rejected'
      });
      
      // Make the API call
      const response = await securityApi.rejectItem(itemToReject, rejectReason);
      console.log('Item rejection response:', response);
      
      // Close the modal and reset values
      setShowRejectModal(false);
      setItemToReject(null);
      setRejectReason('');
      
      // Clear status message after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
      
      // Refresh data in the background
      refreshData();
    } catch (error) {
      console.error('Error rejecting item:', error);
      
      // Revert optimistic update
      refreshData();
      
      setActionStatus({
        type: 'error',
        message: 'Failed to reject item'
      });
      
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (itemId) => {
    try {
      setActionLoading(true);
      
      // Find the item in the requestedItems array
      const itemToAccept = requestedItems.find(item => item.id === itemId);
      
      // Optimistic update - remove from requestedItems
      setRequestedItems(prevItems => prevItems.filter(item => item.id !== itemId));
      
      // If we found the item, add it to returnedItems
      if (itemToAccept) {
        const returnedItem = { ...itemToAccept, status: 'returned' };
        setReturnedItems(prev => [returnedItem, ...prev]);
      }
      
      // Show success message immediately
      setActionStatus({
        type: 'success',
        message: 'Request accepted'
      });
      
      // Make the API call
      const response = await securityApi.acceptRequest(itemId);
      console.log('Request acceptance response:', response);
      
      // Send email to item reporter
      const item = approvedItems.find(item => item.id === itemId) || itemToAccept;
      if (item && item.reporter_email) {
        try {
          await emailService.sendItemReturnedEmail(item.reporter_email, item.reporter_name, item.name);
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Continue with the process even if email fails
        }
      }
      
      // Clear status message after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
      
      // Refresh data in the background
      refreshData();
    } catch (error) {
      console.error('Error accepting request:', error);
      
      // Revert optimistic update
      refreshData();
      
      setActionStatus({
        type: 'error',
        message: 'Failed to accept request'
      });
      
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (itemId) => {
    try {
      setActionLoading(true);
      
      // Find the item in requestedItems
      const itemToReject = requestedItems.find(item => item.id === itemId);
      
      // Optimistic update - remove from requestedItems
      setRequestedItems(prevItems => prevItems.filter(item => item.id !== itemId));
      
      // If we found the item, add it back to approvedItems
      if (itemToReject) {
        const foundItem = { ...itemToReject, status: 'found' };
        setApprovedItems(prev => [foundItem, ...prev]);
      }
      
      // Show success message immediately
      setActionStatus({
        type: 'success',
        message: 'Request rejected'
      });
      
      // Make the API call
      const response = await securityApi.rejectRequest(itemId);
      console.log('Request rejection response:', response);
      
      // Clear status message after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
      
      // Refresh data in the background
      refreshData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      
      // Revert optimistic update
      refreshData();
      
      setActionStatus({
        type: 'error',
        message: 'Failed to reject request'
      });
      
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSoftDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleBanUser = (userId, userName) => {
    setUserToBan({ id: userId, name: userName });
    setShowBanModal(true);
  };

  const handleUnbanUser = async (userId) => {
    try {
      setActionLoading(true);
      
      // Find the user in the users array
      const userToUnban = users.find(user => user.id === userId);
      
      // Optimistic update - update the user's status in the local state
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, is_deleted: false } : user
      ));
      
      // Show success message immediately
      setActionStatus({
        type: 'success',
        message: 'User unbanned'
      });
      
      // Make the API call
      const response = await securityApi.unbanUser(userId);
      console.log('User unban response:', response);
      
      // Clear status message after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
      
      // Refresh data in the background
      refreshData();
    } catch (error) {
      console.error('Error unbanning user:', error);
      
      // Revert optimistic update
      refreshData();
      
      setActionStatus({
        type: 'error',
        message: 'Failed to unban user'
      });
      
      setTimeout(() => {
        setActionStatus(null);
      }, 2000);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmSoftDelete = async () => {
    if (!itemToDelete || !deleteReason) {
      setActionStatus({ type: 'error', message: 'Please provide a reason for deletion.' });
      return;
    }
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: `Deleting item ${itemToDelete.title || itemToDelete.name || ''}...`
      });
      
      console.log(`Soft deleting item ${itemToDelete.id} with reason: ${deleteReason}...`);
      
      // Get token from current user
      const token = currentUser?.token;
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      // Make direct axios call to delete endpoint
      const response = await axios({
        method: 'put',
        url: `${API_BASE_URL}/api/security/items/${itemToDelete.id}/soft-delete`,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: { reason: deleteReason }
      });
      
      console.log('Delete response:', response);
      
      // Handle successful deletion - immediately update UI
      const itemId = itemToDelete.id;
      const itemName = itemToDelete.title || itemToDelete.name || 'Item';
      
      // Update all item lists to remove the deleted item
      setPendingItems(prev => prev.filter(item => item.id !== itemId));
      setApprovedItems(prev => prev.filter(item => item.id !== itemId));
      setRequestedItems(prev => prev.filter(item => item.id !== itemId));
      setReturnedItems(prev => prev.filter(item => item.id !== itemId));
      
      // Close modal immediately
      setShowDeleteModal(false);
      
      // Create success alert
      setActionStatus({
        type: 'success',
        message: `Item "${itemName}" (ID: ${itemId}) has been successfully deleted.`
      });
      
      // Reset form state
      setItemToDelete(null);
      setDeleteReason('');
      
      // Clear success message after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error deleting item:', error);
      
      setActionStatus({
        type: 'error',
        message: `Failed to delete item: ${error.message || 'Unknown error'}`
      });
      
      // Don't close the modal so user can try again
    } finally {
      setActionLoading(false);
    }
  };

  const confirmBanUser = async () => {
    if (!userToBan || !banReason) {
      setActionStatus({ type: 'error', message: 'Please provide a reason for banning.' });
      return;
    }
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: `Banning ${userToBan.name || 'user'}...`
      });
      
      await securityApi.banUser(userToBan.id, banReason);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userToBan.id 
            ? { ...user, is_deleted: true, ban_reason: banReason } 
            : user
        )
      );

      setActionStatus({
        type: 'success',
        message: `${userToBan.name || 'User'} banned successfully`
      });
      
      setShowBanModal(false);
      setUserToBan(null);
      setBanReason('');

      refreshData();
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error banning user:', err);
      setActionStatus({
        type: 'error',
        message: 'Failed to ban user. Please try again.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Render a table of items
  const renderItemsTable = (itemsToRender, showActions = true) => (
    <div className="table-responsive">
      {activeKey === 'pendingItems' && (
        <div className="pending-items-header">
          <h3>Found Items Pending Approval</h3>
          <div className="approval-instructions">
            <p>
              <i className="fas fa-info-circle"></i> Found items require your approval before they become visible to users. 
              Lost items are automatically approved and don't appear here.
            </p>
            {itemsToRender.length === 0 ? (
              <div className="no-pending-items">
                <i className="fas fa-check-circle"></i> No found items pending approval at this time.
              </div>
            ) : (
              <div className="pending-count">
                <span className="badge bg-warning">{itemsToRender.length}</span> found items waiting for your review
              </div>
            )}
          </div>
        </div>
      )}
      
      <table className="table security-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Approved</th>
            <th>Date</th>
            <th>Reported By</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {itemsToRender.length > 0 ? (
            itemsToRender.map(item => (
              <tr key={item.id} className={item.status === 'found' && !item.is_approved ? 'pending-approval-row' : ''}>
                <td>{item.id}</td>
                <td>{item.name || item.title}</td>
                <td>{item.category}</td>
                <td><Badge bg={item.status === 'lost' ? 'danger' : 'success'}>{item.status}</Badge></td>
                <td>
                  {item.is_approved !== undefined ? (
                    <Badge bg={item.is_approved ? 'success' : 'warning'}>
                      {item.is_approved ? 'Yes' : 'No'}
                    </Badge>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td>{formatDate(item.date_found || item.date_lost || item.date)}</td>
                <td>{item.reporter_name || 'N/A'}</td>
                {showActions && (
                  <td>
                    <ButtonGroup aria-label="Item Actions">
                      <Button variant="info" size="sm" onClick={() => navigate(`/items/${item.id}`)}>
                        View
                      </Button>
                      {activeKey === 'pendingItems' && (
                        <>
                          <Button variant="success" size="sm" onClick={() => handleApproveItem(item.id)} disabled={actionLoading}> 
                            <i className="fas fa-check"></i> Approve
                          </Button>
                          <Button variant="warning" size="sm" onClick={() => handleRejectItem(item.id)} disabled={actionLoading}>
                            <i className="fas fa-times"></i> Reject
                          </Button>
                        </>
                      )}
                      {activeKey === 'requestedItems' && (
                        <>
                          <Button variant="success" size="sm" onClick={() => handleAcceptRequest(item.id)} disabled={actionLoading}> 
                            Accept
                          </Button>
                          <Button variant="warning" size="sm" onClick={() => handleRejectRequest(item.id)} disabled={actionLoading}>
                            Reject
                          </Button>
                        </>
                      )}
                      <Button variant="danger" size="sm" onClick={() => handleSoftDelete(item)} disabled={actionLoading}> 
                        Delete
                      </Button>
                    </ButtonGroup>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={showActions ? "8" : "7"} className="text-center">
                <p>No items to display.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderUsersTab = () => (
    <div className="security-users-section">
      <h2 className="page-title">User Overview</h2>
      <p className="section-description">View registered users and their roles. Security staff can ban users.</p>
      {actionStatus && (
        <Alert variant={actionStatus.type === 'success' ? 'success' : 'danger'} className="mb-3">
          {actionStatus.message}
        </Alert>
      )}
      
      <div className="filter-and-search-bar mb-3">
        <InputGroup>
          <Form.Control
            placeholder="Search users by name or email..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
          />
          <Button variant="outline-secondary" onClick={() => setRefreshTrigger(prev => prev + 1)}>
            <i className="fas fa-search"></i> Search
          </Button>
        </InputGroup>
      </div>

      {loading ? (
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading users...</span>
        </Spinner>
      ) : (
        <div className="table-responsive">
          <table className="table security-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Ban Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users
                  .filter(user => 
                    (user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())) &&
                    user.role !== 'admin' && user.role !== 'security'
                  )
                  .map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td><Badge bg={user.role === 'admin' ? 'danger' : (user.role === 'security' ? 'primary' : 'success')}>{user.role}</Badge></td>
                      <td><Badge bg={user.is_deleted ? 'secondary' : 'success'}>{user.is_deleted ? 'Banned' : 'Active'}</Badge></td>
                      <td>{user.ban_reason || 'N/A'}</td>
                      <td>
                        {currentUser.role === 'security' || currentUser.role === 'admin' ? (
                          <ButtonGroup aria-label="User Actions">
                            {user.is_deleted ? (
                              <Button variant="success" size="sm" onClick={() => handleUnbanUser(user.id)} disabled={actionLoading}>
                                {actionLoading ? <Spinner animation="border" size="sm" /> : 'Unban'}
                              </Button>
                            ) : (
                              <Button variant="warning" size="sm" onClick={() => handleBanUser(user.id, user.name)} disabled={actionLoading}>
                                {actionLoading ? <Spinner animation="border" size="sm" /> : 'Ban'}
                              </Button>
                            )}
                          </ButtonGroup>
                        ) : (
                          <Badge bg="info">No Actions</Badge>
                        )}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">
                    <p>No users found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ban User Modal (kept as is) */}
      <Modal show={showBanModal} onHide={() => setShowBanModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Ban User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to ban user <strong>{userToBan?.name || userToBan?.id}</strong>?</p>
          <Form.Group className="mb-3">
            <Form.Label>Reason for banning:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g., Repeated policy violations, fraudulent activity"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBanModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmBanUser} disabled={actionLoading}>
            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Confirm Ban'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );

  // Render Notifications tab content
  const renderNotificationsTab = () => (
    <div className="security-notifications-section">
      <h2 className="page-title">Notifications</h2>
      <p className="section-description">View system notifications and alerts.</p>
      {loading ? (
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading notifications...</span>
        </Spinner>
      ) : (
        <div className="table-responsive">
          <table className="table security-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Message</th>
                <th>Created At</th>
                <th>Read</th>
              </tr>
            </thead>
            <tbody>
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <tr key={notification.id}>
                    <td>{notification.id}</td>
                    <td><Badge bg={notification.type === 'info' ? 'info' : notification.type === 'warning' ? 'warning' : 'danger'}>{notification.type}</Badge></td>
                    <td>{notification.message}</td>
                    <td>{formatDate(notification.created_at)}</td>
                    <td><i className={`fas ${notification.is_read ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}`}></i></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">
                    <p>No notifications to display.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render Dashboard overview content
  const renderDashboard = () => (
    <div className="dashboard-stats-section">
      <h2 className="page-title">Overview</h2>
      <p className="section-description">Quick statistics about items and users requiring attention.</p>
      
      {loading ? (
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading stats...</span>
        </Spinner>
      ) : (
        <div className="dashboard-cards-container">
          <div className="dashboard-card total-pending-items">
            <div className="card-icon"><i className="fas fa-hourglass-half"></i></div>
            <div className="card-title">Pending Approvals</div>
            <div className="card-value">{pendingItems.length}</div>
          </div>
          <div className="dashboard-card total-requested-items">
            <div className="card-icon"><i className="fas fa-hand-paper"></i></div>
            <div className="card-title">Pending Requests</div>
            <div className="card-value">{requestedItems.length}</div>
          </div>
          <div className="dashboard-card total-approved-items">
            <div className="card-icon"><i className="fas fa-check-circle"></i></div>
            <div className="card-title">Approved Found Items</div>
            <div className="card-value">{approvedItems.length}</div>
          </div>
          <div className="dashboard-card total-users">
            <div className="card-icon"><i className="fas fa-users"></i></div>
            <div className="card-title">Total Users</div>
            <div className="card-value">{users.length}</div>
          </div>
        </div>
      )}

      {/* Chart Placeholders */}
      <div className="dashboard-charts-container">
        <div className="chart-card">
          <h3 className="chart-title">Item Approval Info</h3>
          <div className="info-content">
            <p>Total items: {pendingItems.length + approvedItems.length}</p>
            <p>Pending approval: {pendingItems.length}</p>
            <p>Approved items: {approvedItems.length}</p>
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Request Resolution Info</h3>
          <div className="info-content">
            <p>Total requests: {requestedItems.length}</p>
            <p>Pending requests: {requestedItems.filter(item => item.status === 'requested').length}</p>
            <p>Returned items: {returnedItems.length}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="security-dashboard-container">
      <div className="page-header">
        <h1 className="page-title">Security Dashboard</h1>
        <p className="page-description">Welcome, {currentUser?.name || 'Security Staff'}! Monitor and manage item approvals and user requests.</p>
      </div>

      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

      {/* Tabs for navigation */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab ${activeKey === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveKey('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`tab ${activeKey === 'pendingItems' ? 'active' : ''}`}
            onClick={() => setActiveKey('pendingItems')}
          >
            Pending Items ({pendingItems.length})
          </button>
          <button 
            className={`tab ${activeKey === 'approvedItems' ? 'active' : ''}`}
            onClick={() => setActiveKey('approvedItems')}
          >
            Approved Found Items
          </button>
          <button 
            className={`tab ${activeKey === 'requestedItems' ? 'active' : ''}`}
            onClick={() => setActiveKey('requestedItems')}
          >
            Item Requests ({requestedItems.length})
          </button>
          <button 
            className={`tab ${activeKey === 'users' ? 'active' : ''}`}
            onClick={() => setActiveKey('users')}
          >
            Users
          </button>
          <button 
            className={`tab ${activeKey === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveKey('notifications')}
          >
            Notifications
          </button>
        </div>

        <div className="tab-content">
          {activeKey === 'dashboard' && renderDashboard()}\n          {activeKey === 'pendingItems' && renderItemsTable(pendingItems)}
          {activeKey === 'approvedItems' && renderItemsTable(approvedItems, false)}
          {activeKey === 'requestedItems' && renderItemsTable(requestedItems)}
          {activeKey === 'users' && renderUsersTab()}
          {activeKey === 'notifications' && renderNotificationsTab()}
        </div>
      </div>
      
      {/* Modals for delete, ban, reject */}
      {/* Delete Item Modal (kept as is) */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Soft Delete Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to soft delete item <strong>{itemToDelete?.name || itemToDelete?.id}</strong>?</p>
          <p className="text-danger">This item will be hidden from public view but can be restored by an administrator.</p>
          <Form.Group className="mb-3">
            <Form.Label>Reason for soft deletion:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g., Inappropriate content, duplicate entry, resolved externally"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmSoftDelete} disabled={actionLoading}>
            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Confirm Soft Delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Ban User Modal (kept as is) */}
      <Modal show={showBanModal} onHide={() => setShowBanModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Ban User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to ban user <strong>{userToBan?.name || userToBan?.id}</strong>?</p>
          <Form.Group className="mb-3">
            <Form.Label>Reason for banning:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g., Repeated policy violations, fraudulent activity"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBanModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmBanUser} disabled={actionLoading}>
            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Confirm Ban'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Item Modal (kept as is) */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Item Approval</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to reject the approval for item <strong>{itemToReject}</strong>?</p>
          <Form.Group className="mb-3">
            <Form.Label>Reason for rejection:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Insufficient details, fake entry, already claimed"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmRejectItem} disabled={actionLoading}>
            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Confirm Reject'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SecurityDashboard; 