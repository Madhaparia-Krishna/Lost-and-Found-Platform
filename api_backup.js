import axios from 'axios';

// API base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL;

// Create an axios instance with default configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for authentication
api.interceptors.request.use(
  config => {
    // Get the token from localStorage
    let token = null;
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        token = user.token;
      }
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
    }

    // If token exists, add it to the headers
    if (token) {
      console.log('Adding auth token to request:', config.url);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No auth token available for request:', config.url);
    }
    
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      console.error('Authentication error (401):', error.response.data);
      // You could trigger a logout or redirect to login here
    }
    
    // Handle network errors
    if (error.message === 'Network Error') {
      console.error('Network error detected. Server may be down or unreachable.');
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out. Server may be overloaded or unreachable.');
    }
    
    return Promise.reject(error);
  }
);

// Helper function to normalize API responses
export const normalizeResponse = (data) => {
  if (!data) return [];
  
  console.log('Normalizing API response:', data);
  
  // Handle case where data might be wrapped in an object
  if (Array.isArray(data)) {
    return data;
  } else if (data.items && Array.isArray(data.items)) {
    return data.items;
  } else if (data.data && Array.isArray(data.data)) {
    return data.data;
  } else if (data.results && Array.isArray(data.results)) {
    return data.results;
  } else if (data.found_items && Array.isArray(data.found_items)) {
    return data.found_items;
  } else if (data.lost_items && Array.isArray(data.lost_items)) {
    return data.lost_items;
  } else if (typeof data === 'object') {
    // If data is an object but doesn't have items array,
    // check if it has any array properties we can use
    const arrayProps = Object.keys(data).filter(key => 
      Array.isArray(data[key]) && 
      data[key].length > 0 && 
      typeof data[key][0] === 'object'
    );
    
    if (arrayProps.length > 0) {
      // Use the first array property found
      console.log(`Found array property in response: ${arrayProps[0]}`);
      return data[arrayProps[0]];
    }
    
    // If we still haven't found any arrays, check if the object itself is an item
    if (data.id && (data.title || data.name)) {
      console.log('Response appears to be a single item, wrapping in array');
      return [data];
    }
  }
  
  console.warn('Could not normalize response data:', data);
  // If we can't find any arrays, return empty array
  return [];
};

// Mock data for development
const mockItems = [
  {
    id: 1,
    name: 'iPhone 12 Pro',
    category: 'Electronics',
    description: 'Found an iPhone 12 Pro with black case',
    location: 'Library - 2nd Floor',
    date_found: '2023-06-15',
    image_url: 'https://images.unsplash.com/photo-1603891128711-11b4b03bb138?auto=format&fit=crop&w=300&h=200',
    status: 'found',
    user_id: 1
  },
  {
    id: 2,
    name: 'MacBook Pro',
    category: 'Electronics',
    description: 'MacBook Pro 13" with stickers on the cover',
    location: 'Student Center',
    date_found: '2023-06-10',
    image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?auto=format&fit=crop&w=300&h=200',
    status: 'found',
    user_id: 2
  },
  {
    id: 3,
    name: 'Blue Backpack',
    category: 'Bags',
    description: 'Blue Northface backpack with water bottle',
    location: 'Gym Entrance',
    date_found: '2023-06-18',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&h=200',
    status: 'found',
    user_id: 1
  },
  {
    id: 4,
    name: 'Car Keys',
    category: 'Keys',
    description: 'Lost my car keys with a blue keychain',
    location: 'Parking Lot B',
    date_lost: '2023-06-14',
    image_url: null,
    status: 'lost',
    user_id: 3
  },
  {
    id: 5,
    name: 'Textbook - Calculus',
    category: 'Books',
    description: 'Lost my calculus textbook, has my name inside the cover',
    location: 'Math Building',
    date_lost: '2023-06-12',
    image_url: 'https://images.unsplash.com/photo-1621944190310-e3cca1564bd7?auto=format&fit=crop&w=300&h=200',
    status: 'lost',
    user_id: 2
  }
];

