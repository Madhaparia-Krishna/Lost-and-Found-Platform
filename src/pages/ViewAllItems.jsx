import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/ViewAllItems.css';
import axios from 'axios';

// Create a base API URL that can be easily changed
const API_BASE_URL = 'http://localhost:5000';

const ViewAllItems = () => {
  const { currentUser } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [searchParams, setSearchParams] = useState({
    search: '',
    category: ''
  });
  
  // Get search parameters from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const category = urlParams.get('category') || '';
    
    if (search || category) {
      setSearchParams({ search, category });
    }
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Log the fetch attempt
      console.log('Fetching items from server...');
      
      // Fetch items from API with authorization header if logged in
      const config = {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };
      
      if (currentUser?.token) {
        config.headers.Authorization = `Bearer ${currentUser.token}`;
      }
      
      // Add timeout to prevent hanging requests
      const response = await axios.get(`${API_BASE_URL}/items`, {
        ...config,
        timeout: 10000 // 10 seconds timeout
      });
      
      console.log('Response received:', response);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }

      console.log('All items:', response.data);
      
      // Filter to only show found items (removed approval requirement temporarily to see all items)
      let filteredItems = response.data.filter(item => 
        item.status === 'found' && !item.is_deleted
      );
      
      console.log('Filtered found items:', filteredItems);
      
      // Apply search filters if present
      if (searchParams.search) {
        const searchTerm = searchParams.search.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.title?.toLowerCase().includes(searchTerm) || 
          (item.description && item.description.toLowerCase().includes(searchTerm))
        );
      }
      
      if (searchParams.category) {
        filteredItems = filteredItems.filter(item => 
          item.category === searchParams.category
        );
      }
      
      setItems(filteredItems);
    } catch (err) {
      console.error('Error fetching items:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Server may be down or overloaded.');
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and ensure the server is running.');
      } else {
        setError(err.message || 'Error fetching items');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch items when search parameters change
  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleImageError = (itemId) => {
    setImageErrors(prev => ({
      ...prev,
      [itemId]: true
    }));
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({
      search: e.target.search.value,
      category: e.target.category.value
    });
  };
  
  // Check if user has security/admin access
  const hasSecurityAccess = currentUser && 
    (currentUser.role === 'security' || currentUser.role === 'admin');

  // Refresh button to reload items
  const handleRefresh = () => {
    fetchItems();
  };

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button className="refresh-btn" onClick={handleRefresh}>Try Again</button>
        <div className="error-help">
          <p>Troubleshooting tips:</p>
          <ul>
            <li>Check if the server is running</li>
            <li>Ensure you're connected to the internet</li>
            <li>The server might be using a different port (currently trying port 5000)</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="view-all-items">
      <h1>Found Items</h1>
      
      <div className="search-form-container">
        <form className="search-form" onSubmit={handleSearch}>
          <input 
            type="text" 
            name="search" 
            placeholder="Search items..." 
            defaultValue={searchParams.search}
          />
          <select 
            name="category" 
            defaultValue={searchParams.category}
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Books">Books</option>
            <option value="Bags">Bags</option>
            <option value="Documents">Documents</option>
            <option value="Bottle">Bottle</option>
            <option value="Other">Other</option>
          </select>
          <button type="submit">Search</button>
          <button type="button" className="refresh-btn" onClick={handleRefresh}>Refresh</button>
        </form>
      </div>
      
      {items.length === 0 ? (
        <div className="no-items-message">
          {searchParams.search || searchParams.category ? 
            "No items match your search criteria" : 
            "No found items available at the moment"}
        </div>
      ) : (
        <div className="items-grid">
          {items.map(item => (
            <div key={item.id || Math.random()} className="item-card">
              {item.image && !imageErrors[item.id] ? (
                <div className="item-image">
                  <img 
                    src={`${API_BASE_URL}/uploads/${item.image}`} 
                    alt={item.title || 'Found Item'}
                    onError={() => handleImageError(item.id)}
                  />
                </div>
              ) : (
                <div className="item-image item-no-image">
                  <div className="placeholder-text">
                    {item.image ? `Image could not be loaded` : 'No image available'}
                  </div>
                </div>
              )}
              <div className="item-details">
                <h3>{item.title || 'Untitled Item'}</h3>
                <p className="item-category">{item.category || 'Uncategorized'}</p>
                <p className="item-description">{item.description || 'No description provided'}</p>
                <p className="item-reporter">Reported by: {item.reporter_name || 'Anonymous'}</p>
                <p className="item-date">Date: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}</p>
                
                {item.is_approved === false && (
                  <p className="item-approval-status">Approval Status: Pending</p>
                )}
                
                {/* Show location/specific date only for security and admin users */}
                {hasSecurityAccess && (
                  <div className="security-details">
                    <p className="item-location">Location: {item.location || 'Not specified'}</p>
                    {item.date && (
                      <p className="item-found-date">
                        Found on: {new Date(item.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="item-actions">
                  {currentUser && (
                    <button 
                      className="claim-btn"
                      onClick={() => window.location.href = `/claim/${item.id}`}
                    >
                      Claim This Item
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewAllItems; 