import axios from 'axios';

// Create a base API URL that can be easily changed
export const API_BASE_URL = 'http://localhost:5000';

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
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
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

// API methods for items
export const itemsApi = {
  // Get all items
  getAll: async () => {
    try {
      const response = await api.get('/items');
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
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
  
  // Submit a claim for an item
  submitClaim: async (itemId, claimData) => {
    try {
      const response = await api.post(`/api/items/${itemId}/claim`, claimData);
      return response.data;
    } catch (error) {
      console.error(`Error submitting claim for item ${itemId}:`, error);
      throw error;
    }
  }
};

export default api; 