import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner, Form, Modal, Button, Badge, ButtonGroup, InputGroup, Table, Tabs, Dropdown, Toast, ToastContainer, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { adminApi } from '../utils/api';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import '../styles/AdminDashboard.css';
import jsPDF from 'jspdf';
// Import jspdf-autotable correctly
import autoTable from 'jspdf-autotable';

const AdminDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to dashboard view
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'
  const [oldItems, setOldItems] = useState([]);
  const [donatedItems, setDonatedItems] = useState([]);
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

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success', 'error', 'warning'
  
  // PDF generation loading state
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
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
          
          // Enhance items with user information before setting state
          const enhancedItems = enhanceItemsWithUserInfo(allItems, usersData);
          console.log('Enhanced items with user info:', enhancedItems.slice(0, 3));
          
          setItems(enhancedItems);
          
          // Get old items using the dedicated API endpoint
          try {
            console.log('Fetching old items for donation...');
            const oldItemsData = await adminApi.getOldItems();
            console.log('Old items data received:', oldItemsData?.length || 0, 'items');
            
            // Check if any donated items are in the list
            const donatedInOldItems = oldItemsData.filter(item => item.is_donated === true || item.is_donated === 1);
            if (donatedInOldItems.length > 0) {
              console.warn('WARNING: Found donated items in old items list:', donatedInOldItems);
            }
            
            // Filter out any donated items that might have slipped through
            const filteredOldItems = oldItemsData.filter(item => !(item.is_donated === true || item.is_donated === 1));
            if (filteredOldItems.length !== oldItemsData.length) {
              console.log(`Filtered out ${oldItemsData.length - filteredOldItems.length} donated items from old items list`);
            }
            
            // Enhance old items with user information
            const enhancedOldItems = enhanceItemsWithUserInfo(filteredOldItems, usersData);
            setOldItems(Array.isArray(enhancedOldItems) ? enhancedOldItems : []);
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
              const effectiveDate = itemCreatedDate && itemDate 
                ? (itemCreatedDate < itemDate ? itemCreatedDate : itemDate)
                : (itemCreatedDate || itemDate);
              
              // Skip if no date available or item is already donated
              if (!effectiveDate) {
                return false;
              }
              
              // Explicitly check for is_donated being false or 0
              const isDonated = item.is_donated === true || item.is_donated === 1;
              if (isDonated) {
                console.log(`Filtering out donated item: ${item.id} (${item.name || item.title})`);
                return false;
              }
              
              return effectiveDate < oneYearAgo;
            });
            
            setOldItems(oldItemsList);
          }
          
          // Get donated items
          try {
            console.log('Fetching donated items...');
            const donatedItemsData = await adminApi.getDonatedItems();
            console.log('Donated items data received:', donatedItemsData?.length || 0, 'items');
            
            // Enhance donated items with user information
            const enhancedDonatedItems = enhanceItemsWithUserInfo(donatedItemsData, usersData);
            setDonatedItems(Array.isArray(enhancedDonatedItems) ? enhancedDonatedItems : []);
          } catch (donatedItemsError) {
            console.error('Error fetching donated items:', donatedItemsError);
            
            // Fallback to filtering items client-side if the API call fails
            console.log('Falling back to client-side filtering for donated items');
            
            // Filter donated items
            const donatedItemsList = enhancedItems.filter(item => item.is_donated === true || item.is_donated === 1);
            setDonatedItems(donatedItemsList);
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
    
    // Set up refresh interval for real-time updates
    const refreshInterval = setInterval(() => {
      if (currentUser && currentUser.role === 'admin') {
        fetchAllData();
      }
    }, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [currentUser]);

  // Function to enhance items with user information
  const enhanceItemsWithUserInfo = (itemsData, usersData) => {
    if (!Array.isArray(itemsData) || !Array.isArray(usersData)) {
      return itemsData;
    }
    
    // Create a map of users by ID for quick lookup
    const userMap = {};
    usersData.forEach(user => {
      if (user && user.id) {
        userMap[user.id] = user;
      }
    });
    
    // Enhance each item with user information
    return itemsData.map(item => {
      if (!item) return item;
      
      const enhancedItem = { ...item };
      
      // If the item has a user_id, try to find the corresponding user
      if (item.user_id && userMap[item.user_id]) {
        const user = userMap[item.user_id];
        
        // Add user information if not already present
        if (!enhancedItem.user_name) {
          enhancedItem.user_name = user.name;
        }
        
        if (!enhancedItem.user_email) {
          enhancedItem.user_email = user.email;
        }
        
        if (!enhancedItem.reported_by && user.name) {
          enhancedItem.reported_by = user.name;
        }
        
        if (!enhancedItem.contact_info && user.email) {
          enhancedItem.contact_info = user.email;
        }
        
        // Add the full user object for reference
        enhancedItem.user = user;
      }
      
      return enhancedItem;
    });
  };

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
    if (!itemToDonate) {
      setActionStatus({ type: 'error', message: 'No item selected for donation.' });
      return;
    }
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: `Marking item ${itemToDonate.name || itemToDonate.title || ''} for donation...`
      });
      
      console.log(`Marking item ${itemToDonate.id} for donation...`);
      const response = await adminApi.donateItem(itemToDonate.id);
      console.log('Donation response:', response);
      
      // Update the local state
      const donatedItem = {...itemToDonate, is_donated: true};
      
      // Remove from old items and add to donated items
      setOldItems(prev => prev.filter(item => item.id !== itemToDonate.id));
      setDonatedItems(prev => [donatedItem, ...prev]);
      
      // Show success message
      setActionStatus({
        type: 'success',
        message: `Item '${itemToDonate.name || itemToDonate.title || ''}' marked for donation successfully.`
      });
      
      setShowDonateModal(false);
      setItemToDonate(null);
      setDonationReason('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error marking item for donation:', error);
      setActionStatus({
        type: 'error',
        message: `Failed to mark item for donation: ${error.message || 'Unknown error'}`
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

  // Render Users Tab
  const renderUsersTab = () => {
    return (
      <div className="admin-users-section">
        <h2 className="page-title">User Management</h2>
        <p className="section-description">View and manage all users in the system.</p>
        
        <div className="section-actions mb-3 d-flex justify-content-between">
          <Form.Group className="search-box">
            <InputGroup>
              <InputGroup.Text><i className="fas fa-search"></i></InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </Form.Group>
          
          <Button 
            variant="primary"
            onClick={() => generatePDFReport('Users')}
            className="ms-2"
          >
            <i className="fas fa-file-pdf"></i> Download Users Report
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading users...</span>
            </Spinner>
          </div>
        ) : (
          <div className="users-table-container">
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(user => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      (user.name && user.name.toLowerCase().includes(query)) ||
                      (user.email && user.email.toLowerCase().includes(query)) ||
                      (user.role && user.role.toLowerCase().includes(query))
                    );
                  })
                  .map(user => (
                    <tr key={user.id} className={user.is_deleted ? 'table-danger' : ''}>
                      <td>{user.id}</td>
                      <td>{user.name || 'N/A'}</td>
                      <td>{user.email}</td>
                      <td>
                        <Badge bg={
                          user.role === 'admin' ? 'danger' :
                          user.role === 'security' ? 'warning' : 'primary'
                        }>
                          {user.role}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={user.is_deleted ? 'danger' : 'success'}>
                          {user.is_deleted ? 'Banned' : 'Active'}
                        </Badge>
                      </td>
                      <td>{formatDate(user.created_at || user.date)}</td>
                      <td>
                        <ButtonGroup size="sm">
                          {user.is_deleted ? (
                            <Button 
                              variant="outline-success" 
                              onClick={() => handleUnbanUser(user.id)}
                              disabled={actionLoading}
                            >
                              <i className="fas fa-user-check"></i> Unban
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="outline-danger" 
                                onClick={() => handleBanUser(user.id, user.name || user.email)}
                                disabled={actionLoading || user.role === 'admin'}
                              >
                                <i className="fas fa-user-slash"></i> Ban
                              </Button>
                              <Button 
                                variant="outline-primary" 
                                onClick={() => handleChangeRole(user)}
                                disabled={actionLoading}
                              >
                                <i className="fas fa-user-tag"></i> Change Role
                              </Button>
                            </>
                          )}
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  // Render Logs Tab
  const renderLogsTab = () => {
    return (
      <div className="admin-logs-section">
        <h2 className="page-title">System Logs</h2>
        <p className="section-description">View system activity logs.</p>
        
        <div className="section-actions mb-3 d-flex justify-content-between">
          <Form.Group className="search-box">
            <InputGroup>
              <InputGroup.Text><i className="fas fa-search"></i></InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </Form.Group>
          
          <Button 
            variant="primary"
            onClick={() => generatePDFReport('System Logs')}
            className="ms-2"
          >
            <i className="fas fa-file-pdf"></i> Download Logs Report
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading logs...</span>
            </Spinner>
          </div>
        ) : (
          <div className="logs-table-container">
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs
                  .filter(log => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return (
                      (log.action && log.action.toLowerCase().includes(query)) ||
                      (log.user_name && log.user_name.toLowerCase().includes(query)) ||
                      (log.user_email && log.user_email.toLowerCase().includes(query)) ||
                      (log.details && log.details.toLowerCase().includes(query))
                    );
                  })
                  .map(log => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.action || 'N/A'}</td>
                      <td>{log.user_name || log.user_email || 'N/A'}</td>
                      <td>{log.details || 'N/A'}</td>
                      <td>{formatDate(log.created_at || log.date)}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  // Render Old Items Tab
  const renderOldItemsTab = () => {
    return (
      <div className="admin-old-items-section">
        <h2 className="page-title">Old Items</h2>
        <p className="section-description">Items that have been in the system for a long time and might be eligible for donation.</p>
        
        <div className="section-actions mb-3 d-flex justify-content-end">
          <Button 
            variant="primary"
            onClick={() => generatePDFReport('Old Items')}
          >
            <i className="fas fa-file-pdf"></i> Download Old Items Report
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading old items...</span>
            </Spinner>
          </div>
        ) : (
          <div className="old-items-container">
            {oldItems.length === 0 ? (
              <Alert variant="info">
                No items eligible for donation at this time.
              </Alert>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Date Added</th>
                    <th>Days in System</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {oldItems.map(item => {
                    const itemDate = new Date(item.created_at || item.date);
                    const daysInSystem = Math.floor((new Date() - itemDate) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.name || item.title || 'N/A'}</td>
                        <td>{item.category || 'N/A'}</td>
                        <td>
                          <Badge bg={
                            item.status === 'lost' ? 'danger' :
                            item.status === 'found' ? 'success' :
                            item.status === 'returned' ? 'info' : 'warning'
                          }>
                            {item.status || 'N/A'}
                          </Badge>
                        </td>
                        <td>{item.location || 'N/A'}</td>
                        <td>{formatDate(item.created_at || item.date)}</td>
                        <td>{daysInSystem}</td>
                        <td>
                          <ButtonGroup size="sm">
                            <Button 
                              variant="outline-primary" 
                              onClick={() => handleDonateItem(item)}
                              disabled={actionLoading}
                            >
                              <i className="fas fa-hand-holding-heart"></i> Donate
                            </Button>
                          </ButtonGroup>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render Donated Items Tab
  const renderDonatedItemsTab = () => {
    return (
      <div className="admin-donated-items-section">
        <h2 className="page-title">Donated Items</h2>
        <p className="section-description">Items that have been donated to charity organizations.</p>
        
        <div className="section-actions mb-3 d-flex justify-content-end">
          <Button 
            variant="primary"
            onClick={() => generatePDFReport('Donated Items')}
          >
            <i className="fas fa-file-pdf"></i> Download Donations Report
          </Button>
        </div>
        
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading donated items...</span>
            </Spinner>
          </div>
        ) : (
          <div className="donated-items-container">
            {donatedItems.length === 0 ? (
              <Alert variant="info">
                No donated items to display.
              </Alert>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Organization</th>
                    <th>Date Donated</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donatedItems.map(item => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.name || item.title || 'N/A'}</td>
                      <td>{item.category || 'N/A'}</td>
                      <td>{item.donation_organization || 'N/A'}</td>
                      <td>{formatDate(item.donation_date || item.updated_at || item.created_at || item.date)}</td>
                      <td>{item.donation_reason || 'Unclaimed for extended period'}</td>
                      <td>
                        <ButtonGroup size="sm">
                          <Button 
                            variant="outline-secondary" 
                            onClick={() => handleRestoreItem(item.id)}
                            disabled={actionLoading}
                          >
                            <i className="fas fa-undo"></i> Restore
                          </Button>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </div>
    );
  };

  // Generate PDF report
  const generatePDFReport = (reportType) => {
    // Validate admin permissions
    if (!currentUser || currentUser.role !== 'admin') {
      setToastMessage('Error: You do not have permission to generate reports');
      setToastType('danger');
      setShowToast(true);
      return;
    }
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Add header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Lost and Found Platform', pageWidth/2, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(`${reportType} Report`, pageWidth/2, 30, { align: 'center' });
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth/2, 40, { align: 'center' });
      
      // Add user info - sanitize user data
      doc.setFontSize(10);
      doc.text(`Generated by: ${sanitizeForPDF(currentUser?.name) || 'Admin'} (${sanitizeForPDF(currentUser?.email) || 'admin'})`, pageWidth/2, 45, { align: 'center' });
      
      // Add content based on report type
      switch(reportType) {
        case 'Users':
          generateUserReport(doc);
          break;
        case 'Items':
          generateItemReport(doc);
          break;
        case 'Lost Items':
          generateLostItemReport(doc);
          break;
        case 'Found Items':
          generateFoundItemReport(doc);
          break;
        case 'Returned Items':
          generateReturnedItemReport(doc);
          break;
        case 'System Logs':
          generateLogsReport(doc);
          break;
        case 'Statistics':
          generateStatsReport(doc);
          break;
        case 'Old Items':
          generateOldItemsReport(doc);
          break;
        case 'Donated Items':
          generateDonatedItemsReport(doc);
          break;
        default:
          generateSummaryReport(doc);
      }
      
      // Save the PDF with formatted date in filename
      const formattedDate = new Date().toISOString().split('T')[0];
      doc.save(`lost-and-found-${reportType.toLowerCase().replace(' ', '-')}-report-${formattedDate}.pdf`);
      
      // Show success toast
      setToastMessage(`${reportType} report has been downloaded successfully!`);
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error(`Error generating ${reportType} report:`, error);
      setToastMessage(`Error generating report: ${error.message}`);
      setToastType('danger');
      setShowToast(true);
    }
  };
  
  // Generate user report
  const generateUserReport = (doc) => {
    doc.setFontSize(14);
    doc.text('User Management Report', 14, 60);
    
    const tableColumn = ['ID', 'Name', 'Email', 'Role', 'Status', 'Created Date'];
    const tableRows = users.map(user => [
      user.id,
      sanitizeForPDF(user.name),
      sanitizeForPDF(user.email),
      sanitizeForPDF(user.role),
      user.is_deleted ? 'Banned' : 'Active',
      formatDate(user.created_at || user.date)
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate item report
  const generateItemReport = (doc) => {
    doc.setFontSize(14);
    doc.text('Item Management Report', 14, 60);
    
    const tableColumn = ['ID', 'Name', 'Category', 'Status', 'Location', 'Date'];
    const tableRows = items.map(item => [
      item.id,
      sanitizeForPDF(item.name || item.title),
      sanitizeForPDF(item.category),
      sanitizeForPDF(item.status),
      sanitizeForPDF(item.location),
      formatDate(item.created_at || item.date)
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate lost item report
  const generateLostItemReport = (doc) => {
    const lostItems = items.filter(item => item.status === 'lost');
    
    doc.setFontSize(14);
    doc.text('Lost Items Report', 14, 60);
    
    const tableColumn = ['ID', 'Name', 'Category', 'Location', 'Date', 'Reported By'];
    const tableRows = lostItems.map(item => [
      item.id,
      sanitizeForPDF(item.name || item.title),
      sanitizeForPDF(item.category),
      sanitizeForPDF(item.location),
      formatDate(item.created_at || item.date),
      sanitizeForPDF(item.user_name || item.reported_by)
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate found item report
  const generateFoundItemReport = (doc) => {
    const foundItems = items.filter(item => item.status === 'found');
    
    doc.setFontSize(14);
    doc.text('Found Items Report', 14, 60);
    
    const tableColumn = ['ID', 'Name', 'Category', 'Location', 'Date', 'Reported By'];
    const tableRows = foundItems.map(item => [
      item.id,
      sanitizeForPDF(item.name || item.title),
      sanitizeForPDF(item.category),
      sanitizeForPDF(item.location),
      formatDate(item.created_at || item.date),
      sanitizeForPDF(item.user_name || item.reported_by)
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate returned item report
  const generateReturnedItemReport = (doc) => {
    const returnedItems = items.filter(item => item.status === 'returned');
    
    doc.setFontSize(14);
    doc.text('Returned Items Report', 14, 60);
    
    const tableColumn = ['ID', 'Name', 'Category', 'Date Returned', 'Recipient', 'Original Status'];
    const tableRows = returnedItems.map(item => [
      item.id,
      sanitizeForPDF(item.name || item.title),
      sanitizeForPDF(item.category),
      formatDate(item.returned_date || item.updated_at || item.created_at || item.date),
      sanitizeForPDF(item.claimed_by || item.recipient_name),
      sanitizeForPDF(item.original_status)
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate logs report
  const generateLogsReport = (doc) => {
    doc.setFontSize(14);
    doc.text('System Logs Report', 14, 60);
    
    const tableColumn = ['ID', 'Action', 'User', 'Details', 'Date'];
    const tableRows = logs.map(log => [
      log.id,
      sanitizeForPDF(log.action),
      sanitizeForPDF(log.user_name || log.user_email),
      sanitizeForPDF(log.details),
      formatDate(log.created_at || log.date)
    ]);
    
    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate statistics report
  const generateStatsReport = (doc) => {
    doc.setFontSize(14);
    doc.text('System Statistics Report', 14, 60);
    
    // Stats table
    const tableColumn = ['Metric', 'Value'];
    const tableRows = [
      ['Total Users', stats.totalUsers],
      ['Total Lost Items', stats.totalLostItems],
      ['Total Found Items', stats.totalFoundItems],
      ['Total Pending Items', stats.totalPendingItems],
      ['Total Returned Items', stats.totalReturnedItems],
      ['Total Banned Users', stats.totalBannedUsers],
    ];
    
    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
    
    let finalY = doc.previousAutoTable.finalY;
    
    // Role distribution
    doc.setFontSize(14);
    doc.text('User Role Distribution', 14, finalY + 20);
    
    const roleTableRows = [
      ['Admins', users.filter(user => user.role === 'admin').length],
      ['Users', users.filter(user => user.role === 'user').length],
      ['Security', users.filter(user => user.role === 'security').length],
    ];
    
    autoTable(doc, {
      startY: finalY + 25,
      head: [['Role', 'Count']],
      body: roleTableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
    
    finalY = doc.previousAutoTable.finalY;
    
    // Item status distribution
    doc.setFontSize(14);
    doc.text('Item Status Distribution', 14, finalY + 20);
    
    const statusTableRows = [
      ['Lost', items.filter(item => item.status === 'lost').length],
      ['Found', items.filter(item => item.status === 'found').length],
      ['Requested', items.filter(item => item.status === 'requested').length],
      ['Returned', items.filter(item => item.status === 'returned').length],
    ];
    
    autoTable(doc, {
      startY: finalY + 25,
      head: [['Status', 'Count']],
      body: statusTableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate old items report
  const generateOldItemsReport = (doc) => {
    doc.setFontSize(14);
    doc.text('Old Items Report', 14, 60);
    doc.setFontSize(10);
    doc.text('Items that have been in the system for a long time and might be eligible for donation.', 14, 68);
    
    const tableColumn = ['ID', 'Name', 'Category', 'Status', 'Location', 'Date Added', 'Days in System'];
    const tableRows = oldItems.map(item => {
      const itemDate = new Date(item.created_at || item.date);
      const daysInSystem = Math.floor((new Date() - itemDate) / (1000 * 60 * 60 * 24));
      
      return [
        item.id,
        sanitizeForPDF(item.name || item.title),
        sanitizeForPDF(item.category),
        sanitizeForPDF(item.status),
        sanitizeForPDF(item.location),
        formatDate(item.created_at || item.date),
        daysInSystem
      ];
    });
    
    autoTable(doc, {
      startY: 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate donated items report
  const generateDonatedItemsReport = (doc) => {
    doc.setFontSize(14);
    doc.text('Donated Items Report', 14, 60);
    doc.setFontSize(10);
    doc.text('Items that have been donated to charity organizations.', 14, 68);
    
    const tableColumn = ['ID', 'Name', 'Category', 'Organization', 'Date Donated', 'Reason'];
    const tableRows = donatedItems.map(item => [
      item.id,
      sanitizeForPDF(item.name || item.title),
      sanitizeForPDF(item.category),
      sanitizeForPDF(item.donation_organization),
      formatDate(item.donation_date || item.updated_at || item.created_at || item.date),
      sanitizeForPDF(item.donation_reason || 'Unclaimed for extended period')
    ]);
    
    autoTable(doc, {
      startY: 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
  };
  
  // Generate summary report
  const generateSummaryReport = (doc) => {
    doc.setFontSize(14);
    doc.text('System Summary Report', 14, 60);
    
    // Stats table
    const tableColumn = ['Metric', 'Value'];
    const tableRows = [
      ['Total Users', stats.totalUsers],
      ['Total Lost Items', stats.totalLostItems],
      ['Total Found Items', stats.totalFoundItems],
      ['Total Pending Items', stats.totalPendingItems],
      ['Total Returned Items', stats.totalReturnedItems],
      ['Total Banned Users', stats.totalBannedUsers],
    ];
    
    autoTable(doc, {
      startY: 65,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });
    
    let finalY = doc.previousAutoTable.finalY;
    
    // Add current date and time
    const now = new Date();
    doc.setFontSize(10);
    doc.text(`Report generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, finalY + 15);
    
    // Add system info
    doc.text(`System version: 1.0.0`, 14, finalY + 20);
    doc.text(`Generated by: ${sanitizeForPDF(currentUser?.name)} (${sanitizeForPDF(currentUser?.role || 'admin')})`, 14, finalY + 25);
  };

  // Helper function to sanitize text for PDF
  const sanitizeForPDF = (text) => {
    if (!text) return text; // Return the original value (null/undefined) instead of empty string
    
    // Convert to string if not already
    const str = String(text);
    
    // Remove potentially dangerous characters or patterns
    return str
      .replace(/[^\w\s.,;:!?()\[\]{}\-–—'"]/g, '') // Remove special characters except common punctuation
      .trim()
      .substring(0, 500); // Limit length to prevent excessive data
  };
  
  // Generate comprehensive PDF report
  const generateComprehensiveReport = async () => {
    // Validate admin permissions
    if (!currentUser || currentUser.role !== 'admin') {
      setToastMessage('Error: You do not have permission to generate reports');
      setToastType('danger');
      setShowToast(true);
      return;
    }
    
    try {
      setGeneratingPDF(true);
      
      // Debug: Log items data to check user_name and contact_info fields
      console.log('Items data for PDF report:', items);
      const foundItems = items.filter(item => item.status === 'found');
      const lostItems = items.filter(item => item.status === 'lost');
      
      console.log('Found items sample:', foundItems.slice(0, 3));
      console.log('Lost items sample:', lostItems.slice(0, 3));
      
      // Check for user_name and reported_by fields
      const foundItemsWithUser = foundItems.filter(item => item.user_name || item.reported_by || item.user_id);
      console.log('Found items with user info:', foundItemsWithUser.length, 'out of', foundItems.length);
      if (foundItemsWithUser.length > 0) {
        console.log('Found item user info sample:', foundItemsWithUser[0]);
      }
      
      const lostItemsWithContact = lostItems.filter(item => item.contact_info || item.user_email);
      console.log('Lost items with contact info:', lostItemsWithContact.length, 'out of', lostItems.length);
      if (lostItemsWithContact.length > 0) {
        console.log('Lost item contact info sample:', lostItemsWithContact[0]);
      }
      
      // Set a timeout to handle large datasets
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Report generation timed out. The dataset might be too large.')), 30000);
      });
      
      // Create the actual report generation promise
      const reportPromise = new Promise(async (resolve) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const currentDate = new Date();
        
        // Add header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('Lost and Found Platform', pageWidth/2, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text('Comprehensive Admin Report', pageWidth/2, 30, { align: 'center' });
        
        // Add date
        doc.setFontSize(12);
        doc.text(`Generated on: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`, pageWidth/2, 40, { align: 'center' });
        
        // Add user info - sanitize user data
        doc.setFontSize(10);
        doc.text(`Generated by: ${sanitizeForPDF(currentUser?.name) || 'Admin'} (${sanitizeForPDF(currentUser?.email) || 'admin'})`, pageWidth/2, 45, { align: 'center' });
        
        // Add summary statistics
        doc.setFontSize(14);
        doc.text('Summary Statistics', 14, 60);
        
        const summaryTableData = [
          ['Total Users', stats.totalUsers],
          ['Total Lost Items', stats.totalLostItems],
          ['Total Found Items', stats.totalFoundItems],
          ['Total Pending Items', stats.totalPendingItems],
          ['Total Returned Items', stats.totalReturnedItems],
          ['Total Banned Users', stats.totalBannedUsers],
        ];
        
        // Use autoTable as a function with the doc instance
        autoTable(doc, {
          startY: 65,
          head: [['Metric', 'Count']],
          body: summaryTableData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255 }
        });
        
        // Add Found Items section with pagination if needed
        const foundItems = items.filter(item => item.status === 'found');
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Found Items', 14, 20);
        
        if (foundItems.length > 0) {
          // Handle large datasets with pagination
          const itemsPerPage = 25;
          const totalPages = Math.ceil(foundItems.length / itemsPerPage);
          
          doc.setFontSize(10);
          doc.text(`Total: ${foundItems.length} items`, 14, 30);
          
          for (let page = 0; page < totalPages; page++) {
            const startIdx = page * itemsPerPage;
            const endIdx = Math.min((page + 1) * itemsPerPage, foundItems.length);
            const pageItems = foundItems.slice(startIdx, endIdx);
            
            if (page > 0) {
              doc.addPage();
              doc.setFontSize(16);
              doc.text(`Found Items (Page ${page + 1}/${totalPages})`, 14, 20);
            } else {
              doc.text(`Page 1/${totalPages}`, pageWidth - 20, 20, { align: 'right' });
            }
            
            autoTable(doc, {
              startY: 35,
              head: [['ID', 'Name', 'Category', 'Location', 'Date Found', 'Reported By']],
              body: pageItems.map(item => {
                // Debug: Log each item's user info
                console.log(`Processing found item ${item.id}:`, {
                  user_name: item.user_name,
                  reported_by: item.reported_by,
                  user_email: item.user_email,
                  user_id: item.user_id,
                  username: item.username
                });
                
                // Try multiple fields for reporter name
                const reporterName = item.user_name || 
                                    item.reported_by || 
                                    item.username || 
                                    (item.user ? item.user.name : null) || 
                                    '';
                
                return [
                  item.id,
                  sanitizeForPDF(item.name || item.title),
                  sanitizeForPDF(item.category),
                  sanitizeForPDF(item.location),
                  formatDate(item.created_at || item.date),
                  sanitizeForPDF(reporterName)
                ];
              }),
              theme: 'grid',
              headStyles: { fillColor: [41, 128, 185], textColor: 255 }
            });
          }
        } else {
          doc.text('No found items to display', 14, 30);
        }
        
        // Continue with other sections using the same pagination approach
        // ... (rest of the report generation code)
        
        // Add Lost Items section
        const lostItems = items.filter(item => item.status === 'lost');
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Lost Items', 14, 20);
        
        if (lostItems.length > 0) {
          // Handle large datasets with pagination
          const itemsPerPage = 25;
          const totalPages = Math.ceil(lostItems.length / itemsPerPage);
          
          doc.setFontSize(10);
          doc.text(`Total: ${lostItems.length} items`, 14, 30);
          
          for (let page = 0; page < totalPages; page++) {
            const startIdx = page * itemsPerPage;
            const endIdx = Math.min((page + 1) * itemsPerPage, lostItems.length);
            const pageItems = lostItems.slice(startIdx, endIdx);
            
            if (page > 0) {
              doc.addPage();
              doc.setFontSize(16);
              doc.text(`Lost Items (Page ${page + 1}/${totalPages})`, 14, 20);
            } else {
              doc.text(`Page 1/${totalPages}`, pageWidth - 20, 20, { align: 'right' });
            }
            
            autoTable(doc, {
              startY: 35,
              head: [['ID', 'Name', 'Category', 'Location', 'Date Lost', 'Reported By', 'Contact Info']],
              body: pageItems.map(item => {
                // Debug: Log each item's contact info
                console.log(`Processing lost item ${item.id}:`, {
                  user_name: item.user_name,
                  reported_by: item.reported_by,
                  contact_info: item.contact_info,
                  user_email: item.user_email,
                  phone: item.phone,
                  contact_number: item.contact_number
                });
                
                // Try multiple fields for reporter name
                const reporterName = item.user_name || 
                                    item.reported_by || 
                                    item.username || 
                                    (item.user ? item.user.name : null) || 
                                    '';
                                    
                // Try multiple fields for contact info
                const contactInfo = item.contact_info || 
                                   item.user_email || 
                                   item.phone || 
                                   item.contact_number || 
                                   (item.user ? item.user.email : null) || 
                                   '';
                
                return [
                  item.id,
                  sanitizeForPDF(item.name || item.title),
                  sanitizeForPDF(item.category),
                  sanitizeForPDF(item.location),
                  formatDate(item.created_at || item.date),
                  sanitizeForPDF(reporterName),
                  sanitizeForPDF(contactInfo)
                ];
              }),
              theme: 'grid',
              headStyles: { fillColor: [41, 128, 185], textColor: 255 }
            });
          }
        } else {
          doc.text('No lost items to display', 14, 30);
        }
        
        // Save the PDF with formatted date in filename
        const formattedDate = currentDate.toISOString().split('T')[0];
        doc.save(`admin-report-${formattedDate}.pdf`);
        
        resolve();
      });
      
      // Race between the report generation and the timeout
      await Promise.race([reportPromise, timeoutPromise]);
      
      // Show success toast
      setToastMessage(`Comprehensive admin report has been downloaded successfully!`);
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      setToastMessage(`Error generating report: ${error.message}`);
      setToastType('danger');
      setShowToast(true);
    } finally {
      setGeneratingPDF(false);
    }
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
        <div className="page-header-actions">
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="download-tooltip">Download Comprehensive Report</Tooltip>}
          >
            <Button 
              variant="primary"
              className="download-report-btn"
              onClick={generateComprehensiveReport}
              disabled={generatingPDF}
            >
              {generatingPDF ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-download me-2"></i>
                  Download Report
                </>
              )}
            </Button>
          </OverlayTrigger>
        </div>
        <p className="page-description">Welcome, {currentUser?.name || 'Admin'}! Here you can manage users, items, and system settings.</p>
      </div>

      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      {successMessage && <Alert variant="success" className="mb-3">{successMessage}</Alert>}
      
      {/* Toast notification for PDF download */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1 }}>
        <Toast 
          onClose={() => setShowToast(false)} 
          show={showToast} 
          delay={3000} 
          autohide
          bg={toastType}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastType === 'success' ? 'Report Generated' : 'Error'}
            </strong>
            <small>Just now</small>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

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
            Items
          </button>
          <button 
            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            System Logs
          </button>
          <button 
            className={`tab ${activeTab === 'oldItems' ? 'active' : ''}`}
            onClick={() => setActiveTab('oldItems')}
          >
            Items for Donation
          </button>
          <button 
            className={`tab ${activeTab === 'donatedItems' ? 'active' : ''}`}
            onClick={() => setActiveTab('donatedItems')}
          >
            Donated Items
            {donatedItems.length > 0 && (
              <span className="badge bg-success ms-1">{donatedItems.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'dashboard' && renderDashboardStats()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'items' && (
          <div className="admin-items-section">
            <h2 className="page-title">Item Management</h2>
            <p className="section-description">View and manage all items in the system.</p>
            
            <div className="section-actions mb-3 d-flex justify-content-between">
              <div className="view-controls">
                <Button 
                  variant={viewMode === 'grid' ? 'primary' : 'outline-primary'} 
                  className="me-2"
                  onClick={() => setViewMode('grid')}
                >
                  <i className="fas fa-th"></i> Grid View
                </Button>
                <Button 
                  variant={viewMode === 'table' ? 'primary' : 'outline-primary'} 
                  onClick={() => setViewMode('table')}
                >
                  <i className="fas fa-list"></i> Table View
                </Button>
              </div>
              
              <Dropdown>
                <Dropdown.Toggle variant="primary" id="dropdown-reports-items">
                  <i className="fas fa-file-pdf"></i> Download Reports
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => generatePDFReport('Items')}>All Items Report</Dropdown.Item>
                  <Dropdown.Item onClick={() => generatePDFReport('Lost Items')}>Lost Items Report</Dropdown.Item>
                  <Dropdown.Item onClick={() => generatePDFReport('Found Items')}>Found Items Report</Dropdown.Item>
                  <Dropdown.Item onClick={() => generatePDFReport('Returned Items')}>Returned Items Report</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
            
            {viewMode === 'grid' ? renderItemsGrid(items) : renderItemsTable(items)}
          </div>
        )}
        {activeTab === 'logs' && renderLogsTab()}
        {activeTab === 'oldItems' && renderOldItemsTab()}
        {activeTab === 'donatedItems' && renderDonatedItemsTab()}
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