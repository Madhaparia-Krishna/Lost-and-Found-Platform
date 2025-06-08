import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { securityApi, API_BASE_URL, notificationsApi } from '../utils/api';
import emailService from '../utils/emailService';
import { AuthContext } from '../context/AuthContext';
import { Container, Row, Col, Card, Table, Badge, Button, Nav, Alert, Spinner, Form, Modal, Tabs, Tab, InputGroup, Dropdown } from 'react-bootstrap';
import '../styles/SecurityDashboard.css';

const SecurityDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);
  const [requestedItems, setRequestedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeKey, setActiveKey] = useState('dashboard');
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
      console.log("Received pending items:", itemsArray.length);
      
      setPendingItems(itemsArray);
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
      const approvedFoundItems = itemsArray.filter(item => 
        item.status === 'found' && 
        item.is_approved === true && 
        item.is_deleted !== true
      );
      
      console.log("Filtered approved items count:", approvedFoundItems.length);
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
      setActionStatus({
        type: 'loading',
        message: 'Approving item...'
      });
      
      console.log(`Approving item ${itemId}...`);
      const response = await securityApi.approveItem(itemId);
      console.log('Item approval response:', response);
      
      setActionStatus({
        type: 'success',
        message: 'Item approved successfully'
      });
      
      // Refresh data to update the UI
      refreshData();
      
      // Clear status after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
    } catch (error) {
      console.error('Error approving item:', error);
      setActionStatus({
        type: 'error',
        message: `Error approving item: ${error.message || 'Unknown error'}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectItem = async (itemId) => {
    // Show modal to get rejection reason
    setItemToReject(itemId);
    setShowRejectModal(true);
  };

  const confirmRejectItem = async () => {
    if (!itemToReject) return;
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Rejecting item...'
      });
      
      console.log(`Rejecting item ${itemToReject} with reason: ${rejectReason}...`);
      const response = await securityApi.rejectItem(itemToReject, rejectReason);
      console.log('Item rejection response:', response);
      
      setActionStatus({
        type: 'success',
        message: 'Item rejected successfully'
      });
      
      // Close the modal and reset values
      setShowRejectModal(false);
      setItemToReject(null);
      setRejectReason('');
      
      // Refresh data to update the UI
      refreshData();
      
      // Clear status after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
    } catch (error) {
      console.error('Error rejecting item:', error);
      setActionStatus({
        type: 'error',
        message: `Error rejecting item: ${error.message || 'Unknown error'}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (itemId) => {
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Accepting request...'
      });
      
      await securityApi.markItemReturned(itemId);
      
      setActionStatus({
        type: 'success',
        message: 'Request accepted successfully. Item marked as returned.'
      });
      
      // Refresh data to update the UI
      refreshData();
      
      // Clear status after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
    } catch (error) {
      console.error('Error accepting request:', error);
      setActionStatus({
        type: 'error',
        message: `Error accepting request: ${error.message || 'Unknown error'}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (itemId) => {
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Rejecting request...'
      });
      
      console.log(`Attempting to reject request for item ${itemId} by reverting status to "found"`);
      
      // Revert status back to "found"
      const response = await securityApi.revertItemStatus(itemId, 'found');
      console.log('Revert status response:', response);
      
      setActionStatus({
        type: 'success',
        message: 'Request rejected successfully. Item status reverted to "found".'
      });
      
      // Refresh data to update the UI
      refreshData();
      
      // Clear status after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
    } catch (error) {
      console.error('Error rejecting request:', error);
      console.error('Error details:', error.message);
      setActionStatus({
        type: 'error',
        message: `Error rejecting request: ${error.message || 'Unknown error'}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSoftDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleBanUser = (userId, userName) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToBan(user);
      setShowBanModal(true);
    } else {
      // Create a temporary user object if we don't have full user details
      setUserToBan({
        id: userId,
        name: userName || 'Unknown User'
      });
      setShowBanModal(true);
    }
  };

  const confirmSoftDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Deleting item...'
      });
      
      // Call the API to soft delete the item
      await securityApi.softDeleteItem(itemToDelete.id, deleteReason);
      
      setActionStatus({
        type: 'success',
        message: 'Item deleted successfully'
      });
      
      // Close the modal and reset values
      setShowDeleteModal(false);
      setItemToDelete(null);
      setDeleteReason('');
      
      // Refresh data to update the UI
      refreshData();
      
      // Clear status after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
    } catch (error) {
      console.error('Error deleting item:', error);
      setActionStatus({
        type: 'error',
        message: `Error deleting item: ${error.message || 'Unknown error'}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmBanUser = async () => {
    if (!userToBan) return;
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Banning user...'
      });
      
      // Call the API to ban the user
      await securityApi.banUser(userToBan.id, banReason);
      
      setActionStatus({
        type: 'success',
        message: 'User banned successfully'
      });
      
      // Close the modal and reset values
      setShowBanModal(false);
      setUserToBan(null);
      setBanReason('');
      
      // Refresh data to update the UI
      refreshData();
      
      // Clear status after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
    } catch (error) {
      console.error('Error banning user:', error);
      setActionStatus({
        type: 'error',
        message: `Error banning user: ${error.message || 'Unknown error'}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApprovedItems = searchQuery
    ? approvedItems.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reporter_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : approvedItems;

  const filteredRequestedItems = searchQuery
    ? requestedItems.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reporter_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : requestedItems;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Function to get dashboard statistics
  const fetchStats = useCallback(() => {
    const totalItems = pendingItems.length + approvedItems.length + requestedItems.length;
    
    setStats({
      totalItems,
      pendingItems: pendingItems.length,
      requestedItems: requestedItems.length,
      totalUsers: users.length
    });
  }, [pendingItems, approvedItems, requestedItems, users]);

  // Add useEffect to update stats when data changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats, pendingItems, approvedItems, requestedItems, users]);

  // Filtered users based on search query
  const filteredUsers = userSearchQuery
    ? users.filter(user => 
        user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(userSearchQuery.toLowerCase())
      )
    : users;

  // Render users table
  const renderUsersTab = () => (
    <Card className="shadow-sm">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-users me-2"></i>
            User Management
          </h5>
          <Form.Group>
            <InputGroup>
              <Form.Control
                type="text"
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              <Button 
                variant="outline-secondary"
                onClick={() => setUserSearchQuery('')}
              >
                <i className="fas fa-times"></i>
              </Button>
            </InputGroup>
          </Form.Group>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover bordered className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Faculty/School</th>
                <th>Registration Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <i className="fas fa-users fa-2x mb-3 text-muted"></i>
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="user-avatar me-2">
                          <div className={`avatar-circle bg-${
                            user.role === 'admin' ? 'danger' :
                            user.role === 'security' ? 'warning' : 'primary'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <p className="mb-0 fw-medium">{user.name}</p>
                          {user.admission_number && (
                            <small className="text-muted">{user.admission_number}</small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <Badge bg={
                        user.role === 'admin' ? 'danger' :
                        user.role === 'security' ? 'warning' : 'primary'
                      }>
                        {user.role}
                      </Badge>
                    </td>
                    <td>{user.faculty_school || 'N/A'}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="d-flex">
                        <Button 
                          variant="outline-info" 
                          size="sm" 
                          className="me-2"
                          title="View User Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                        
                        {user.role !== 'admin' && user.role !== 'security' && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleBanUser(user.id, user.name)}
                            title="Ban User"
                          >
                            <i className="fas fa-user-slash"></i>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );

  // Dashboard content
  const renderDashboard = () => (
    <Row>
      <Col>
        <Row className="mb-4">
          <Col md={3}>
            <Card className="shadow-sm h-100">
              <Card.Body className="text-center">
                <div className="d-flex align-items-center justify-content-center mb-3">
                  <i className="fas fa-clipboard-list fa-3x text-primary"></i>
                </div>
                <h2 className="mb-0">{stats.totalItems}</h2>
                <p className="text-muted mb-0">Total Items</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm h-100">
              <Card.Body className="text-center">
                <div className="d-flex align-items-center justify-content-center mb-3">
                  <i className="fas fa-clock fa-3x text-warning"></i>
                </div>
                <h2 className="mb-0">{stats.pendingItems}</h2>
                <p className="text-muted mb-0">Pending Approval</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm h-100">
              <Card.Body className="text-center">
                <div className="d-flex align-items-center justify-content-center mb-3">
                  <i className="fas fa-hand-paper fa-3x text-danger"></i>
                </div>
                <h2 className="mb-0">{stats.requestedItems}</h2>
                <p className="text-muted mb-0">Requested Items</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm h-100">
              <Card.Body className="text-center">
                <div className="d-flex align-items-center justify-content-center mb-3">
                  <i className="fas fa-users fa-3x text-success"></i>
                </div>
                <h2 className="mb-0">{stats.totalUsers}</h2>
                <p className="text-muted mb-0">Total Users</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {requestedItems.length > 0 && (
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm border-warning">
                <Card.Header className="bg-warning text-white">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Attention Required
                </Card.Header>
                <Card.Body>
                  <p className="mb-3">
                    There {requestedItems.length === 1 ? 'is' : 'are'} <strong>{requestedItems.length}</strong> item{requestedItems.length === 1 ? '' : 's'} waiting to be returned to {requestedItems.length === 1 ? 'its' : 'their'} owner.
                  </p>
                  <Button 
                    variant="warning" 
                    onClick={() => setActiveKey('requested')}
                  >
                    <i className="fas fa-eye me-2"></i>
                    View Requested Items
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {pendingItems.length > 0 && (
          <Row className="mb-4">
            <Col>
              <Card className="shadow-sm border-info">
                <Card.Header className="bg-info text-white">
                  <i className="fas fa-clipboard-check me-2"></i>
                  Items Needing Approval
                </Card.Header>
                <Card.Body>
                  <p className="mb-3">
                    There {pendingItems.length === 1 ? 'is' : 'are'} <strong>{pendingItems.length}</strong> item{pendingItems.length === 1 ? '' : 's'} waiting for your approval.
                  </p>
                  <Button 
                    variant="info" 
                    onClick={() => setActiveKey('pending')}
                  >
                    <i className="fas fa-eye me-2"></i>
                    Review Pending Items
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        <Row>
          <Col>
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <h5 className="mb-0">Recent Activity</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="list-group list-group-flush">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="fas fa-bell-slash fa-2x mb-3 text-muted"></i>
                      <p>No recent notifications</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(notification => (
                      <div key={notification.id} className="list-group-item py-3">
                        <div className="d-flex align-items-center">
                          <div className="me-3">
                            <span className={`notification-icon bg-${
                              notification.type === 'approval' ? 'success' : 
                              notification.type === 'request' ? 'warning' :
                              notification.type === 'match' ? 'info' : 'secondary'
                            }`}>
                              <i className={`fas ${
                                notification.type === 'approval' ? 'fa-check' : 
                                notification.type === 'request' ? 'fa-hand-paper' :
                                notification.type === 'match' ? 'fa-exchange-alt' : 'fa-bell'
                              }`}></i>
                            </span>
                          </div>
                          <div>
                            <p className="mb-1">{notification.message}</p>
                            <small className="text-muted">{formatDate(notification.created_at)}</small>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card.Body>
              {notifications.length > 5 && (
                <Card.Footer className="bg-white text-center">
                  <Button 
                    variant="link" 
                    className="text-decoration-none"
                    onClick={() => setActiveKey('notifications')}
                  >
                    View All Notifications
                  </Button>
                </Card.Footer>
              )}
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  );

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading security dashboard...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <div className="security-badge">
                      <i className="fas fa-shield-alt"></i>
                    </div>
                  </div>
                  <div>
                    <h1 className="mb-0">Security Dashboard</h1>
                    <p className="text-muted mb-0">Manage lost and found items and users</p>
                  </div>
                </div>
                <div>
                  <Badge bg="warning" className="me-2 p-2">
                    <i className="fas fa-user-shield me-1"></i>
                    Security Access
                  </Badge>
                  <Button 
                    variant="outline-primary" 
                    onClick={refreshData}
                    disabled={actionLoading}
                  >
                    <i className="fas fa-sync-alt me-1"></i> Refresh
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Action Status */}
      {actionStatus && (
        <Row className="mb-4">
          <Col>
            <Alert 
              variant={
                actionStatus.type === 'error' ? 'danger' : 
                actionStatus.type === 'success' ? 'success' : 
                actionStatus.type === 'loading' ? 'info' : 'info'
              }
              dismissible={actionStatus.type !== 'loading'}
              onClose={() => setActionStatus(null)}
            >
              {actionStatus.type === 'loading' && (
                <Spinner animation="border" size="sm" className="me-2" />
              )}
              {actionStatus.message}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Navigation Tabs */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body className="p-0">
              <Tabs
                activeKey={activeKey}
                onSelect={(k) => setActiveKey(k)}
                className="mb-0"
                fill
              >
                <Tab 
                  eventKey="dashboard" 
                  title={
                    <span><i className="fas fa-tachometer-alt me-2"></i>Dashboard</span>
                  }
                />
                <Tab 
                  eventKey="requested" 
                  title={
                    <span>
                      <i className="fas fa-hand-paper me-2"></i>
                      Requested Items
                      {requestedItems.length > 0 && (
                        <Badge bg="warning" className="ms-2">{requestedItems.length}</Badge>
                      )}
                    </span>
                  }
                />
                <Tab 
                  eventKey="pending" 
                  title={
                    <span>
                      <i className="fas fa-clock me-2"></i>
                      Pending Approval
                      {pendingItems.length > 0 && (
                        <Badge bg="secondary" className="ms-2">{pendingItems.length}</Badge>
                      )}
                    </span>
                  }
                />
                <Tab 
                  eventKey="found" 
                  title={
                    <span>
                      <i className="fas fa-list me-2"></i>
                      Found Items
                    </span>
                  }
                />
                <Tab 
                  eventKey="users" 
                  title={
                    <span>
                      <i className="fas fa-users me-2"></i>
                      Users
                    </span>
                  }
                />
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row>
        <Col>
          {activeKey === 'dashboard' && renderDashboard()}
          
          {activeKey === 'found' && (
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="fas fa-list me-2"></i>
                    Found Items
                  </h5>
                  <Form.Group>
                    <Form.Control
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '250px' }}
                    />
                  </Form.Group>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover bordered className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th style={{ width: '10%' }}>Image</th>
                        <th style={{ width: '20%' }}>Item Name</th>
                        <th style={{ width: '15%' }}>Category</th>
                        <th style={{ width: '15%' }}>Reported By</th>
                        <th style={{ width: '15%' }}>Date Reported</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th style={{ width: '15%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApprovedItems.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4">
                            <i className="fas fa-inbox fa-2x mb-3 text-muted"></i>
                            <p>No approved found items available</p>
                          </td>
                        </tr>
                      ) : (
                        filteredApprovedItems.map(item => (
                          <tr key={item.id}>
                            <td className="text-center">
                              {item.image ? (
                                <img 
                                  src={`${API_BASE_URL}/uploads/${item.image}`}
                                  alt={item.title}
                                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = fallbackImageSrc;
                                  }}
                                  className="rounded"
                                />
                              ) : (
                                <div className="bg-light d-flex justify-content-center align-items-center rounded" style={{ width: '50px', height: '50px' }}>
                                  <i className="fas fa-image text-muted"></i>
                                </div>
                              )}
                            </td>
                            <td>{item.title}</td>
                            <td>
                              <Badge bg="light" text="dark">
                                {item.category || 'Uncategorized'}
                              </Badge>
                            </td>
                            <td>{item.reporter_name || 'Anonymous'}</td>
                            <td>{formatDate(item.created_at)}</td>
                            <td>
                              <Badge bg="success">Found</Badge>
                            </td>
                            <td>
                              <Button 
                                variant="outline-danger" 
                                size="sm" 
                                className="me-1"
                                onClick={() => handleSoftDelete(item)}
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                as={Link}
                                to={`/items/${item.id}`}
                                className="me-1"
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                              {item.user_id && (
                                <Button 
                                  variant="outline-dark" 
                                  size="sm"
                                  onClick={() => handleBanUser(item.user_id, item.reporter_name)}
                                  title="Ban User"
                                >
                                  <i className="fas fa-user-slash"></i>
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
          
          {activeKey === 'pending' && (
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="fas fa-clock me-2"></i>
                    Pending Approval
                  </h5>
                  <Form.Group>
                    <Form.Control
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '250px' }}
                    />
                  </Form.Group>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover bordered className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th style={{ width: '10%' }}>Image</th>
                        <th style={{ width: '20%' }}>Item Name</th>
                        <th style={{ width: '15%' }}>Category</th>
                        <th style={{ width: '15%' }}>Reported By</th>
                        <th style={{ width: '15%' }}>Date Reported</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th style={{ width: '15%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingItems.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            <i className="fas fa-inbox fa-2x mb-3 text-muted"></i>
                            <p>No pending items requiring approval</p>
                          </td>
                        </tr>
                      ) : (
                        pendingItems.map(item => (
                          <tr key={item.id}>
                            <td className="text-center">
                              {item.image ? (
                                <img 
                                  src={`${API_BASE_URL}/uploads/${item.image}`}
                                  alt={item.title}
                                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = fallbackImageSrc;
                                  }}
                                  className="rounded"
                                />
                              ) : (
                                <div className="bg-light d-flex justify-content-center align-items-center rounded" style={{ width: '50px', height: '50px' }}>
                                  <i className="fas fa-image text-muted"></i>
                                </div>
                              )}
                            </td>
                            <td>{item.title}</td>
                            <td>
                              <Badge bg="light" text="dark">
                                {item.category || 'Uncategorized'}
                              </Badge>
                            </td>
                            <td>{item.reporter_name || 'Anonymous'}</td>
                            <td>{formatDate(item.created_at)}</td>
                            <td>
                              <Button 
                                variant="success" 
                                size="sm" 
                                className="me-2"
                                onClick={() => handleApproveItem(item.id)}
                                disabled={actionLoading}
                              >
                                <i className="fas fa-check me-1"></i> Approve
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="me-2"
                                onClick={() => handleRejectItem(item.id)}
                                disabled={actionLoading}
                              >
                                <i className="fas fa-times me-1"></i> Reject
                              </Button>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                as={Link}
                                to={`/items/${item.id}`}
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
          
          {activeKey === 'requested' && (
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="fas fa-hand-paper me-2"></i>
                    Requested Items
                  </h5>
                  <Form.Group>
                    <Form.Control
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '250px' }}
                    />
                  </Form.Group>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover bordered className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th style={{ width: '10%' }}>Image</th>
                        <th style={{ width: '20%' }}>Item Name</th>
                        <th style={{ width: '15%' }}>Category</th>
                        <th style={{ width: '15%' }}>Reported By</th>
                        <th style={{ width: '15%' }}>Date Reported</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th style={{ width: '15%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequestedItems.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            <i className="fas fa-inbox fa-2x mb-3 text-muted"></i>
                            <p>No requested items at the moment</p>
                          </td>
                        </tr>
                      ) : (
                        filteredRequestedItems.map(item => (
                          <tr key={item.id}>
                            <td className="text-center">
                              {item.image ? (
                                <img 
                                  src={`${API_BASE_URL}/uploads/${item.image}`}
                                  alt={item.title}
                                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = fallbackImageSrc;
                                  }}
                                  className="rounded"
                                />
                              ) : (
                                <div className="bg-light d-flex justify-content-center align-items-center rounded" style={{ width: '50px', height: '50px' }}>
                                  <i className="fas fa-image text-muted"></i>
                                </div>
                              )}
                            </td>
                            <td>{item.title}</td>
                            <td>
                              <Badge bg="light" text="dark">
                                {item.category || 'Uncategorized'}
                              </Badge>
                            </td>
                            <td>{item.claimer_name || item.reporter_name || 'Unknown'}</td>
                            <td>{formatDate(item.updated_at || item.created_at)}</td>
                            <td>
                              <Button 
                                variant="success" 
                                size="sm" 
                                className="me-2"
                                onClick={() => handleAcceptRequest(item.id)}
                                disabled={actionLoading}
                              >
                                <i className="fas fa-check me-1"></i> Accept
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm" 
                                className="me-2"
                                onClick={() => handleRejectRequest(item.id)}
                                disabled={actionLoading}
                              >
                                <i className="fas fa-times me-1"></i> Reject
                              </Button>
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                as={Link}
                                to={`/items/${item.id}`}
                              >
                                <i className="fas fa-eye"></i>
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
          
          {activeKey === 'users' && renderUsersTab()}
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this item?</p>
          <p className="text-muted small">This will hide the item from normal users but it will still be visible to security and admin staff.</p>
          
          {itemToDelete && (
            <div className="d-flex align-items-center mt-3 mb-3 p-2 bg-light rounded">
              {itemToDelete.image ? (
                <img 
                  src={`${API_BASE_URL}/uploads/${itemToDelete.image}`}
                  alt={itemToDelete.title}
                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                  className="rounded me-3"
                />
              ) : (
                <div className="bg-secondary d-flex justify-content-center align-items-center rounded me-3" style={{ width: '50px', height: '50px' }}>
                  <i className="fas fa-image text-white"></i>
                </div>
              )}
              <div>
                <h6 className="mb-0">{itemToDelete.title}</h6>
                <small>{itemToDelete.category}</small>
              </div>
            </div>
          )}
          
          <Form.Group className="mt-3">
            <Form.Label>Reason for Deletion (Optional)</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              placeholder="Enter reason for deletion"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmSoftDelete}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Processing...
              </>
            ) : (
              'Delete Item'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Ban User Modal */}
      <Modal show={showBanModal} onHide={() => setShowBanModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Ban User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            This action will prevent the user from logging into the system.
          </div>
          
          {userToBan && (
            <div className="d-flex align-items-center mt-3 mb-3 p-3 bg-light rounded">
              <div className="bg-dark text-white d-flex justify-content-center align-items-center rounded-circle me-3" style={{ width: '50px', height: '50px' }}>
                <i className="fas fa-user"></i>
              </div>
              <div>
                <h6 className="mb-0">{userToBan.name}</h6>
                <small>{userToBan.email}</small>
              </div>
            </div>
          )}
          
          <Form.Group className="mt-3">
            <Form.Label>Reason for Banning <span className="text-danger">*</span></Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              placeholder="Enter reason for banning (required)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              required
            />
            <Form.Text className="text-muted">
              This information will be logged for administrative purposes.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBanModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmBanUser}
            disabled={actionLoading || !banReason.trim()}
          >
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-user-slash me-2"></i>
                Ban User
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Item Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Rejection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to reject this item?</p>
          <p className="text-muted small">This action cannot be undone.</p>
          
          <Form.Group className="mt-3">
            <Form.Label>Reason for Rejection <span className="text-danger">*</span></Form.Label>
            <Form.Control 
              as="textarea" 
              rows={3} 
              placeholder="Enter reason for rejection (required)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
            <Form.Text className="text-muted">
              This information will be sent to the user who reported the item.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmRejectItem}
            disabled={actionLoading || !rejectReason.trim()}
          >
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-times me-2"></i>
                Reject Item
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom CSS */}
      <style>{`
        .avatar-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-weight: bold;
        }
        
        .security-badge {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #f8c100;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-size: 20px;
        }
        
        .notification-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
        }
      `}</style>
    </Container>
  );
};

export default SecurityDashboard; 