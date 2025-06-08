import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Badge, Button, Nav, Alert, Spinner, Form, Modal, Tabs, Tab, ButtonGroup, InputGroup } from 'react-bootstrap';
import { adminApi } from '../utils/api';
import '../styles/AdminDashboard.css';

// We'll use the API utilities
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const AdminDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
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
          // Use the adminApi from our api.js utility for remaining data
          const [itemsData, logsData, statsData] = await Promise.all([
            adminApi.getAllItems(),
            adminApi.getSystemLogs(),
            adminApi.getDashboardStats()
          ]);
          
          // If stats are returned from the API, use them, otherwise calculate
          if (statsData && Object.keys(statsData).length > 0) {
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
          } else {
            // Calculate statistics from data
            calculateStats(usersData, itemsData);
          }

          // Fetch old items (older than 1 year)
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          try {
            const oldItemsResponse = await axios.get(
              `${API_BASE_URL}/api/admin/old-items?date=${oneYearAgo.toISOString().split('T')[0]}`,
              { headers: { Authorization: `Bearer ${currentUser.token}` } }
            );
            setOldItems(Array.isArray(oldItemsResponse.data) ? oldItemsResponse.data : []);
          } catch (oldItemsError) {
            console.error('Error fetching old items:', oldItemsError);
            setOldItems([]);
          }

          // Set items and logs arrays
          setItems(Array.isArray(itemsData) ? itemsData : []);
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
      
      const totalUsers = usersArray.length;
      const totalBannedUsers = usersArray.filter(user => user.is_deleted).length;
      const totalLostItems = itemsArray.filter(item => item.status === 'lost').length;
      const totalFoundItems = itemsArray.filter(item => item.status === 'found').length;
      const totalPendingItems = itemsArray.filter(item => 
        (item.status === 'found' && !item.is_approved) || 
        item.status === 'requested'
      ).length;
      const totalReturnedItems = itemsArray.filter(item => item.status === 'returned').length;

      setStats({
        totalUsers,
        totalBannedUsers,
        totalLostItems,
        totalFoundItems,
        totalPendingItems,
        totalReturnedItems
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
      // Set default stats
      setStats({
        totalUsers: 0,
        totalBannedUsers: 0,
        totalLostItems: 0,
        totalFoundItems: 0,
        totalPendingItems: 0,
        totalReturnedItems: 0
      });
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

  // Handle showing the ban user modal
  const handleBanUser = (userId, userName) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToBan(user);
      setShowBanModal(true);
      setBanReason('');
    }
  };

  // Confirm banning a user
  const confirmBanUser = async () => {
    if (!userToBan) return;
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Banning user...'
      });
      
      // Call the API to ban the user
      await adminApi.banUser(userToBan.id, banReason);
      
      // Update the users list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userToBan.id 
            ? { ...user, is_deleted: true } 
            : user
        )
      );
      
      setActionStatus({
        type: 'success',
        message: 'User banned successfully'
      });
      
      // Close the modal and reset values
      setShowBanModal(false);
      setUserToBan(null);
      setBanReason('');
      
      // Refresh data after a short delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        setActionStatus(null);
      }, 3000);
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

  // Handle restoring a deleted item
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

      setActionStatus({
        type: 'success',
        message: 'Item restored successfully'
      });
      
      // Refresh the data after a short delay
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

  // Showing the delete item modal
  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
    setDeleteReason('');
  };

  // Confirm deleting an item
  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Deleting item...'
      });
      
      // Call the API to soft delete the item
      await adminApi.softDeleteItem(itemToDelete.id, deleteReason);
      
      // Update the items list
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemToDelete.id 
            ? { ...item, is_deleted: true } 
            : item
        )
      );
      
      setActionStatus({
        type: 'success',
        message: 'Item deleted successfully'
      });
      
      // Close the modal and reset values
      setShowDeleteModal(false);
      setItemToDelete(null);
      setDeleteReason('');
      
      // Refresh data after a short delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
        setActionStatus(null);
      }, 3000);
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

  // Filter items based on search query
  const filteredItems = searchQuery
    ? items.filter(item =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reporter_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  // Filter users based on search query
  const filteredUsers = searchQuery
    ? users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Render the items in grid view
  const renderItemsGrid = () => (
    <Row xs={1} md={2} lg={3} className="g-4">
      {filteredItems.map(item => (
        <Col key={item.id}>
          <Card className={`h-100 ${item.is_deleted ? 'border-danger' : ''}`}>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Badge 
                bg={
                  item.status === 'found' ? 'success' : 
                  item.status === 'lost' ? 'danger' : 
                  item.status === 'requested' ? 'warning' : 
                  item.status === 'returned' ? 'primary' : 
                  'secondary'
                }
              >
                {item.status}
              </Badge>
              {item.is_deleted && (
                <Badge bg="danger">Deleted</Badge>
              )}
            </Card.Header>
            <Card.Body>
              <Card.Title>{item.title}</Card.Title>
              <Card.Subtitle className="mb-2 text-muted">
                {item.category || 'Uncategorized'}
              </Card.Subtitle>
              <Card.Text className="text-truncate-2">
                {item.description || 'No description provided'}
              </Card.Text>
              <div className="mb-3">
                <small className="text-muted">
                  <strong>Reported by:</strong> {item.reporter_name || 'Anonymous'}
                </small><br />
                <small className="text-muted">
                  <strong>Date:</strong> {formatDate(item.created_at)}
                </small>
              </div>
              {item.is_deleted && (
                <Button 
                  variant="outline-success" 
                  size="sm" 
                  className="w-100"
                  onClick={() => handleRestoreItem(item.id)}
                >
                  <i className="fas fa-trash-restore me-2"></i>
                  Restore Item
                </Button>
              )}
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // Render the items in table view
  const renderItemsTable = () => (
    <div className="table-responsive">
      <Table hover bordered>
        <thead className="bg-light">
          <tr>
            <th>Item ID</th>
            <th>Image</th>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Reporter</th>
            <th>Date Reported</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-4">
                <i className="fas fa-box-open fa-2x mb-3 text-muted"></i>
                <p>No items found</p>
              </td>
            </tr>
          ) : (
            filteredItems.map(item => (
              <tr key={item.id} className={item.is_deleted ? 'table-danger' : ''}>
                <td>{item.id}</td>
                <td className="text-center">
                  {item.image ? (
                    <img 
                      src={`${API_BASE_URL}/uploads/${item.image}`}
                      alt={item.title}
                      style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                      className="rounded"
                    />
                  ) : (
                    <div className="bg-secondary d-flex justify-content-center align-items-center rounded" style={{ width: '50px', height: '50px' }}>
                      <i className="fas fa-image text-white"></i>
                    </div>
                  )}
                </td>
                <td>
                  <div className="fw-medium">{item.title}</div>
                  <small className="text-muted text-truncate d-block" style={{maxWidth: '150px'}}>
                    {item.description?.substring(0, 50) || 'No description provided'}
                    {item.description?.length > 50 ? '...' : ''}
                  </small>
                </td>
                <td>
                  <Badge bg="secondary">
                    {item.category || 'Uncategorized'}
                  </Badge>
                </td>
                <td>
                  <Badge
                    bg={
                      item.status === 'found' ? 'success' : 
                      item.status === 'lost' ? 'danger' : 
                      item.status === 'requested' ? 'warning' : 
                      item.status === 'returned' ? 'primary' : 
                      'secondary'
                    }
                  >
                    {item.status}
                  </Badge>
                  {item.is_deleted && (
                    <Badge bg="danger" className="ms-1">Deleted</Badge>
                  )}
                  {!item.is_approved && item.status === 'found' && (
                    <Badge bg="warning" className="ms-1">Pending</Badge>
                  )}
                </td>
                <td>
                  <div className="small">
                    <div>{item.reporter_name || 'Unknown'}</div>
                    <div className="text-muted">{item.reporter_email || 'No email'}</div>
                  </div>
                </td>
                <td>
                  <div className="small">{formatDate(item.created_at)}</div>
                </td>
                <td>
                  <ButtonGroup size="sm">
                    <Button 
                      variant="outline-primary" 
                      title="View Details"
                    >
                      <i className="fas fa-eye"></i>
                    </Button>
                    
                    {item.is_deleted ? (
                      <Button 
                        variant="outline-success" 
                        title="Restore Item"
                        onClick={() => handleRestoreItem(item.id)}
                      >
                        <i className="fas fa-trash-restore"></i>
                      </Button>
                    ) : (
                      <Button 
                        variant="outline-danger" 
                        title="Delete Item"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    )}
                  </ButtonGroup>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );

  // Render users tab
  const renderUsersTab = () => (
    <Card className="shadow-sm">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-users me-2"></i>
            User Management {users.length > 0 ? `(${users.length})` : ''}
          </h5>
          <div className="d-flex gap-2">
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={debugFetchUsers}
              title="Refresh Users"
            >
              <i className="fas fa-sync-alt"></i>
            </Button>
            <Form.Group>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button 
                  variant="outline-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  <i className="fas fa-times"></i>
                </Button>
              </InputGroup>
            </Form.Group>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {users.length === 0 && (
          <Alert variant="info" className="m-3">
            <i className="fas fa-info-circle me-2"></i>
            No users found. Click the refresh button to try again.
          </Alert>
        )}
        <div className="table-responsive">
          <Table hover bordered className="mb-0">
            <thead className="bg-light">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Faculty/School</th>
                <th>Joined Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    <i className="fas fa-users fa-2x mb-3 text-muted"></i>
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className={user.is_deleted ? 'table-danger' : ''}>
                    <td>{user.id}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="user-avatar me-2">
                          <div className={`avatar-circle bg-${
                            user.role === 'admin' ? 'danger' :
                            user.role === 'security' ? 'warning' : 'primary'
                          }`}>
                            {user.name?.charAt(0).toUpperCase() || '?'}
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
                      {user.is_deleted ? (
                        <Badge bg="danger">Banned</Badge>
                      ) : (
                        <Badge bg="success">Active</Badge>
                      )}
                    </td>
                    <td>
                      <ButtonGroup size="sm">
                        <Button 
                          variant="outline-primary" 
                          title="View User Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                        
                        {user.role !== 'admin' && (
                          user.is_deleted ? (
                            <Button 
                              variant="outline-success" 
                              title="Unban User"
                              onClick={() => handleUnbanUser(user.id)}
                            >
                              <i className="fas fa-user-check"></i>
                            </Button>
                          ) : (
                            <Button 
                              variant="outline-danger" 
                              title="Ban User"
                              onClick={() => handleBanUser(user.id, user.name)}
                            >
                              <i className="fas fa-user-slash"></i>
                            </Button>
                          )
                        )}
                      </ButtonGroup>
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

  // Render the logs tab
  const renderLogsTab = () => (
    <div className="table-responsive">
      <Table hover bordered className="mb-0">
        <thead className="bg-light">
          <tr>
            <th>ID</th>
            <th>Action</th>
            <th>User</th>
            <th>Details</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center py-4">
                <i className="fas fa-clipboard-list fa-2x mb-3 text-muted"></i>
                <p>No logs found</p>
              </td>
            </tr>
          ) : (
            logs.map(log => (
              <tr key={log.id}>
                <td>{log.id}</td>
                <td>
                  <Badge 
                    bg={
                      log.action === 'delete' ? 'danger' : 
                      log.action === 'create' ? 'success' : 
                      log.action === 'update' ? 'warning' :
                      log.action === 'ban' ? 'dark' :
                      'primary'
                    }
                  >
                    {log.action}
                  </Badge>
                </td>
                <td>{log.user_name || log.user_id || 'System'}</td>
                <td>{log.details}</td>
                <td>{formatDate(log.timestamp)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );

  // Render old items tab
  const renderOldItemsTab = () => (
    <div className="old-items-section">
      <h2>Unclaimed Items (Older Than 1 Year)</h2>
      {oldItems.length === 0 ? (
        <p>No old unclaimed items found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Found Date</th>
                <th>Days Unclaimed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {oldItems.map(item => {
                const foundDate = new Date(item.date);
                const today = new Date();
                const daysUnclaimed = Math.floor((today - foundDate) / (1000 * 60 * 60 * 24));
                
                return (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.category}</td>
                    <td>{foundDate.toLocaleDateString()}</td>
                    <td>{daysUnclaimed}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-warning"
                        onClick={() => handleRestoreItem(item.id)}
                        disabled={item.marked_for_donation}
                      >
                        {item.marked_for_donation ? 'Marked for Donation' : 'Mark for Donation'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render dashboard stats
  const renderDashboardStats = () => (
    <Row className="mb-4">
      <Col md={3}>
        <Card className="bg-primary text-white mb-3">
          <Card.Body>
            <h4 className="mb-0">{stats.totalUsers || 0}</h4>
            <div>Total Users</div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="bg-success text-white mb-3">
          <Card.Body>
            <h4 className="mb-0">{stats.totalFoundItems || 0}</h4>
            <div>Found Items</div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="bg-danger text-white mb-3">
          <Card.Body>
            <h4 className="mb-0">{stats.totalLostItems || 0}</h4>
            <div>Lost Items</div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="bg-dark text-white mb-3">
          <Card.Body>
            <h4 className="mb-0">{stats.totalBannedUsers || 0}</h4>
            <div>Banned Users</div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  // Debug function to manually fetch users
  const debugFetchUsers = async () => {
    try {
      setActionLoading(true);
      setActionStatus({
        type: 'loading',
        message: 'Fetching users...'
      });
      
      console.log('Current API_BASE_URL:', API_BASE_URL);
      console.log('Current user token:', currentUser?.token);
      
      // Try multiple approaches to get users data
      
      // First, try the debug endpoint
      try {
        console.log('Attempting to use debug endpoint...');
        const debugResponse = await axios.get(`${API_BASE_URL}/api/debug/users`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        console.log('Debug users endpoint response:', debugResponse.data);
        
        if (debugResponse.data && debugResponse.data.users && Array.isArray(debugResponse.data.users)) {
          console.log(`Successfully fetched ${debugResponse.data.users.length} users from debug endpoint`);
          setUsers(debugResponse.data.users);
          setActionStatus({
            type: 'success',
            message: `Successfully fetched ${debugResponse.data.users.length} users from debug endpoint`
          });
          return;
        }
      } catch (debugError) {
        console.error('Debug endpoint error:', debugError);
      }
      
      // Then, try the regular admin endpoint
      try {
        console.log('Attempting to use standard admin endpoint...');
        const adminResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        console.log('Admin users endpoint response:', adminResponse.data);
        
        if (adminResponse.data && Array.isArray(adminResponse.data) && adminResponse.data.length > 0) {
          console.log(`Successfully fetched ${adminResponse.data.length} users from admin endpoint`);
          setUsers(adminResponse.data);
          setActionStatus({
            type: 'success',
            message: `Successfully fetched ${adminResponse.data.length} users from admin endpoint`
          });
          return;
        }
      } catch (adminError) {
        console.error('Admin endpoint error:', adminError);
      }
      
      // As a last resort, try to create an admin user
      try {
        console.log('Attempting to create an admin user...');
        const createAdminResponse = await axios.get(`${API_BASE_URL}/api/debug/create-admin`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        console.log('Create admin response:', createAdminResponse.data);
        
        // Try the regular admin endpoint again after creating admin
        const adminRetryResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${currentUser.token}` }
        });
        
        if (Array.isArray(adminRetryResponse.data)) {
          console.log(`Successfully fetched ${adminRetryResponse.data.length} users after creating admin`);
          setUsers(adminRetryResponse.data);
          setActionStatus({
            type: 'success',
            message: `Successfully fetched ${adminRetryResponse.data.length} users after creating admin`
          });
        } else {
          setActionStatus({
            type: 'error',
            message: 'Failed to fetch users even after creating admin'
          });
        }
      } catch (createAdminError) {
        console.error('Create admin error:', createAdminError);
        setActionStatus({
          type: 'error',
          message: `All attempts to fetch users failed. Please check the server logs.`
        });
      }
    } finally {
      setActionLoading(false);
      
      // Clear status after a delay
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
    }
  };
  
  // Debug info component
  const debugInfo = () => {
    if (users.length === 0) {
      return (
        <Alert variant="warning" className="m-3">
          <h5><i className="fas fa-bug me-2"></i>Debug Information</h5>
          <p>No users found. Here's some debug information that might help:</p>
          <div className="bg-light p-3 rounded" style={{fontSize: '0.9em'}}>
            <ul className="mb-0">
              <li><strong>Current user:</strong> {currentUser ? `${currentUser.name} (${currentUser.email})` : 'Not logged in'}</li>
              <li><strong>User role:</strong> {currentUser?.role || 'None'}</li>
              <li><strong>API base URL:</strong> {API_BASE_URL}</li>
              <li><strong>Refresh trigger:</strong> {refreshTrigger}</li>
              <li><strong>View mode:</strong> {viewMode}</li>
              <li><strong>Active tab:</strong> {activeTab}</li>
            </ul>
          </div>
          <div className="mt-3">
            <p className="mb-2">Suggested actions:</p>
            <ul>
              <li>Check if the server is running properly</li>
              <li>Verify your admin credentials</li>
              <li>Check the browser console for errors</li>
              <li>Try the manual refresh button above</li>
            </ul>
          </div>
        </Alert>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading admin dashboard...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="p-3 p-md-4">
      {/* Page title and action status */}
      <Row className="mb-3">
        <Col>
          <h2 className="mb-0">
            <i className="fas fa-shield-alt me-2"></i>
            Admin Dashboard
          </h2>
          <p className="text-muted">Manage items, users, and system settings</p>
        </Col>
        {actionStatus && (
          <Col xs={12}>
            <Alert 
              variant={actionStatus.type === 'success' ? 'success' : actionStatus.type === 'error' ? 'danger' : 'info'}
              className="d-flex align-items-center"
            >
              {actionStatus.type === 'loading' && (
                <Spinner animation="border" size="sm" className="me-2" />
              )}
              {actionStatus.type === 'success' && (
                <i className="fas fa-check-circle me-2"></i>
              )}
              {actionStatus.type === 'error' && (
                <i className="fas fa-exclamation-circle me-2"></i>
              )}
              {actionStatus.message}
            </Alert>
          </Col>
        )}
      </Row>

      {/* Loading spinner */}
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading dashboard data...</p>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : (
        <>
          {/* Dashboard content tabs */}
          <Tabs
            id="admin-dashboard-tabs"
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
          >
            <Tab eventKey="dashboard" title={<><i className="fas fa-chart-line me-2"></i>Overview</>}>
              {renderDashboardStats()}
            </Tab>
            <Tab eventKey="items" title={<><i className="fas fa-box me-2"></i>Items</>}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="fas fa-box me-2"></i>
                      Items Management
                    </h5>
                    <div className="d-flex gap-2">
                      <Form.Group>
                        <InputGroup>
                          <Form.Control
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <Button 
                            variant="outline-secondary"
                            onClick={() => setSearchQuery('')}
                          >
                            <i className="fas fa-times"></i>
                          </Button>
                        </InputGroup>
                      </Form.Group>
                      <ButtonGroup>
                        <Button 
                          variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                          onClick={() => setViewMode('table')}
                          title="Table View"
                        >
                          <i className="fas fa-table"></i>
                        </Button>
                        <Button 
                          variant={viewMode === 'grid' ? 'primary' : 'outline-primary'}
                          onClick={() => setViewMode('grid')}
                          title="Grid View"
                        >
                          <i className="fas fa-th"></i>
                        </Button>
                      </ButtonGroup>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body className="p-0">
                  {viewMode === 'grid' ? renderItemsGrid() : renderItemsTable()}
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="users" title={<><i className="fas fa-users me-2"></i>Users</>}>
              {renderUsersTab()}
            </Tab>
            <Tab eventKey="logs" title={<><i className="fas fa-history me-2"></i>Logs</>}>
              {renderLogsTab()}
            </Tab>
            <Tab eventKey="old-items" title={<><i className="fas fa-archive me-2"></i>Archive</>}>
              {renderOldItemsTab()}
            </Tab>
          </Tabs>
        </>
      )}

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

      {/* Delete Item Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Item Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            This action will soft-delete the item from the system. It can be restored later.
          </div>
          
          {itemToDelete && (
            <div className="d-flex align-items-center mt-3 mb-3 p-3 bg-light rounded">
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
            onClick={confirmDeleteItem}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-trash me-2"></i>
                Delete Item
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Debug Info */}
      {debugInfo()}
    </Container>
  );
};

export default AdminDashboard; 