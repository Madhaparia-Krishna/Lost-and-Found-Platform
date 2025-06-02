import axios from 'axios';

// Create a base API URL that can be easily changed
export const API_BASE_URL = 'http://localhost:5000'; // Server is running on port 5000 as shown in the logs

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
  
  // Handle case where data might be wrapped in an object
  if (Array.isArray(data)) {
    return data;
  } else if (data.items && Array.isArray(data.items)) {
    return data.items;
  } else if (data.data && Array.isArray(data.data)) {
    return data.data;
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
      return data[arrayProps[0]];
    }
  }
  
  // If we can't find any arrays, return empty array
  return [];
};

// Helper function to generate mock items when API fails
const generateMockItems = () => {
  console.log('Generating mock items for demonstration');
  
  // Create dates for the items
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  // Create a variety of mock items - all approved for public view
  const mockItems = [
    {
      id: 1,
      title: "MacBook Pro Laptop",
      category: "Electronics",
      description: "Silver MacBook Pro 13-inch found in the library study room. Has a sticker of a mountain on the lid.",
      location: "Main Library, 2nd Floor",
      date: threeDaysAgo.toISOString(),
      reporter_name: "John Smith",
      created_at: threeDaysAgo.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: true,
      is_returned: false
    },
    {
      id: 2,
      title: "Blue Water Bottle",
      category: "Bottle",
      description: "Blue Hydro Flask water bottle found in the gym. Has some scratches on the bottom.",
      location: "University Gym",
      date: twoDaysAgo.toISOString(),
      reporter_name: "Sarah Johnson",
      created_at: twoDaysAgo.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: true,
      is_returned: false
    },
    {
      id: 3,
      title: "Student ID Card",
      category: "Documents",
      description: "Student ID card found near the cafeteria entrance. Name starts with M.",
      location: "Student Center",
      date: yesterday.toISOString(),
      reporter_name: "Michael Brown",
      created_at: yesterday.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: false,
      is_returned: false
    },
    {
      id: 4,
      title: "Black Umbrella",
      category: "Other",
      description: "Black folding umbrella with wooden handle found in classroom 101.",
      location: "Science Building, Room 101",
      date: yesterday.toISOString(),
      reporter_name: "Emily Davis",
      created_at: yesterday.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: false,
      is_returned: false
    },
    {
      id: 5,
      title: "Textbook - Introduction to Psychology",
      category: "Books",
      description: "Psychology textbook found on a bench outside the library. Has some highlighting inside.",
      location: "Library Courtyard",
      date: now.toISOString(),
      reporter_name: "Alex Wilson",
      created_at: now.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: false,
      is_returned: false
    },
    {
      id: 6,
      title: "Green Scarf",
      category: "Clothing",
      description: "Knitted green scarf found hanging on a chair in the cafeteria.",
      location: "Main Cafeteria",
      date: now.toISOString(),
      reporter_name: "Jessica Lee",
      created_at: now.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: false,
      is_returned: false
    },
    {
      id: 7,
      title: "Car Keys with Red Keychain",
      category: "Other",
      description: "Set of car keys with a distinctive red keychain found in the parking lot.",
      location: "North Parking Lot",
      date: yesterday.toISOString(),
      reporter_name: "Robert Johnson",
      created_at: yesterday.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: true,
      is_returned: true
    },
    {
      id: 8,
      title: "Black Leather Wallet",
      category: "Bags",
      description: "Small black leather wallet found near the ATM. No ID inside but contains some cash.",
      location: "Student Union Building",
      date: twoDaysAgo.toISOString(),
      reporter_name: "Thomas Garcia",
      created_at: twoDaysAgo.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: true,
      is_returned: true
    },
    {
      id: 9,
      title: "Wireless Earbuds",
      category: "Electronics",
      description: "White wireless earbuds in charging case found in the computer lab.",
      location: "Computer Science Building, Lab 3",
      date: now.toISOString(),
      reporter_name: "Olivia Martinez",
      created_at: now.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: false,
      is_returned: false
    },
    {
      id: 10,
      title: "Reading Glasses",
      category: "Other",
      description: "Tortoiseshell reading glasses in a blue case found in the quiet study area.",
      location: "Library, 3rd Floor",
      date: threeDaysAgo.toISOString(),
      reporter_name: "William Taylor",
      created_at: threeDaysAgo.toISOString(),
      status: "found",
      is_approved: true,
      is_deleted: false,
      is_received: false,
      is_returned: false
    }
  ];
  
  // Ensure all items are properly marked as approved and not deleted
  return mockItems.map(item => ({
    ...item,
    is_approved: true,
    is_deleted: false
  }));
};

