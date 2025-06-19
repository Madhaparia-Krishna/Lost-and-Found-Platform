import axios from 'axios';

// API base URL - connects to the lost_and_found_system database
// We need to handle both ports 5000 and 5001 since the server may switch ports
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Log the base URL being used
console.log('Using API base URL:', API_BASE_URL);

// Try to detect if we need to use a different port by checking server availability
async function detectServerPort() {
  try {
    // First try port 5000
    console.log('Trying to connect to port 5000...');
    await axios.get('http://localhost:5000/health', { timeout: 1000 });
    console.log('Successfully connected to port 5000');
    axios.defaults.baseURL = 'http://localhost:5000';
    return 'http://localhost:5000';
  } catch (error) {
    console.log('Failed to connect to port 5000:', error.message);
    try {
      // If 5000 fails, try 5001
      console.log('Trying to connect to port 5001...');
      await axios.get('http://localhost:5001/health', { timeout: 1000 });
      console.log('Successfully connected to port 5001');
      axios.defaults.baseURL = 'http://localhost:5001';
      return 'http://localhost:5001';
    } catch (innerError) {
      console.log('Failed to connect to port 5001:', innerError.message);
      // Default to 5000 if both fail
      console.log('Defaulting to port 5000');
      axios.defaults.baseURL = 'http://localhost:5000';
      return 'http://localhost:5000';
    }
  }
}

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Try to detect the correct port
detectServerPort().catch(() => {});

// Create axios instance with auth
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 seconds timeout
});

// Add auth token to requests if available
api.interceptors.request.use(config => {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const { token } = JSON.parse(user);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Error parsing user data
    }
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    return Promise.reject(error);
  }
);

// Handle response data
const handleResponse = (response) => {
  if (response.data) {
    // If the response is an array, return it directly
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // If response has a specific property that is an array, return that
    if (response.data.items && Array.isArray(response.data.items)) {
      return response.data.items;
    }
    return response.data;
  }
  return response;
};

// Handle errors consistently
const handleError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // The server responded with a status code outside the 2xx range
    const errorMessage = error.response.data?.message || 'An unknown error occurred';
    
    // Specific handling for authentication errors
    if (error.response.status === 401) {
      console.error('Authentication error (401):', error.response.data);
      
      // Check for wrong password error
      if (error.response.data?.errorType === 'wrong_password' || 
          error.response.data?.message.includes('Wrong password')) {
        return Promise.reject(new Error('Wrong password. Please try again.'));
      }
      
      return Promise.reject(new Error(errorMessage || 'Authentication failed'));
    }
    
    console.error('Server error response:', error.response.data);
    return Promise.reject(new Error(errorMessage));
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response received:', error.request);
    return Promise.reject(new Error('No response from server. Please check your connection.'));
  } else {
    // Something happened in setting up the request
    return Promise.reject(new Error(error.message || 'An error occurred'));
  }
};

