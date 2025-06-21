import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner, Form, Modal, Button, Badge, ButtonGroup, InputGroup, Table, Tabs } from 'react-bootstrap';
import { adminApi } from '../utils/api';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to dashboard view
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'
  const [oldItems, setOldItems] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLostItems: 0,
    totalFoundItems: 0,
    totalPendingItems: 0,
    totalReturnedItems: 0,
    totalBannedUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [actionStatus, setActionStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  
  // Donation modal states
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [itemToDonate, setItemToDonate] = useState(null);
  const [donationReason, setDonationReason] = useState('Unclaimed for over a year');
  const [donationOrganization, setDonationOrganization] = useState('');
  
  // Role change states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  // Fetch data on component mount
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/unauthorized');
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching admin dashboard data...');
        console.log('Current user:', currentUser);
        console.log('API base URL:', API_BASE_URL);

        // Try to fetch users first, as it's the most important for the admin dashboard
        let usersData = [];
        try {
          console.log('Fetching users from adminApi...');
          usersData = await adminApi.getAllUsers();
          console.log('Users data received:', usersData);
          
          // Check if we got a valid array
          if (!Array.isArray(usersData) || usersData.length === 0) {
            console.warn('Users data is empty or not an array. Trying direct API call...');
            
            try {
              // Try direct API call with axios
              const response = await axios.get(`${API_BASE_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${currentUser.token}` }
              });
              console.log('Direct API response:', response.data);
              
              if (Array.isArray(response.data) && response.data.length > 0) {
                usersData = response.data;
                console.log('Successfully fetched users from direct API call');
              } else {
                console.warn('Direct API call returned invalid users data, trying debug endpoint...');
                
                // Try debug endpoint as last resort
                const debugResponse = await axios.get(`${API_BASE_URL}/api/debug/users`, {
                  headers: { Authorization: `Bearer ${currentUser.token}` }
                });
                
                if (debugResponse.data && debugResponse.data.users && Array.isArray(debugResponse.data.users)) {
                  usersData = debugResponse.data.users;
                  console.log('Successfully fetched users from debug endpoint');
                } else {
                  console.error('All attempts to fetch users failed');
                  usersData = [];
                }
              }
            } catch (directError) {
              console.error('Error in direct API call:', directError);
              usersData = [];
            }
          }
        } catch (usersError) {
          console.error('Error fetching users:', usersError);
          usersData = [];
        }
        
        // Now that we've tried our best to get users data, set it
        setUsers(usersData);
        
        // Continue with other data fetching
        try {
          console.log('Fetching items, logs, and stats data...');
          
          // Use the adminApi from our api.js utility for remaining data - handle each separately to avoid Promise.all failing if one fails
          let itemsData = [], logsData = [], statsData = {};
          
          try {
            console.log('Fetching items...');
            itemsData = await adminApi.getAllItems();
            console.log('Items data received:', itemsData?.length || 0, 'items');
          } catch (itemsError) {
            console.error('Error fetching items:', itemsError);
            itemsData = [];
          }
          
          try {
            console.log('Fetching logs...');
            logsData = await adminApi.getSystemLogs();
            console.log('Logs data received:', logsData?.length || 0, 'logs');
          } catch (logsError) {
            console.error('Error fetching logs:', logsError);
            logsData = [];
          }
          
          try {
            console.log('Fetching dashboard stats...');
            statsData = await adminApi.getDashboardStats();
            console.log('Stats data received:', statsData);
          } catch (statsError) {
            console.error('Error fetching stats:', statsError);
            statsData = {};
          }
          
          // If stats are returned from the API, use them, otherwise calculate
          if (statsData && Object.keys(statsData).length > 0) {
            console.log('Using stats from API');
            // Process the stats data
            const processedStats = {
              totalUsers: statsData.users?.total || usersData.length || 0,
              totalBannedUsers: statsData.users?.banned || usersData.filter(u => u.is_deleted).length || 0,
              totalLostItems: statsData.items?.lost || 0,
              totalFoundItems: statsData.items?.found || 0,
              totalPendingItems: statsData.items?.requested || 0,
              totalReturnedItems: statsData.items?.returned || 0
            };
            setStats(processedStats);
            console.log('Stats processed:', processedStats);
          } else {
            console.log('Calculating stats from data');
            // Calculate statistics from data
            calculateStats(usersData, itemsData);
          }

          // Set items array for all items
          const allItems = Array.isArray(itemsData) ? itemsData : [];
          setItems(allItems);
          
          // Get old items using the dedicated API endpoint
          try {
            console.log('Fetching old items for donation...');
            const oldItemsData = await adminApi.getOldItems();
            console.log('Old items data received:', oldItemsData?.length || 0, 'items');
            setOldItems(Array.isArray(oldItemsData) ? oldItemsData : []);
          } catch (oldItemsError) {
            console.error('Error fetching old items:', oldItemsError);
            
            // Fallback to filtering items client-side if the API call fails
            console.log('Falling back to client-side filtering for old items');
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            
            console.log('One year ago date:', oneYearAgo.toISOString());
            
            // Filter non-donated items that are older than 1 year
            const oldItemsList = allItems.filter(item => {
              // Check both created_at and date fields since some items might use one or the other
              const itemCreatedDate = item.created_at ? new Date(item.created_at) : null;
              const itemDate = item.date ? new Date(item.date) : null;
              
              // Use the earlier date between created_at and date
              let effectiveDate = itemCreatedDate;
              if (itemDate && (!effectiveDate || itemDate < effectiveDate)) {
                effectiveDate = itemDate;
              }
              
              // If we don't have any valid date, include it in the list to be safe
              if (!effectiveDate) {
                console.log('Item with no valid date:', item.id, item.title);
                return !item.is_donated;
              }
              
              const isOld = effectiveDate < oneYearAgo;
              if (isOld && !item.is_donated) {
                console.log('Found old item:', item.id, item.title, 'date:', effectiveDate.toISOString());
              }
              
              return !item.is_donated && effectiveDate < oneYearAgo;
            });
            
            setOldItems(oldItemsList);
          }
          
          // Set logs array
          setLogs(Array.isArray(logsData) ? logsData : []);
        } catch (otherDataError) {
          console.error('Error fetching other dashboard data:', otherDataError);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [currentUser, navigate, refreshTrigger]);

  // Calculate statistics from data
  const calculateStats = (usersData, itemsData) => {
    try {
      // Ensure we have arrays to work with
      const usersArray = Array.isArray(usersData) ? usersData : [];
      const itemsArray = Array.isArray(itemsData) ? itemsData : [];
      
      // Calculate user statistics
      const totalUsers = usersArray.length;
      const bannedUsers = usersArray.filter(user => user.is_deleted).length;
      
      // Calculate item statistics
      const lostItems = itemsArray.filter(item => item.status === 'lost').length;
      const foundItems = itemsArray.filter(item => item.status === 'found').length;
      const requestedItems = itemsArray.filter(item => item.status === 'requested').length;
      const returnedItems = itemsArray.filter(item => item.status === 'returned').length;
      
      // Update stats state
      setStats({
        totalUsers,
        totalBannedUsers: bannedUsers,
        totalLostItems: lostItems,
        totalFoundItems: foundItems,
        totalPendingItems: requestedItems,
        totalReturnedItems: returnedItems
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  // Handle donating an item
  const handleDonateItem = (item) => {
    setItemToDonate(item);
    setShowDonateModal(true);
  };

  // Confirm donating an item
  const confirmDonateItem = async () => {
    if (!itemToDonate || !donationReason) {
      setActionStatus({ type: 'error', message: 'Please provide a reason for donation.' });
      return;
    }
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: `Marking item ${itemToDonate.name || itemToDonate.title || ''} for donation...`
      });
      
      console.log(`Marking item ${itemToDonate.id} for donation with reason: ${donationReason}...`);
      const response = await adminApi.donateItem(itemToDonate.id);
      console.log('Donation response:', response);
      
      // Update the items list
      setOldItems(prev => prev.filter(item => item.id !== itemToDonate.id));

      setActionStatus({
        type: 'success',
        message: `Item '${itemToDonate.name || itemToDonate.title || ''}' marked for donation successfully.`
      });
      
      setShowDonateModal(false);
      setItemToDonate(null);
      setDonationReason('Unclaimed for over a year');
      setDonationOrganization('');

      // Refresh data to update the UI
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        setActionStatus(null);
      }, 2000);
    } catch (err) {
      console.error('Error marking item for donation:', err);
      setActionStatus({
        type: 'error',
        message: `Failed to mark item for donation: ${err.message || 'Unknown error'}`
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle unbanning a user
  const handleUnbanUser = async (userId) => {
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Unbanning user...'
      });
      
      await adminApi.unbanUser(userId);
      
      // Update the users list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_deleted: false } 
            : user
        )
      );

      setActionStatus({
        type: 'success',
        message: 'User unbanned successfully'
      });
      
      // Refresh the data after a short delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        setActionStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error unbanning user:', err);
      setActionStatus({
        type: 'error',
        message: 'Failed to unban user. Please try again.'
      });
      
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle ban user modal open
  const handleBanUser = (userId, userName) => {
    setUserToBan({ id: userId, name: userName });
    setShowBanModal(true);
  };

  // Handle ban user confirmation
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
      
      await adminApi.banUser(userToBan.id, banReason);
      
      // Update the users list
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

      // Refresh the data after a short delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
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

  // Handle item restoration
  const handleRestoreItem = async (itemId) => {
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Restoring item...'
      });
      
      await adminApi.restoreItem(itemId);
      
      // Update the items list
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, is_deleted: false } 
            : item
        )
      );
      setOldItems(prevOldItems => prevOldItems.filter(item => item.id !== itemId));

      setActionStatus({
        type: 'success',
        message: 'Item restored successfully'
      });
      
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        setActionStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error restoring item:', err);
      setActionStatus({
        type: 'error',
        message: 'Failed to restore item. Please try again.'
      });
      
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle item deletion modal open
  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  // Handle role change modal open
  const handleChangeRole = (user) => {
    setUserToChangeRole(user);
    setSelectedRole(user.role); // Set current role as default
    setShowRoleModal(true);
  };

  // Handle role change confirmation
  const confirmRoleChange = async () => {
    if (!userToChangeRole || !selectedRole) {
      setActionStatus({ type: 'error', message: 'Please select a role.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: `Updating role for ${userToChangeRole.name || 'user'}...`
      });
      
      await adminApi.updateUserRole(userToChangeRole.id, selectedRole);

      // Update the users list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userToChangeRole.id 
            ? { ...user, role: selectedRole } 
            : user
        )
      );

      setActionStatus({
        type: 'success',
        message: `Role updated to ${selectedRole} for ${userToChangeRole.name || 'user'}.`
      });
      
      setShowRoleModal(false);
      setUserToChangeRole(null);
      setSelectedRole('');

      // Refresh the data after a short delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        setActionStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating user role:', err);
      setActionStatus({
        type: 'error',
        message: 'Failed to update user role. Please try again.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle item deletion confirmation
  const confirmDeleteItem = async () => {
    if (!itemToDelete || !deleteReason) {
      setActionStatus({ type: 'error', message: 'Please provide a reason for deletion.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: `Deleting item ${itemToDelete.name || ''}...`
      });
      
      await adminApi.deleteItem(itemToDelete.id, deleteReason);

      // Update the items list
      setItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
      setOldItems(prevOldItems => prevOldItems.filter(item => item.id !== itemToDelete.id));

      setActionStatus({
        type: 'success',
        message: `Item '${itemToDelete.name || ''} deleted permanently.`
      });
      
      setShowDeleteModal(false);
      setItemToDelete(null);
      setDeleteReason('');

      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        setActionStatus(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting item:', err);
      setActionStatus({
        type: 'error',
        message: 'Failed to delete item. Please try again.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Function to format date strings for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Render items in a grid layout
  const renderItemsGrid = (itemsToRender) => {
    return (
      <div className="items-grid">
        {itemsToRender.length > 0 ? (
          itemsToRender.map(item => (
            <div key={item.id} className={`item-card ${item.status}-item-card`}>
              <div className="item-image">
                <img src={item.image_url || '/images/placeholder.png'} alt={item.name} onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.png'; }} />
              </div>
              <div className="item-details">
                <span className={`status-badge ${item.status}`}>{item.status}</span>
                {item.is_approved !== undefined && (
                  <span className={`approval-badge ${item.is_approved ? 'approved' : 'pending'}`}>
                    {item.is_approved ? 'Approved' : 'Pending Approval'}
                  </span>
                )}
                <h3>{item.name}</h3>
                <p><strong>Category:</strong> {item.category}</p>
                <p><strong>Date:</strong> {formatDate(item.date_found || item.date_lost)}</p>
                <p className="description">{item.description}</p>
                <div className="item-actions">
                  {item.is_deleted ? (
                    <button className="claim-button" onClick={() => handleRestoreItem(item.id)} disabled={actionLoading}>
                      {actionLoading ? <Spinner animation="border" size="sm" /> : 'Restore Item'}
                    </button>
                  ) : (
                    <button className="claim-button" onClick={() => handleDeleteItem(item)} disabled={actionLoading}>
                      {actionLoading ? <Spinner animation="border" size="sm" /> : 'Delete Item'}
                    </button>
                  )}
                  <Button variant="info" onClick={() => navigate(`/items/${item.id}`)}>
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <i className="fas fa-box-open empty-state-icon"></i>
            <h3>No items to display</h3>
            <p>There are no items matching your criteria at the moment.</p>
          </div>
        )}
      </div>
    );
  };

  // Render items in a table layout
  const renderItemsTable = (itemsToRender) => {
    return (
      <div className="table-responsive">
        <Table striped bordered hover className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th>Reported By</th>
              <th>Approved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {itemsToRender.length > 0 ? (
              itemsToRender.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td><Badge bg={item.status === 'lost' ? 'danger' : 'success'}>{item.status}</Badge></td>
                  <td>{formatDate(item.date_found || item.date_lost)}</td>
                  <td>{item.reporter_name || 'N/A'}</td>
                  <td>
                    {item.is_approved !== undefined ? (
                      <Badge bg={item.is_approved ? 'success' : 'warning'}>
                        {item.is_approved ? 'Yes' : 'No'}
                      </Badge>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    <ButtonGroup aria-label="Item Actions">
                      <Button variant="info" size="sm" onClick={() => navigate(`/items/${item.id}`)}>
                        View
                      </Button>
                      {item.is_deleted ? (
                        <Button variant="success" size="sm" onClick={() => handleRestoreItem(item.id)} disabled={actionLoading}>
                          Restore
                        </Button>
                      ) : (
                        <Button variant="danger" size="sm" onClick={() => handleDeleteItem(item)} disabled={actionLoading}>
                          Delete
                        </Button>
                      )}
                    </ButtonGroup>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  <p>No items to display.</p>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    );
  };

  // Render Users tab content
  const renderUsersTab = () => {
    // Separate users into banned and active
    const bannedUsers = users.filter(user => user.is_deleted);
    const activeUsers = users.filter(user => !user.is_deleted);
    
    // Filter users based on search query
    const filteredUsers = users.filter(user => 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
      <div className="admin-users-section">
        <h2 className="page-title">User Management</h2>
        <p className="section-description">Manage all registered users, including their roles and ban status.</p>
        
        {actionStatus && (
          <Alert variant={actionStatus.type === 'success' ? 'success' : 'danger'} className="mb-3">
            {actionStatus.message}
          </Alert>
        )}
        
        {/* Display banned users count */}
        {bannedUsers.length > 0 && !searchQuery && (
          <Alert variant="warning" className="mb-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            There are currently <strong>{bannedUsers.length}</strong> banned users in the system.
          </Alert>
        )}
        
        <div className="filter-and-search-bar mb-3">
          <InputGroup>
            <Form.Control
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            {/* Display banned users section first if there are any and not searching */}
            {bannedUsers.length > 0 && !searchQuery && (
              <>
                <h3 className="mt-4 mb-3">Banned Users</h3>
                <Table striped bordered hover className="admin-table">
                  <thead>
                    <tr className="table-danger">
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
                    {bannedUsers.map(user => (
                      <tr key={user.id} className="table-warning">
                        <td>{user.id}</td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td><Badge bg={user.role === 'admin' ? 'danger' : (user.role === 'security' ? 'primary' : 'success')}>{user.role}</Badge></td>
                        <td><Badge bg="secondary">Banned</Badge></td>
                        <td>{user.ban_reason || 'N/A'}</td>
                        <td>
                          <Button 
                            variant="success" 
                            size="sm" 
                            onClick={() => handleUnbanUser(user.id)} 
                            disabled={actionLoading}
                          >
                            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Unban User'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
            
            {/* Display all users or search results */}
            <h3 className="mt-4 mb-3">{searchQuery ? 'Search Results' : (bannedUsers.length > 0 ? 'Active Users' : 'All Users')}</h3>
            <Table striped bordered hover className="admin-table">
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
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr key={user.id} className={user.is_deleted ? 'table-warning' : ''}>
                      <td>{user.id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td><Badge bg={user.role === 'admin' ? 'danger' : (user.role === 'security' ? 'primary' : 'success')}>{user.role}</Badge></td>
                      <td><Badge bg={user.is_deleted ? 'secondary' : 'success'}>{user.is_deleted ? 'Banned' : 'Active'}</Badge></td>
                      <td>{user.ban_reason || 'N/A'}</td>
                      <td>
                        <ButtonGroup aria-label="User Actions">
                          {user.is_deleted ? (
                            <Button variant="success" size="sm" onClick={() => handleUnbanUser(user.id)} disabled={actionLoading}>
                              {actionLoading ? <Spinner animation="border" size="sm" /> : 'Unban'}
                            </Button>
                          ) : (
                            <>
                              {user.role !== 'admin' && (
                                <Button variant="warning" size="sm" onClick={() => handleBanUser(user.id, user.name)} disabled={actionLoading}>
                                  {actionLoading ? <Spinner animation="border" size="sm" /> : 'Ban'}
                                </Button>
                              )}
                              <Button variant="info" size="sm" onClick={() => handleChangeRole(user)} disabled={actionLoading}>
                                {actionLoading ? <Spinner animation="border" size="sm" /> : 'Change Role'}
                              </Button>
                            </>
                          )}
                        </ButtonGroup>
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
            </Table>
          </div>
        )}
      </div>
    );
  };

  // Render Logs tab content
  const renderLogsTab = () => {
    return (
      <div className="admin-logs-section">
        <h2 className="page-title">System Logs</h2>
        <p className="section-description">View system activity and administrative actions.</p>
        {loading ? (
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading logs...</span>
          </Spinner>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Action</th>
                  <th>By User</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.action}</td>
                      <td>{log.by_user_name || 'System'}</td>
                      <td>{formatDate(log.timestamp)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">
                      <p>No logs to display.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  // Render Old Items tab content
  const renderOldItemsTab = () => {
    return (
      <div className="admin-old-items-section">
        <h2 className="page-title">Items Pending Donation</h2>
        <p className="section-description">These items are older than one year and can be donated to charity. Items marked as donated will no longer appear in the system for regular users.</p>
        {actionStatus && (
          <Alert variant={actionStatus.type === 'success' ? 'success' : 'danger'} className="mb-3">
            {actionStatus.message}
          </Alert>
        )}
        {loading ? (
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading old items...</span>
          </Spinner>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date Created</th>
                  <th>Age (Days)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {oldItems.length > 0 ? (
                  oldItems.map(item => {
                    // Calculate item age in days
                    const createdDate = new Date(item.created_at);
                    const today = new Date();
                    const ageInDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.name || item.title}</td>
                        <td>{item.category}</td>
                        <td><Badge bg={item.status === 'lost' ? 'danger' : item.status === 'found' ? 'success' : 'info'}>{item.status}</Badge></td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>{ageInDays}</td>
                        <td>
                          <ButtonGroup aria-label="Item Actions" size="sm">
                            <Button variant="info" size="sm" onClick={() => navigate(`/items/${item.id}`)}>
                              View
                            </Button>
                            <Button variant="warning" size="sm" onClick={() => handleDonateItem(item)}>
                              Donate
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteItem(item)}>
                              Delete
                            </Button>
                          </ButtonGroup>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center">
                      <p>No items pending donation.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  // Render Dashboard Statistics
  const renderDashboardStats = () => {
    return (
      <div className="dashboard-stats-section">
        <h2 className="page-title">Overview</h2>
        <p className="section-description">Quick statistics about users and items on the platform.</p>
        
        {loading ? (
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading stats...</span>
          </Spinner>
        ) : (
          <div className="dashboard-cards-container">
            <div className="dashboard-card total-users">
              <div className="card-icon"><i className="fas fa-users"></i></div>
              <div className="card-title">Total Users</div>
              <div className="card-value">{stats.totalUsers}</div>
            </div>
            <div className="dashboard-card total-lost-items">
              <div className="card-icon"><i className="fas fa-exclamation-circle"></i></div>
              <div className="card-title">Total Lost Items</div>
              <div className="card-value">{stats.totalLostItems}</div>
            </div>
            <div className="dashboard-card total-found-items">
              <div className="card-icon"><i className="fas fa-hand-holding"></i></div>
              <div className="card-title">Total Found Items</div>
              <div className="card-value">{stats.totalFoundItems}</div>
            </div>
            <div className="dashboard-card total-pending-items">
              <div className="card-icon"><i className="fas fa-hourglass-half"></i></div>
              <div className="card-title">Pending Items</div>
              <div className="card-value">{stats.totalPendingItems}</div>
            </div>
            <div className="dashboard-card total-returned-items">
              <div className="card-icon"><i className="fas fa-check-circle"></i></div>
              <div className="card-title">Returned Items</div>
              <div className="card-value">{stats.totalReturnedItems}</div>
            </div>
            <div className="dashboard-card total-banned-users">
              <div className="card-icon"><i className="fas fa-user-slash"></i></div>
              <div className="card-title">Banned Users</div>
              <div className="card-value">{stats.totalBannedUsers}</div>
            </div>
          </div>
        )}

        {/* Chart information text instead of actual charts */}
        <div className="dashboard-charts-container">
          <div className="chart-card">
            <h3 className="chart-title">Users by Role</h3>
            <div className="chart-placeholder">
              <p>User role distribution information would be displayed here.</p>
              <div className="role-stats">
                <div className="role-stat">
                  <span className="role-label">Admins:</span>
                  <span className="role-value">{users.filter(user => user.role === 'admin').length}</span>
                </div>
                <div className="role-stat">
                  <span className="role-label">Users:</span>
                  <span className="role-value">{users.filter(user => user.role === 'user').length}</span>
                </div>
                <div className="role-stat">
                  <span className="role-label">Security:</span>
                  <span className="role-value">{users.filter(user => user.role === 'security').length}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="chart-card">
            <h3 className="chart-title">Item Status Distribution</h3>
            <div className="chart-placeholder">
              <p>Item status distribution information would be displayed here.</p>
              <div className="status-stats">
                <div className="status-stat">
                  <span className="status-label">Lost:</span>
                  <span className="status-value">{items.filter(item => item.status === 'lost').length}</span>
                </div>
                <div className="status-stat">
                  <span className="status-label">Found:</span>
                  <span className="status-value">{items.filter(item => item.status === 'found').length}</span>
                </div>
                <div className="status-stat">
                  <span className="status-label">Requested:</span>
                  <span className="status-value">{items.filter(item => item.status === 'requested').length}</span>
                </div>
                <div className="status-stat">
                  <span className="status-label">Returned:</span>
                  <span className="status-value">{items.filter(item => item.status === 'returned').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard-container">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-description">Welcome, {currentUser?.name || 'Admin'}! Here you can manage users, items, and system settings.</p>
      </div>

      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

      {/* Tabs for navigation */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button 
            className={`tab ${activeTab === 'items' ? 'active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Recent Items
          </button>
          <button 
            className={`tab ${activeTab === 'donationItems' ? 'active' : ''}`}
            onClick={() => setActiveTab('donationItems')}
          >
            Donation Items
            {oldItems.length > 0 && (
              <Badge bg="warning" className="ms-2">{oldItems.length}</Badge>
            )}
          </button>
          <button 
            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Logs
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && renderDashboardStats()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'items' && renderItemsTable(items.filter(item => !item.is_donated))}
        {activeTab === 'donationItems' && renderOldItemsTab()}
        {activeTab === 'logs' && renderLogsTab()}
      </div>

      {/* Ban User Modal */}
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

      {/* Role Change Modal */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change User Role</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Change role for user <strong>{userToChangeRole?.name || userToChangeRole?.email || userToChangeRole?.id}</strong></p>
          <Form.Group className="mb-3">
            <Form.Label>Select Role:</Form.Label>
            <Form.Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              required
            >
              <option value="">Select a role</option>
              <option value="user">User</option>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </Form.Select>
            <Form.Text className="text-muted">
              <ul>
                <li><strong>User:</strong> Regular user with basic permissions</li>
                <li><strong>Security:</strong> Can approve/reject items and manage claims</li>
                <li><strong>Admin:</strong> Full system access and user management</li>
              </ul>
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmRoleChange} disabled={actionLoading}>
            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Update Role'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Item Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Item Permanently</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to permanently delete item <strong>{itemToDelete?.name || itemToDelete?.id}</strong>?</p>
          <p className="text-danger">This action cannot be undone.</p>
          <Form.Group className="mb-3">
            <Form.Label>Reason for permanent deletion:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g., Item unclaimed for over a year, data cleanup"
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteItem} disabled={actionLoading}>
            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Confirm Delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Donate Item Modal */}
      <Modal show={showDonateModal} onHide={() => setShowDonateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Donate Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>You are about to mark item <strong>{itemToDonate?.name || itemToDonate?.title || itemToDonate?.id}</strong> for donation.</p>
          <Form.Group className="mb-3">
            <Form.Label>Reason for donation:</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={donationReason}
              onChange={(e) => setDonationReason(e.target.value)}
              placeholder="e.g., Unclaimed for over a year"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Donation Organization (optional):</Form.Label>
            <Form.Control
              type="text"
              value={donationOrganization}
              onChange={(e) => setDonationOrganization(e.target.value)}
              placeholder="e.g., Local Charity, Goodwill"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDonateModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={confirmDonateItem} disabled={actionLoading}>
            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Confirm Donation'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminDashboard; 