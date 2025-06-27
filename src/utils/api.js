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
        console.log(`Received ${items?.length || 0} items from server`);
        
        // Double check filtering by status if needed
        if (status && Array.isArray(items)) {
          console.log(`Filtering ${items.length} items for status: ${status}`);
          items = items.filter(item => item.status === status);
          console.log(`After filtering: ${items.length} items`);
        }
        
        // For found items, only show approved items to regular users
        if (status === 'found' && Array.isArray(items)) {
          // Check user role
          const user = localStorage.getItem('user');
          let isSecurityOrAdmin = false;
          
          if (user) {
            try {
              const userData = JSON.parse(user);
              isSecurityOrAdmin = userData.role === 'security' || userData.role === 'admin';
            } catch (error) {
              console.error('Error parsing user data:', error);
            }
          }
          
          // If not security or admin, filter for approved items only
          if (!isSecurityOrAdmin) {
            console.log('Filtering for approved items only');
            items = items.filter(item => 
              item.is_approved === true || 
              item.is_approved === 1 || 
              item.is_approved === '1'
            );
            console.log(`After approval filtering: ${items.length} items`);
          }
        }
        
        return items;
      } catch (err) {
        console.log('First endpoint failed, trying alternatives...', err);
        
        // Try all possible alternative endpoints
        // 1. Try security endpoint if user is logged in
        const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null;
        if (token) {
          try {
            console.log('Trying security endpoint with auth token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Add status filter if provided
            let url = '/api/security/all-items';
            if (status) {
              url += `?status=${status}`;
            }
            
            const response = await axios.get(url, config);
            let items = response.data;
            
            // Filter by status if needed
            if (status && Array.isArray(items)) {
              items = items.filter(item => item.status === status);
            }
            
            console.log(`Got ${items.length} items from security endpoint`);
            return items;
          } catch (securityError) {
            console.error('Security endpoint failed:', securityError);
          }
        }
        
        // 2. Try public endpoint as last resort
        try {
          console.log('Trying public endpoint');
          const response = await axios.get('/api/public/items');
          let items = response.data;
          
          // Filter by status if needed
          if (status && Array.isArray(items)) {
            items = items.filter(item => item.status === status);
          }
          
          console.log(`Got ${items.length} items from public endpoint`);
          return items;
        } catch (publicError) {
          console.error('Public endpoint failed:', publicError);
          return []; // Return empty array if all endpoints fail
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
  uploadImage: async (imageFile, token) => {
    try {
      console.log('Uploading image:', imageFile.name);
      
      // Get token if not provided
      if (!token) {
        const user = localStorage.getItem('user');
        if (user) {
          try {
            const userData = JSON.parse(user);
            token = userData.token;
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }
      
      // Create form data for image upload
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const config = token ? { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, browser will set it with boundary
        } 
      } : {};
      
      console.log('Making API call to /api/upload');
      const response = await axios.post('/api/upload', formData, config);
      console.log('Image upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error uploading image:', error);
      return handleError(error);
    }
  },
  
  // Report found item
  reportFound: async (itemData, token) => {
    try {
      console.log('Reporting found item:', itemData);
      
      // Get token if not provided
      if (!token) {
        const user = localStorage.getItem('user');
        if (user) {
          try {
            const userData = JSON.parse(user);
            token = userData.token;
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      }
      
      const config = token ? { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      } : {};
      
      console.log('Making API call to /items/found with token');
      const response = await axios.post('/items/found', itemData, config);
      console.log('Found item response:', response.data);
      return handleResponse(response);
    } catch (error) {
      console.error('Error reporting found item:', error);
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
  },
  
  // Check for matches for an item
  checkMatches: async (itemData, token) => {
    try {
      const config = token ? { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      } : {};
      
      console.log('Requesting matches for item:', itemData);
      const response = await axios.post('/match-items', { item: itemData }, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get match status
  getMatchStatus: async (itemId, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      const response = await axios.get(`/api/items/${itemId}/matches`, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// Authentication API
export const authApi = {
  // Login
  login: async (credentials) => {
    try {
      console.log('Login attempt with:', credentials.email);
      const response = await axios.post('/api/login', credentials);
      console.log('Login response received:', response.status);
      
      // Make sure we return the user object from the response
      const data = handleResponse(response);
      
      // Check if response has user property
      if (data && data.user) {
        console.log('Login successful, returning user data');
        return data.user;
      }
      
      // If response doesn't have user property but has the necessary data itself
      if (data && data.token) {
        console.log('Login successful, returning data directly');
        return data;
      }
      
      // If we don't have proper data, throw an error
      throw new Error('Invalid response format from server');
    } catch (error) {
      console.error('Login error details:', error);
      
      // Specific error handling for authentication failures
      if (error.response && error.response.status === 401) {
        const errorMessage = error.response.data?.message || 'Authentication failed';
        console.log('Authentication error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // For other errors
      throw new Error(error.message || 'Login failed. Please try again.');
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
      console.log('Fetching notifications...');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      try {
        const response = await axios.get('/api/notifications', config);
        console.log('Notifications response:', response.data);
        return handleResponse(response);
      } catch (directError) {
        console.error('Error fetching notifications:', directError);
        
        // Return empty data structure instead of throwing error
        return {
          notifications: [],
          unreadCount: 0
        };
      }
    } catch (error) {
      console.error('Unexpected error in notifications API:', error);
      return {
        notifications: [],
        unreadCount: 0
      };
    }
  },
  
  // Mark as read
  markAsRead: async (notificationId, token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.put(`/api/notifications/${notificationId}/read`, {}, config);
      return handleResponse(response);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, message: 'Failed to mark notification as read' };
    }
  },
  
  // Mark all as read
  markAllAsRead: async (token) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post(`/api/notifications/mark-read`, {}, config);
      return handleResponse(response);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, message: 'Failed to mark all notifications as read' };
    }
  }
};

// Security API for security staff operations
export const securityApi = {
  // Get pending items
  getPendingItems: async () => {
    try {
      console.log('Fetching pending items for security panel...');
      
      // Try direct axios call with authentication
      const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null;
      
      if (!token) {
        console.error('No authentication token available');
        return [];
      }
      
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      try {
        console.log('Trying direct axios call to /api/security/pending-items');
        const response = await axios.get(`${API_BASE_URL}/api/security/pending-items`, config);
        console.log('Pending items direct response:', response.data);
        return response.data;
      } catch (directError) {
        console.error('Direct endpoint failed:', directError);
        
        // Try alternative endpoint if the first one fails
        try {
          console.log('Trying alternative endpoint for pending items...');
          const response = await axios.get(`${API_BASE_URL}/api/security/all-items`, config);
          console.log('All items response:', response.data);
          
          // Filter for unapproved found items
          const pendingItems = response.data.filter(item => 
            item.status === 'found' && 
            (item.is_approved === false || item.is_approved === 0 || item.is_approved === '0') && 
            item.is_deleted !== true
          );
          
          console.log('Filtered pending items:', pendingItems.length);
          return pendingItems;
        } catch (altError) {
          console.error('Alternative endpoint also failed:', altError);
          return [];
        }
      }
    } catch (error) {
      console.error('Error fetching pending items:', error);
      return [];
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
  
  // Get pending item requests
  getPendingRequests: async () => {
    try {
      console.log('Fetching pending item requests...');
      const response = await api.get('/api/security/pending-requests');
      console.log('Pending requests response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  },
  
  // Approve an item request
  approveRequest: async (itemId) => {
    try {
      console.log(`Approving request for item ${itemId}...`);
      const response = await api.put(`/api/security/requests/${itemId}/approve`);
      console.log('Request approval response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Error approving request:', error);
      return handleError(error);
    }
  },
  
  // Reject an item request
  rejectRequest: async (itemId, reason = '') => {
    try {
      console.log(`Rejecting request for item ${itemId} with reason: ${reason}`);
      const response = await api.put(`/api/security/requests/${itemId}/reject`, { reason });
      console.log('Request rejection response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Error rejecting request:', error);
      return handleError(error);
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
      // Use the correct endpoint that creates notifications for the requester
      const response = await api.put(`/api/security/requests/${itemId}/approve`);
      console.log('Request acceptance response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Error accepting request:', error);
      return handleError(error);
    }
  },
  
  // Reject a request
  rejectRequest: async (itemId, reason = '') => {
    try {
      console.log(`Rejecting request for item ${itemId}...`);
      const response = await api.put(`/api/security/requests/${itemId}/reject`, { reason });
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
      console.log(`Attempting to soft delete item ${itemId} with reason: ${reason}`);
      
      // First try the security endpoint
      try {
        const response = await api.put(`/api/security/items/${itemId}/soft-delete`, { reason });
        console.log('Soft delete response:', response);
        return handleResponse(response);
      } catch (error) {
        console.error('First soft delete attempt failed:', error);
        
        // If that fails, try the admin endpoint
        try {
          const response = await api.put(`/api/admin/items/${itemId}/soft-delete`, { reason });
          console.log('Admin soft delete response:', response);
          return handleResponse(response);
        } catch (error2) {
          console.error('Admin soft delete attempt failed:', error2);
          
          // If that also fails, try a generic endpoint
          const response = await api.put(`/api/items/${itemId}/delete`, { reason });
          console.log('Generic delete response:', response);
          return handleResponse(response);
        }
      }
    } catch (error) {
      console.error('All soft delete attempts failed:', error);
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
  
  // Unban a user (admin only)
  unbanUser: async (userId) => {
    try {
      const response = await api.put(`/api/security/users/${userId}/unban`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get all users (security staff only)
  getUsers: async () => {
    try {
      console.log('Fetching users for security dashboard...');
      
      try {
        // Try direct API call first
        const response = await api.get('/api/security/users');
        console.log('Users fetched successfully:', response.data.length);
        return handleResponse(response);
      } catch (directError) {
        console.error('Error fetching users via security API:', directError);
        
        // Try alternative endpoint if first one fails
        try {
          console.log('Trying alternative endpoint for users...');
          const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null;
          
          if (!token) {
            console.error('No authentication token available');
            return [];
          }
          
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const response = await axios.get(`${API_BASE_URL}/api/admin/users`, config);
          console.log('Users fetched via admin API:', response.data.length);
          return response.data;
        } catch (altError) {
          console.error('Alternative endpoint also failed:', altError);
          return [];
        }
      }
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
  
  // Get old items (older than 1 year)
  getOldItems: async () => {
    try {
      const response = await api.get('/api/admin/old-items');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching old items:', error);
      return [];
    }
  },
  
  // Donate item (mark as donated)
  donateItem: async (itemId) => {
    try {
      // Use the simplified markItemForDonation function
      return await adminApi.markItemForDonation(itemId);
    } catch (error) {
      console.error('Error marking item as donated:', error);
      return handleError(error);
    }
  },
  
  // Get system logs
  getSystemLogs: async () => {
    try {
      console.log('Fetching system logs...');
      const response = await api.get('/api/admin/logs');
      
      // Check if response is valid
      if (response && response.data) {
        console.log(`Retrieved ${Array.isArray(response.data) ? response.data.length : 0} logs`);
        return handleResponse(response);
      } else {
        console.error('Invalid response format from logs API:', response);
        return [];
      }
    } catch (error) {
      console.error('Error fetching system logs:', error);
      
      // Try fallback endpoint
      try {
        console.log('Trying fallback logs endpoint...');
        const fallbackResponse = await api.get('/api/admin/system-logs');
        if (fallbackResponse && fallbackResponse.data && fallbackResponse.data.logs) {
          console.log(`Retrieved ${fallbackResponse.data.logs.length} logs from fallback endpoint`);
          return fallbackResponse.data.logs;
        }
      } catch (fallbackError) {
        console.error('Fallback logs endpoint also failed:', fallbackError);
      }
      
      return [];
    }
  },
  
  // Unban a user
  unbanUser: async (userId) => {
    try {
      // Use the security API endpoint for both security and admin
      const response = await api.put(`/api/security/users/${userId}/unban`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Ban a user
  banUser: async (userId, reason) => {
    try {
      // Use the security API endpoint for both security and admin
      const response = await api.put(`/api/security/users/${userId}/ban`, { reason });
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Soft delete an item
  softDeleteItem: async (itemId, reason) => {
    try {
      console.log(`Attempting to soft delete item ${itemId} with reason: ${reason}`);
      const response = await api.put(`/api/admin/items/${itemId}/soft-delete`, { reason });
      console.log('Soft delete response:', response);
      return handleResponse(response);
    } catch (error) {
      console.error('Soft delete error:', error);
      return handleError(error);
    }
  },
  
  // Alias for deleteItem (to match the function name used in confirmDeleteItem)
  deleteItem: async (itemId, reason) => {
    try {
      console.log(`Deleting item ${itemId} with reason: ${reason}`);
      return await adminApi.softDeleteItem(itemId, reason);
    } catch (error) {
      console.error('Delete item error:', error);
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
      console.log(`Updating role for user ${userId} to ${role}`);
      const response = await api.put(`/api/admin/users/${userId}/role`, { role });
      console.log('Role update response:', response.data);
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating user role:', error);
      
      // Try fallback endpoint if main one fails
      try {
        console.log('Trying fallback role update endpoint...');
        const fallbackResponse = await api.put(`/api/users/${userId}/role`, { role });
        console.log('Fallback role update response:', fallbackResponse.data);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Fallback role update also failed:', fallbackError);
        return handleError(error);
      }
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
  markItemForDonation: async (itemId) => {
    try {
      console.log(`Marking item ${itemId} for donation - simplified request`);
      const response = await api.post(`/api/items/${itemId}/donate`);
      return handleResponse(response);
    } catch (error) {
      console.error('Error marking item for donation:', error);
      return handleError(error);
    }
  },
  
  // Get donated items
  getDonatedItems: async () => {
    try {
      const response = await api.get('/api/admin/donated-items');
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching donated items:', error);
      
      // Fallback: filter from all items if endpoint doesn't exist
      try {
        const allItems = await adminApi.getAllItems();
        return allItems.filter(item => item.is_donated === 1 || item.is_donated === true);
      } catch (fallbackError) {
        console.error('Fallback for donated items also failed:', fallbackError);
        return [];
      }
    }
  }
};

export default api;