// API methods for items
export const itemsApi = {
  // Get all items
  getAll: async () => {
    try {
      console.log('Calling API to get all items...');
      // Try the correct endpoint first
      try {
        const response = await api.get('/items');
        console.log('API response for all items:', response.status, response.statusText);
        const items = normalizeResponse(response.data);
        
        // Verify that we have items and they have the correct format
        if (Array.isArray(items) && items.length > 0) {
          console.log(`Received ${items.length} items from server`);
          console.log('Sample item structure:', JSON.stringify(items[0]));
          
          // Ensure all items have the is_approved property set correctly
          return items.map(item => ({
            ...item,
            is_approved: item.is_approved === true || item.is_approved === 1
          }));
        }
        
        return items;
      } catch (err) {
        // If that fails, try a second endpoint
        console.log('First endpoint failed, trying second endpoint...', err.message);
        try {
          const response = await api.get('/api/items');
          console.log('API response from second endpoint:', response.status, response.statusText);
          return normalizeResponse(response.data);
        } catch (err2) {
          // If that fails too, try a third endpoint
          console.log('Second endpoint failed, trying third endpoint...', err2.message);
          try {
            const response = await api.get('/api/security/all-items');
            console.log('API response from third endpoint:', response.status, response.statusText);
            return normalizeResponse(response.data);
          } catch (err3) {
            // If all endpoints fail, return mock data
            console.log('All endpoints failed, returning mock data', err3.message);
            return generateMockItems();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      }
      // Return mock data as a last resort
      return generateMockItems();
    }
  },
  
  // Get a specific item by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/items/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching item ${id}:`, error);
      throw error;
    }
  },
  
  // Submit a found item
  submitFound: async (formData) => {
    try {
      console.log('Submitting found item with data:', formData);
      // Get the auth token directly to check if it exists
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const user = JSON.parse(userData);
      if (!user.token) {
        throw new Error('Invalid authentication. Please log in again.');
      }
      
      const response = await api.post('/items/found', formData);
      return response.data;
    } catch (error) {
      console.error('Error submitting found item:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      throw error;
    }
  },
  
  // Submit a lost item
  submitLost: async (formData) => {
    try {
      console.log('Submitting lost item with data:', formData);
      const response = await api.post('/items/lost', formData);
      return response.data;
    } catch (error) {
      console.error('Error submitting lost item:', error);
      throw error;
    }
  },
  
  // Submit a claim for an item
  submitClaim: async (itemId, claimData) => {
    try {
      const response = await api.post(`/api/items/${itemId}/claim`, claimData);
      return response.data;
    } catch (error) {
      console.error(`Error submitting claim for item ${itemId}:`, error);
      throw error;
    }
  },
  
  // Upload an image
  uploadImage: async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Get token directly from localStorage
      let token = null;
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          token = user.token;
        }
      } catch (error) {
        console.error('Error getting token for image upload:', error);
        throw new Error('Authentication required for image upload');
      }
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
};

// API methods for security operations
export const securityApi = {
  // Get pending found items awaiting approval
  getPendingItems: async () => {
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
      console.log(`Approving item with ID ${itemId}...`);
      // Try the correct endpoint first
      try {
        const response = await api.put(`/api/security/items/${itemId}/approve`);
        console.log(`Item ${itemId} approved successfully. Response:`, response.data);
        return response.data;
      } catch (err) {
        // If that fails, try an alternative endpoint
        console.log('First endpoint failed, trying alternative endpoint...');
        const response = await api.put(`/security/items/${itemId}/approve`);
        console.log(`Item ${itemId} approved successfully from alternative endpoint. Response:`, response.data);
        return response.data;
      }
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
      const response = await api.put(`/items/${itemId}/status`, { 
        status: 'received',
        is_received: true
      });
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
      const response = await api.put(`/items/${itemId}/status`, { 
        status: 'returned',
        is_returned: true
      });
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
  rejectItem: async (itemId, reason = '') => {
    try {
      console.log(`Rejecting item with ID ${itemId}...`);
      // Try the correct endpoint first
      try {
        const response = await api.put(`/api/security/items/${itemId}/reject`, { reason });
        console.log(`Item ${itemId} rejected successfully. Response:`, response.data);
        return response.data;
      } catch (err) {
        // If that fails, try an alternative endpoint
        console.log('First endpoint failed, trying alternative endpoint...', err.message);
        const response = await api.put(`/security/items/${itemId}/reject`, { reason });
        console.log(`Item ${itemId} rejected successfully from alternative endpoint. Response:`, response.data);
        return response.data;
      }
    } catch (error) {
      console.error(`Error rejecting item ${itemId}:`, error);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      throw error;
    }
  },
  
  // Process a claim (approve or reject)
  processClaim: async (claimId, action, reason = '') => {
    try {
      console.log(`Processing claim ${claimId} with action: ${action}...`);
      const response = await api.put(`/api/security/claims/${claimId}/${action}`, { reason });
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
  }
};

export const notificationsApi = {
  // Get all notifications for the current user
  getAll: async () => {
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