// Items API
export const itemsApi = {
  // Get all items
  getAll: async (status = null) => {
    try {
      console.log(`Getting items with status filter: ${status || 'none'}`);
      
      // Try getting items directly from /items endpoint first
      try {
        let url = '/items';
        
        // Add status query parameter if provided
        if (status) {
          url += `?status=${status}`;
        }
        
        console.log(`Trying endpoint: ${url}`);
        const response = await axios.get(url);
        
        let items = response.data;
        
        // Double check filtering by status if needed
        if (status && Array.isArray(items)) {
          console.log(`Filtering ${items.length} items for status: ${status}`);
          items = items.filter(item => item.status === status);
          console.log(`After filtering: ${items.length} items`);
        }
        
        return items;
      } catch (err) {
        console.log('First endpoint failed, trying alternatives...', err);
        
        // If specifically requesting found items, use the dedicated endpoint
        if (status === 'found') {
          try {
            console.log('Trying /items/found endpoint');
            const response = await axios.get('/items/found');
            return response.data;
          } catch (err) {
            console.log('Found items endpoint failed, falling back to regular endpoints');
            // Fall through to regular endpoints
          }
        }
        
        // If specifically requesting lost items, use the dedicated endpoint
        if (status === 'lost') {
          try {
            const response = await axios.get('/items/lost');
            return response.data;
          } catch (err) {
            // Fall through to regular endpoints
          }
        }
        
        // Try the security endpoint if user is logged in
        const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null;
        if (token) {
          try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // Add status filter if provided
            if (status) {
              config.params = { status };
            }
            const response = await axios.get('/api/items', config);
            return response.data;
          } catch (err) {
            try {
              const response = await api.get('/api/security/all-items');
              
              // Filter by status if needed
              if (status && Array.isArray(response.data)) {
                return response.data.filter(item => item.status === status);
              }
              
              return response.data;
            } catch (innerErr) {
              // Last try with public endpoint
              const response = await axios.get('/api/public/items');
              
              // Filter by status if needed
              if (status && Array.isArray(response.data)) {
                return response.data.filter(item => item.status === status);
              }
              
              return response.data;
            }
          }
        } else {
          // Not logged in, try public endpoint
          const response = await axios.get('/api/public/items');
          
          // Filter by status if needed
          if (status && Array.isArray(response.data)) {
            return response.data.filter(item => item.status === status);
          }
          
          return response.data;
        }
      }
    } catch (error) {
      console.error('All getAll endpoints failed:', error);
      return []; // Return empty array in case of error
    }
  },
  
  // Get item by ID
  getItemById: async (itemId) => {
    try {
      const response = await axios.get(`/items/${itemId}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Alias for getItemById for backward compatibility
  getById: async (itemId) => {
    return itemsApi.getItemById(itemId);
  },
  
  // Upload image
  uploadImage: async (imageFile) => {
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Set the correct headers for file upload
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      // Add auth token if available
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const { token } = JSON.parse(user);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      const response = await axios.post('/api/upload', formData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Report found item
  reportFound: async (itemData, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post('/items/found', itemData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Submit found item (alias for reportFound for backward compatibility)
  submitFound: async (itemData, token) => {
    try {
      return await itemsApi.reportFound(itemData, token);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Report lost item
  reportLost: async (itemData, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post('/items/lost', itemData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Submit lost item (alias for reportLost for backward compatibility)
  submitLost: async (itemData, token) => {
    try {
      return await itemsApi.reportLost(itemData, token);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Claim item
  claimItem: async (itemId, claimData, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post(`/api/items/${itemId}/claim`, claimData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Filter items
  filterItems: async (params) => {
    try {
      const response = await axios.get('/items/filter', { params });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Create item
  createItem: async (itemData, token) => {
    try {
      let config = {};
      
      // If token is provided, add it to headers
      if (token) {
        config.headers = {
          'Authorization': `Bearer ${token}`
        };
      } else {
        // Try to get token from localStorage if not provided
        const user = localStorage.getItem('user');
        if (user) {
          try {
            const userData = JSON.parse(user);
            if (userData.token) {
              config.headers = {
                'Authorization': `Bearer ${userData.token}`
              };
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }
      
      // If itemData is FormData, don't set Content-Type (browser will set it with boundary)
      if (!(itemData instanceof FormData)) {
        config.headers = {
          ...config.headers,
          'Content-Type': 'application/json'
        };
      }
      
      console.log('Creating item with config:', config);
      const response = await axios.post('/api/items', itemData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update item
  updateItem: async (itemId, itemData, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.put(`/items/${itemId}`, itemData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Delete item
  deleteItem: async (itemId, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.delete(`/items/${itemId}`, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Request item (change status to requested)
  requestItem: async (itemId) => {
    try {
      console.log(`Requesting item with ID: ${itemId}`);
      
      // Get token from localStorage
      let token = null;
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          token = userData.token;
          console.log('Token retrieved for authentication');
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      console.log('Request config:', { hasToken: !!token });
      
      // Try PUT endpoint first
      try {
        console.log('Trying PUT endpoint...');
        const response = await axios.put(`/items/${itemId}/request`, {}, config);
        console.log('PUT request successful:', response.data);
        return response.data;
      } catch (error1) {
        console.error('PUT endpoint failed:', error1.response?.status, error1.response?.data);
        
        // Try POST endpoint if PUT fails
        try {
          console.log('Trying POST endpoint...');
          const response = await axios.post(`/items/request/${itemId}`, {}, config);
          console.log('POST request successful:', response.data);
          return response.data;
        } catch (error2) {
          console.error('POST endpoint failed:', error2.response?.status, error2.response?.data);
          
          // Get detailed error message
          if (error2.response?.data?.message) {
            throw new Error(error2.response.data.message);
          } else if (error1.response?.data?.message) {
            throw new Error(error1.response.data.message);
          } else {
            throw new Error('Failed to request item. Please try again later.');
          }
        }
      }
    } catch (error) {
      console.error('Error requesting item:', error);
      return handleError(error);
    }
  },
  
  // Approve item (security staff only)
  approveItem: async (itemId) => {
    try {
      // Get token from localStorage
      let token = null;
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          token = userData.token;
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      console.log(`Approving item ${itemId} with auth token`);
      const response = await axios.put(`/api/security/items/${itemId}/approve`, {}, config);
      return handleResponse(response);
    } catch (error) {
      console.error('Error approving item:', error);
      return handleError(error);
    }
  },
  
  // Reject item (security staff only)
  rejectItem: async (itemId, reason = '') => {
    try {
      // Get token from localStorage
      let token = null;
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          token = userData.token;
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      console.log(`Rejecting item ${itemId} with reason: ${reason}`);
      const response = await axios.put(`/api/security/items/${itemId}/reject`, { reason }, config);
      return handleResponse(response);
    } catch (error) {
      console.error('Error rejecting item:', error);
      return handleError(error);
    }
  }
};

// Authentication API
export const authApi = {
  // Login
  login: async (credentials) => {
    try {
      const response = await axios.post('/api/login', credentials);
      return handleResponse(response).user; // Extract user from response
    } catch (error) {
      console.error('Login error details:', error);
      
      // Specific error handling for authentication failures
      if (error.response && error.response.status === 401) {
        const errorMessage = error.response.data?.message || 'Authentication failed';
        const errorType = error.response.data?.errorType || '';
        
        console.log('Server error response:', error.response.data);
        
        // Check for wrong password error
        if (errorType === 'wrong_password' || errorMessage.includes('Wrong password')) {
          return Promise.reject(new Error('Wrong password. Please try again.'));
        }
        
        // For other 401 errors
        return Promise.reject(new Error(errorMessage));
      }
      
      // For other errors, use the standard error handler
      return handleError(error);
    }
  },
  
  // Register
  register: async (userData) => {
    try {
      const response = await axios.post('/api/register', userData);
      return handleResponse(response).user; // Extract user from response
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get user profile
  getProfile: async (token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get('/api/profile', config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update user profile
  updateProfile: async (profileData, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.put('/api/profile', profileData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Change password
  changePassword: async (passwordData, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.put('/api/change-password', passwordData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// Notifications API
export const notificationsApi = {
  // Get all notifications
  getAll: async (token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get('/api/notifications', config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Mark as read
  markAsRead: async (notificationId, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.put(`/api/notifications/${notificationId}/read`, {}, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// Security API for security staff operations
export const securityApi = {
  // Get pending items
  getPendingItems: async () => {
    try {
      console.log('Fetching pending items for security panel...');
      const response = await api.get('/api/security/pending-items');
      console.log('Pending items response:', response.data);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching pending items:', error);
      
      // Try alternative endpoint if the first one fails
      try {
        console.log('Trying alternative endpoint for pending items...');
        const response = await api.get('/items?status=found&is_approved=false');
        console.log('Alternative pending items response:', response.data);
        return handleResponse(response);
      } catch (altError) {
        console.error('Alternative endpoint also failed:', altError);
        return [];
      }
    }
  },
  
  // Get all items (for security staff)
  getAllItems: async () => {
    try {
      console.log('Fetching all items for security staff...');
      const response = await api.get('/api/security/all-items');
      const items = handleResponse(response);
      
      console.log('Items fetched successfully, total count:', items.length);
      
      // Log the counts of items by status
      const statusCounts = {};
      items.forEach(item => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });
      console.log('Items by status:', statusCounts);
      
      // Log requested items specifically
      const requestedItems = items.filter(item => item.status === 'requested');
      console.log('Requested items count:', requestedItems.length);
      if (requestedItems.length > 0) {
        console.log('Sample requested item:', requestedItems[0]);
      }
      
      return items;
    } catch (error) {
      console.error('Error fetching all items:', error);
      return [];
    }
  },
  
  // Get dashboard statistics
  getStatistics: async () => {
    try {
      const response = await api.get('/api/security/statistics');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching security statistics:', error);
      return {
        itemCounts: { lost: 0, found: 0, requested: 0, received: 0, returned: 0, pending: 0 },
        claimCounts: { pending: 0 },
        userCounts: { total: 0 },
        monthlyStats: [],
        categoryDistribution: []
      };
    }
  },
  
  // Get security activity logs
  getActivityLogs: async () => {
    try {
      const response = await api.get('/api/security/activity-logs');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching security activity logs:', error);
      return { logs: [] };
    }
  },
  
  // Advanced item search
  searchItems: async (params) => {
    try {
      const response = await api.get('/api/security/search-items', { params });
      return handleResponse(response);
    } catch (error) {
      console.error('Error searching items:', error);
      return { items: [] };
    }
  },
  
  // Get pending claims
  getPendingClaims: async () => {
    try {
      const response = await api.get('/api/security/pending-claims');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching pending claims:', error);
      return [];
    }
  },
  
  // Approve an item
  approveItem: async (itemId) => {
    try {
      console.log(`Approving item ${itemId}...`);
      const response = await api.put(`/api/security/items/${itemId}/approve`);
      console.log('Approval response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Error approving item:', error);
      return handleError(error);
    }
  },
  
  // Reject an item
  rejectItem: async (itemId, reason = '') => {
    try {
      console.log(`Rejecting item ${itemId} with reason: ${reason}`);
      const response = await api.put(`/api/security/items/${itemId}/reject`, { reason });
      console.log('Rejection response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Error rejecting item:', error);
      return handleError(error);
    }
  },
  
  // Accept a request (mark item as returned)
  acceptRequest: async (itemId) => {
    try {
      console.log(`Accepting request for item ${itemId}...`);
      const response = await api.put(`/api/security/items/${itemId}/return`);
      console.log('Request acceptance response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Error accepting request:', error);
      return handleError(error);
    }
  },
  
  // Reject a request
  rejectRequest: async (itemId) => {
    try {
      console.log(`Rejecting request for item ${itemId}...`);
      const response = await api.put(`/api/security/items/${itemId}/revert-status`, { status: 'found' });
      console.log('Request rejection response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Error rejecting request:', error);
      return handleError(error);
    }
  },
  
  // Approve a claim
  approveClaim: async (claimId) => {
    try {
      const response = await api.put(`/api/security/claims/${claimId}/approve`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Reject a claim
  rejectClaim: async (claimId) => {
    try {
      const response = await api.put(`/api/security/claims/${claimId}/reject`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Mark item as received
  markItemReceived: async (itemId) => {
    try {
      const response = await api.put(`/api/security/items/${itemId}/receive`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Mark item as returned
  markItemReturned: async (itemId) => {
    try {
      const response = await api.put(`/api/security/items/${itemId}/return`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Soft delete an item
  softDeleteItem: async (itemId, reason) => {
    try {
      const response = await api.put(`/api/security/items/${itemId}/soft-delete`, { reason });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Revert item status
  revertItemStatus: async (itemId, status) => {
    try {
      const response = await api.put(`/api/security/items/${itemId}/revert-status`, { status });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Ban a user
  banUser: async (userId, reason) => {
    try {
      const response = await api.put(`/api/security/users/${userId}/ban`, { reason });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get users
  getUsers: async () => {
    try {
      const response = await api.get('/api/security/users');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }
};

// Admin API for admin operations
export const adminApi = {
  // Get all users
  getAllUsers: async () => {
    try {
      const response = await api.get('/api/admin/users');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },
  
  // Get all items
  getAllItems: async () => {
    try {
      const response = await api.get('/api/admin/items');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  },
  
  // Get system logs
  getSystemLogs: async () => {
    try {
      const response = await api.get('/api/admin/logs');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching system logs:', error);
      return [];
    }
  },
  
  // Unban a user
  unbanUser: async (userId) => {
    try {
      const response = await api.put(`/api/admin/users/${userId}/unban`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Ban a user
  banUser: async (userId, reason) => {
    try {
      const response = await api.put(`/api/admin/users/${userId}/ban`, { reason });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Soft delete an item
  softDeleteItem: async (itemId, reason) => {
    try {
      const response = await api.put(`/api/admin/items/${itemId}/soft-delete`, { reason });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Restore a deleted item
  restoreItem: async (itemId) => {
    try {
      const response = await api.put(`/api/admin/items/${itemId}/restore`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update user role
  updateUserRole: async (userId, role) => {
    try {
      const response = await api.put(`/api/admin/users/${userId}/role`, { role });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/api/admin/stats');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      return {};
    }
  },
  
  // Mark item for donation
  markItemForDonation: async (itemId, reason, organization = '') => {
    try {
      const response = await api.put(`/api/admin/items/${itemId}/donate`, { 
        reason, 
        organization 
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Error marking item for donation:', error);
      // Try alternative endpoint if the first one fails
      try {
        const altResponse = await api.put(`/api/items/${itemId}/donate`, { 
          reason, 
          organization 
        });
        return handleResponse(altResponse);
      } catch (altError) {
        return handleError(altError);
      }
    }
  }
};

export default api;