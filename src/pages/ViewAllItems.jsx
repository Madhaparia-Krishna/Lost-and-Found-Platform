import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { itemsApi, API_BASE_URL } from '../utils/api';
import '../styles/ViewAllItems.css';

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
  const [activeTab, setActiveTab] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionStatus, setActionStatus] = useState(null);
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";
  
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
      setActionStatus(null);
      
      // Log the fetch attempt
      console.log('Fetching items from server...');
      
      // Use the API utility for better error handling
      const itemsArray = await itemsApi.getAll();
      console.log('All items received:', itemsArray.length);
      
      // Check if data is in the expected format
      if (!itemsArray || itemsArray.length === 0) {
        console.log('No items received from server');
        setItems([]);
        return;
      }
      
      console.log('Sample item:', itemsArray[0]);
      
      // Filter to only show approved found items
      let filteredItems = itemsArray.filter(item => {
        // Log each item's approval status for debugging
        console.log(`Item ${item.id || 'unknown'}: title=${item.title}, status=${item.status}, approved=${item.is_approved === true ? 'true' : 'false'}, deleted=${item.is_deleted === true ? 'true' : 'false'}`);
        
        // Strict check to ensure item is approved
        const isApproved = item.is_approved === true;
        
        // Check for valid status (found, requested, received)
        const hasValidStatus = item.status === 'found' || item.status === 'requested' || item.status === 'received';
        
        // Ensure item is not deleted
        const isNotDeleted = item.is_deleted !== true;
        
        // Only return true if all conditions are met
        return isApproved && hasValidStatus && isNotDeleted;
      });
      
      console.log('Filtered approved items:', filteredItems.length);
      
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
      
      // Check if we're using mock data by looking at the first item's ID
      // Real data from the database would likely have different ID patterns
      if (filteredItems.length === 0) {
        setActionStatus({
          type: 'info',
          message: 'No approved items found. Items must be approved by security staff before appearing here.'
        });
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Server may be down or overloaded.');
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and ensure the server is running.');
      } else {
        setError(`Error fetching items: ${err.message || 'Unknown error'}`);
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch items when search parameters change or refresh is triggered
  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, refreshTrigger]);

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
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Filter items based on active tab
  const getFilteredItems = () => {
    if (activeTab === 'all') {
      return items;
    } else if (activeTab === 'electronics') {
      return items.filter(item => item.category === 'Electronics');
    } else if (activeTab === 'documents') {
      return items.filter(item => item.category === 'Documents');
    } else if (activeTab === 'clothing') {
      return items.filter(item => item.category === 'Clothing');
    } else {
      return items.filter(item => 
        item.category !== 'Electronics' && 
        item.category !== 'Documents' && 
        item.category !== 'Clothing'
      );
    }
  };
  
  // Get filtered items based on active tab
  const filteredItems = getFilteredItems();

  // Render error message
  const renderErrorMessage = (errorMsg) => {
    if (!errorMsg) return null;
    
    return (
      <div className="section-error">
        <p>{errorMsg}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  if (error && !error.includes('Using sample data')) {
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
    <div className="view-all-items-container">
      <div className="page-header">
        <h1>Found Items</h1>
        {currentUser && (
          <div className="user-info">
            <span>Logged in as: {currentUser.name || currentUser.email}</span>
            <span className="role-badge">{currentUser.role}</span>
          </div>
        )}
        <div className="navigation-menu">
          <Link to="/" className="menu-link">Home</Link>
          <Link to="/found" className="menu-link">Report Found Item</Link>
          <Link to="/lost" className="menu-link">Report Lost Item</Link>
          {currentUser && currentUser.role === 'security' && (
            <Link to="/security" className="menu-link">Security Dashboard</Link>
          )}
          {currentUser && currentUser.role === 'admin' && (
            <Link to="/admin" className="menu-link admin-link">Admin Panel</Link>
          )}
        </div>
      </div>
      
      <div className="info-banner">
        <p>This page displays only items that have been approved by security staff. If you've reported an item that's not visible here, it may still be pending approval.</p>
        {currentUser && currentUser.role === 'security' && (
          <p>Security staff: To approve pending items, please visit the <Link to="/security">Security Dashboard</Link>.</p>
        )}
      </div>
      
      {actionStatus && (
        <div className={`action-status ${actionStatus.type}`}>
          {actionStatus.message}
        </div>
      )}
      
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
      
      <div className="filter-tabs">
        <button
          className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Items ({items.length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'electronics' ? 'active' : ''}`}
          onClick={() => setActiveTab('electronics')}
        >
          Electronics ({items.filter(item => item.category === 'Electronics').length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          Documents ({items.filter(item => item.category === 'Documents').length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'clothing' ? 'active' : ''}`}
          onClick={() => setActiveTab('clothing')}
        >
          Clothing ({items.filter(item => item.category === 'Clothing').length})
        </button>
        <button
          className={`filter-tab ${activeTab === 'other' ? 'active' : ''}`}
          onClick={() => setActiveTab('other')}
        >
          Other ({items.filter(item => 
            item.category !== 'Electronics' && 
            item.category !== 'Documents' && 
            item.category !== 'Clothing'
          ).length})
        </button>
      </div>
      
      {filteredItems.length === 0 ? (
        <div className="no-items-message">
          {searchParams.search || searchParams.category ? 
            "No items match your search criteria" : 
            "No approved items available at the moment. Check back later."}
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map(item => (
            <div key={item.id || Math.random()} className="item-card approved-item-card">
              {item.image && !imageErrors[item.id] ? (
                <div className="item-image">
                  <img 
                    src={`${API_BASE_URL}/uploads/${item.image}`} 
                    alt={item.title || 'Found Item'}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = fallbackImageSrc;
                      handleImageError(item.id);
                    }}
                  />
                </div>
              ) : (
                <div className="item-image">
                  <img 
                    src={fallbackImageSrc}
                    alt={item.title || 'Found Item'}
                  />
                </div>
              )}
              <div className="item-details">
                <div className="status-badge found">{item.status === 'found' ? 'Found' : item.status === 'requested' ? 'Requested' : item.status === 'received' ? 'Received' : 'Unknown'}</div>
                <h3>{item.title || 'Untitled Item'}</h3>
                <p className="category">{item.category || 'Uncategorized'}</p>
                <p className="description">{item.description || 'No description provided'}</p>
                <p className="reporter">Reported by: {item.reporter_name || 'Anonymous'}</p>
                <p className="report-date">Date: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}</p>
                
                {/* Only security and admin users can see location and specific date */}
                {hasSecurityAccess && (
                  <div className="security-details">
                    <p className="location"><strong>Location:</strong> {item.location || 'Not specified'}</p>
                    {item.date && (
                      <p className="found-date">
                        <strong>Found on:</strong> {new Date(item.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="item-actions">
                  {currentUser && (
                    <button 
                      className="claim-button"
                      onClick={() => window.location.href = `/claim/${item.id}`}
                    >
                      Request This Item
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