// Handle response data
const handleResponse = (response) => response.data;

// Handle errors
const handleError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    throw new Error(error.response.data.message || 'Server error');
  } else if (error.request) {
    // The request was made but no response was received
    throw new Error('No response from server. Please check your internet connection.');
  } else {
    // Something happened in setting up the request that triggered an Error
    throw new Error('Request failed. Please try again.');
  }
};

// Use mock data in development mode
const useMockData = true;

// Items API
export const itemsApi = {
  // Get all items
  getAll: async () => {
    if (useMockData) {
      return mockItems;
    }
    
    try {
      const response = await axios.get('/items');
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get item by ID
  getById: async (itemId) => {
    if (useMockData) {
      const item = mockItems.find(item => item.id === parseInt(itemId));
      if (item) return item;
      throw new Error('Item not found');
    }
    
    try {
      const response = await axios.get(`/items/${itemId}`);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Create new item
  createItem: async (itemData, token) => {
    if (useMockData) {
      const newItem = {
        ...itemData,
        id: mockItems.length + 1,
        created_at: new Date().toISOString()
      };
      mockItems.push(newItem);
      return newItem;
    }
    
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post('/items', itemData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update item
  updateItem: async (itemId, itemData, token) => {
    if (useMockData) {
      const index = mockItems.findIndex(item => item.id === parseInt(itemId));
      if (index === -1) throw new Error('Item not found');
      
      mockItems[index] = { ...mockItems[index], ...itemData };
      return mockItems[index];
    }
    
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
    if (useMockData) {
      const index = mockItems.findIndex(item => item.id === parseInt(itemId));
      if (index === -1) throw new Error('Item not found');
      
      const deleted = mockItems.splice(index, 1)[0];
      return { success: true, deleted };
    }
    
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.delete(`/items/${itemId}`, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Report found item
  reportFound: async (itemData, token) => {
    if (useMockData) {
      const newItem = {
        ...itemData,
        id: mockItems.length + 1,
        status: 'found',
        date_found: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      mockItems.push(newItem);
      return newItem;
    }
    
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post('/items/found', itemData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Report lost item
  reportLost: async (itemData, token) => {
    if (useMockData) {
      const newItem = {
        ...itemData,
        id: mockItems.length + 1,
        status: 'lost',
        date_lost: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      mockItems.push(newItem);
      return newItem;
    }
    
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post('/items/lost', itemData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Claim item
  claimItem: async (itemId, claimData, token) => {
    if (useMockData) {
      const index = mockItems.findIndex(item => item.id === parseInt(itemId));
      if (index === -1) throw new Error('Item not found');
      
      mockItems[index] = { 
        ...mockItems[index], 
        status: 'requested',
        claimed_by: claimData.user_id,
        claim_date: new Date().toISOString().split('T')[0]
      };
      return mockItems[index];
    }
    
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post(`/items/${itemId}/claim`, claimData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Filter items
  filterItems: async (params) => {
    if (useMockData) {
      let filteredItems = [...mockItems];
      
      // Apply filters based on params
      if (params.status) {
        filteredItems = filteredItems.filter(item => item.status === params.status);
      }
      
      if (params.category) {
        filteredItems = filteredItems.filter(item => item.category === params.category);
      }
      
      if (params.location) {
        filteredItems = filteredItems.filter(item => 
          item.location.toLowerCase().includes(params.location.toLowerCase())
        );
      }
      
      if (params.date_after) {
        const dateAfter = new Date(params.date_after);
        filteredItems = filteredItems.filter(item => {
          const itemDate = new Date(item.date_found || item.date_lost);
          return itemDate >= dateAfter;
        });
      }
      
      return filteredItems;
    }
    
    try {
      const response = await axios.get('/items/filter', { params });
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
    if (useMockData) {
      // Mock login
      const { email, password } = credentials;
      
      // Simple validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Create mock user
      const user = {
        id: 1,
        name: email.split('@')[0], // Use part of email as name
        email,
        role: email.includes('admin') ? 'admin' : email.includes('security') ? 'security' : 'user',
        token: 'mock-jwt-token-' + Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString()
      };
      
      return user;
    }
    
    try {
      const response = await axios.post('/auth/login', credentials);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Register
  register: async (userData) => {
    if (useMockData) {
      // Mock registration
      const { name, email, password } = userData;
      
      // Simple validation
      if (!name || !email || !password) {
        throw new Error('Name, email and password are required');
      }
      
      // Create mock user
      const user = {
        id: Math.floor(Math.random() * 1000),
        name,
        email,
        role: 'user',
        token: 'mock-jwt-token-' + Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString()
      };
      
      return user;
    }
    
    try {
      const response = await axios.post('/auth/register', userData);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Get user profile
  getProfile: async (token) => {
    if (useMockData) {
      // Mock profile
      return {
        id: 1,
        name: 'Mock User',
        email: 'user@example.com',
        role: 'user',
        created_at: new Date().toISOString()
      };
    }
    
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('/auth/profile', config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },
  
  // Update user profile
  updateProfile: async (userData, token) => {
    if (useMockData) {
      // Mock profile update
      return {
        ...userData,
        id: 1,
        updated_at: new Date().toISOString()
      };
    }
    
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.put('/auth/profile', userData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// File upload API
export const uploadApi = {
  // Upload image
  uploadImage: async (file, token) => {
    if (useMockData) {
      // Mock file upload
      return {
        success: true,
        filename: 'mock-image-' + Math.random().toString(36).substring(2, 15) + '.jpg',
        url: 'https://picsum.photos/seed/' + Math.random() + '/300/200'
      };
    }
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : undefined
        }
      };
      
      const response = await axios.post('/upload/image', formData, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  }
};

// API methods for security operations
export const securityApi = {
  // Get pending found items awaiting approval
  getPendingItems: async () => {
    if (useMockData) {
      // Return mock pending items
      return mockItems
        .filter(item => item.status === 'found' && !item.is_approved)
        .map(item => ({
          ...item,
          is_approved: false
        }));
    }
    
    try {
      console.log('Fetching pending items for security review...');
      // Try the correct endpoint first
      try {
        const response = await api.get('/api/security/pending-items');
        console.log('Pending items received:', response.data);
        return normalizeResponse(response.data);
      } catch (err) {
        // If that fails, try an alternative endpoint
        console.log('First endpoint failed, trying alternative endpoint...');
        const response = await api.get('/security/pending-items');
        console.log('Pending items received from alternative endpoint:', response.data);
        return normalizeResponse(response.data);
      }
    } catch (error) {
      console.error('Error fetching pending items:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
      throw error;
    }
  },
  
  // Get pending claims awaiting approval
  getPendingClaims: async () => {
    try {
      console.log('Fetching pending claims for security review...');
      const response = await api.get('/api/security/pending-claims');
      console.log('Pending claims received:', response.data);
      return normalizeResponse(response.data);
    } catch (error) {
      console.error('Error fetching pending claims:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
      throw error;
    }
  },
  
  // Approve a found item
  approveItem: async (itemId) => {
    try {
      console.log(`Approving item ${itemId}...`);
      const response = await api.put(`/api/security/items/${itemId}/approve`);
      console.log(`Item ${itemId} approved successfully. Response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error approving item ${itemId}:`, error);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  },
  
  // Mark an item as received by security
  markItemReceived: async (itemId) => {
    try {
      console.log(`Marking item ${itemId} as received by security...`);
      const response = await api.put(`/api/security/items/${itemId}/receive`);
      console.log(`Item ${itemId} marked as received. Response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error marking item ${itemId} as received:`, error);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  },
  
  // Mark an item as returned to owner
  markItemReturned: async (itemId) => {
    try {
      console.log(`Marking item ${itemId} as returned to owner...`);
      const response = await api.put(`/api/security/items/${itemId}/return`);
      console.log(`Item ${itemId} marked as returned. Response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error marking item ${itemId} as returned:`, error);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  },
  
  // Reject a found item
  rejectItem: async (itemId) => {
    try {
      console.log(`Rejecting item ${itemId}...`);
      const response = await api.put(`/api/security/items/${itemId}/reject`);
      console.log(`Item ${itemId} rejected successfully. Response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error rejecting item ${itemId}:`, error);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  },
  
  // Process a claim (approve or reject)
  processClaim: async (claimId, action) => {
    try {
      console.log(`Processing claim ${claimId} with action: ${action}...`);
      const response = await api.put(`/api/security/claims/${claimId}/${action}`);
      console.log(`Claim ${claimId} ${action}ed successfully. Response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error processing claim ${claimId}:`, error);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  },
  
  // Get all items regardless of approval status (for security/admin only)
  getAllItems: async () => {
    try {
      console.log('Fetching all items for security/admin view...');
      // Try multiple endpoints in sequence
      try {
        const response = await api.get('/api/security/all-items');
        console.log('All items received from primary endpoint:', response.data);
        return normalizeResponse(response.data);
      } catch (err) {
        console.log('First endpoint failed, trying second endpoint...');
        try {
          const response = await api.get('/security/all-items');
          console.log('All items received from second endpoint:', response.data);
          return normalizeResponse(response.data);
        } catch (err2) {
          console.log('Second endpoint failed, trying third endpoint...');
          const response = await api.get('/items');
          console.log('All items received from third endpoint:', response.data);
          return normalizeResponse(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching all items:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
      throw error;
    }
  },
  
  // Approve a claim
  approveClaim: async (claimId) => {
    try {
      console.log(`Approving claim ${claimId}...`);
      return await securityApi.processClaim(claimId, 'approve');
    } catch (error) {
      console.error(`Error approving claim ${claimId}:`, error);
      throw error;
    }
  },
  
  // Reject a claim
  rejectClaim: async (claimId) => {
    try {
      console.log(`Rejecting claim ${claimId}...`);
      return await securityApi.processClaim(claimId, 'reject');
    } catch (error) {
      console.error(`Error rejecting claim ${claimId}:`, error);
      throw error;
    }
  }
};

export const notificationsApi = {
  // Get all notifications for the current user
  getAll: async () => {
    if (useMockData) {
      // Mock notifications
      return {
        notifications: [
          {
            id: 1,
            message: 'Your lost item has been found',
            is_read: false,
            created_at: new Date().toISOString(),
            item_id: 4
          },
          {
            id: 2,
            message: 'Your claim has been approved',
            is_read: true,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            item_id: 1
          }
        ]
      };
    }
    
    try {
      console.log('Fetching notifications...');
      // Try the correct endpoint first
      try {
        const response = await api.get('/api/notifications');
        console.log('Notifications received:', response.data);
        const notifications = normalizeResponse(response.data);
        return { notifications };
      } catch (err) {
        // If that fails, try an alternative endpoint
        console.log('First endpoint failed, trying alternative endpoint...');
        const response = await api.get('/notifications');
        console.log('Notifications received from alternative endpoint:', response.data);
        const notifications = normalizeResponse(response.data);
        return { notifications };
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
      throw error;
    }
  },
  
  // Mark a notification as read
  markAsRead: async (notificationId) => {
    if (useMockData) {
      return { success: true, message: 'Notification marked as read' };
    }
    
    try {
      console.log(`Marking notification ${notificationId} as read...`);
      // Try the correct endpoint first
      try {
        const response = await api.put(`/api/notifications/${notificationId}/read`);
        console.log(`Notification ${notificationId} marked as read. Response:`, response.data);
        return response.data;
      } catch (err) {
        // If that fails, try an alternative endpoint
        console.log('First endpoint failed, trying alternative endpoint...');
        const response = await api.put(`/notifications/${notificationId}/read`);
        console.log(`Notification ${notificationId} marked as read from alternative endpoint. Response:`, response.data);
        return response.data;
      }
    } catch (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  }
};

export default api;
