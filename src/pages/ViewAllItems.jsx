import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { itemsApi, API_BASE_URL } from '../utils/api';
import '../styles/ViewAllItems.css';
import { Modal, Button, Card, Container, Row, Col, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import ItemModal from '../components/ItemModal';

const ViewAllItems = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
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
  const [showModal, setShowModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
        setActionStatus({
          type: 'info',
          message: 'No approved items found. Items must be approved by security staff before appearing here.'
        });
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
        // Exclude lost items from the view
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
      
      // Show message if no items match the criteria
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

  // Handle opening the modal with the selected item
  const openItemModal = (itemId) => {
    setSelectedItemId(itemId);
    setShowModal(true);
  };

  // Handle closing the modal
  const closeItemModal = () => {
    setShowModal(false);
    setSelectedItemId(null);
  };

  // Handle requesting an item (callback for ItemModal)
  const handleRequestItem = async (itemId) => {
    try {
      // Update the item status locally
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, status: 'requested' } 
            : item
        )
      );
      
      // Show success message
      setActionStatus({
        type: 'success',
        message: 'Item requested successfully. The security team will review your request.'
      });
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error requesting item:', error);
      setActionStatus({
        type: 'error',
        message: 'Failed to request item. Please try again.'
      });
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    if (currentUser && currentUser.logout) {
      currentUser.logout();
    }
    navigate('/login');
  };
  
  // Get filtered items based on active tab
  const filteredItems = getFilteredItems();

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading items...</p>
      </div>
    );
  }

  if (error && !error.includes('Using sample data')) {
    return (
      <div className="error-state">
        <div className="error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Error Loading Items</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={handleRefresh}>
          <i className="fas fa-sync-alt"></i> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-brand">
          <Link to="/" className="brand-link">Lost@Campus</Link>
        </div>
        
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <i className={mobileMenuOpen ? "fas fa-times" : "fas fa-bars"}></i>
        </button>
        
        <nav className={`dashboard-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="nav-section main-nav">
            <Link to="/dashboard/found" className="nav-link">
              <i className="fas fa-search"></i> Found Items
            </Link>
            <Link to="/dashboard/lost" className="nav-link">
              <i className="fas fa-question-circle"></i> Lost Items
            </Link>
            <Link to="/" className="nav-link active">
              <i className="fas fa-list"></i> All Items
            </Link>
          </div>
          
          <div className="nav-section actions-nav">
            <Link to="/found" className="action-btn">
              <i className="fas fa-plus-circle"></i> Report Found
            </Link>
            <Link to="/lost" className="action-btn">
              <i className="fas fa-plus-circle"></i> Report Lost
            </Link>
          </div>
          
          {currentUser ? (
            <div className="nav-section user-nav">
              {(currentUser.role === 'security' || currentUser.role === 'admin') && (
                <Link to="/security" className="admin-link">
                  <i className="fas fa-shield-alt"></i>
                  <span className="link-text">Security</span>
                </Link>
              )}
              {currentUser.role === 'admin' && (
                <Link to="/admin" className="admin-link">
                  <i className="fas fa-cog"></i>
                  <span className="link-text">Admin</span>
                </Link>
              )}
              <div className="user-dropdown">
                <div className="user-info">
                  <div className="avatar">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="username">{currentUser.name || currentUser.email}</span>
                  <i className="fas fa-chevron-down"></i>
                </div>
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item">
                    <i className="fas fa-user"></i> Profile
                  </Link>
                  <button onClick={handleLogout} className="dropdown-item">
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="nav-section auth-nav">
              <Link to="/login" className="auth-link">Login</Link>
              <Link to="/register" className="auth-link register">Register</Link>
            </div>
          )}
        </nav>
      </header>
      
      <main className="dashboard-main">
        <div className="page-header">
          <h1>Found Items</h1>
          <div className="header-actions">
            {currentUser && (
              <Link to="/forms/report-found" className="report-btn">
                <i className="fas fa-plus"></i> Report Found Item
              </Link>
            )}
            <button className="refresh-btn" onClick={handleRefresh}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
        
        {/* Info Banner */}
        <div className="info-banner">
          <p>This page displays only items that have been approved by security staff. If you've reported an item that's not visible here, it may still be pending approval.</p>
          {currentUser && currentUser.role === 'security' && (
            <p>Security staff: To approve pending items, please visit the <Link to="/security">Security Dashboard</Link>.</p>
          )}
        </div>
        
        {/* Action Status */}
        {actionStatus && (
          <div className={`action-status ${actionStatus.type}`}>
            {actionStatus.message}
          </div>
        )}
        
        {/* Search Form */}
        <div className="search-filters">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="form-group">
              <input
                type="text"
                name="search"
                placeholder="Search items..."
                defaultValue={searchParams.search}
                className="search-input"
              />
            </div>
            <div className="form-group">
              <select 
                name="category" 
                defaultValue={searchParams.category}
                className="search-input"
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
            </div>
            <button type="submit" className="search-btn">
              <i className="fas fa-search"></i> Search
            </button>
            <button type="button" className="search-btn refresh-btn" onClick={handleRefresh}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </form>
        </div>
        
        {/* Filter Tabs */}
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
        
        {/* Items Grid */}
        <div className="dashboard-content">
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-search"></i>
              </div>
              <h3>No Items Found</h3>
              <p>
                {searchParams.search || searchParams.category ? 
                  "No items match your search criteria. Try different keywords or filters." : 
                  "No approved items available at the moment. Check back later."}
              </p>
              {(searchParams.search || searchParams.category) && (
                <button className="primary-btn" onClick={() => setSearchParams({ search: '', category: '' })}>
                  <i className="fas fa-times"></i> Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="items-square-grid">
              {filteredItems.map(item => (
                <div 
                  key={item.id || Math.random()} 
                  className="square-item" 
                  onClick={() => openItemModal(item.id)}
                >
                  <div className={`item-badge status-${item.status}`}>
                    {item.status === 'found' ? 'Found' : 
                     item.status === 'requested' ? 'Requested' : 
                     item.status === 'received' ? 'Received' : 'Unknown'}
                  </div>
                  
                  <div className="square-image">
                    {item.image && !imageErrors[item.id] ? (
                      <img 
                        src={`${API_BASE_URL}/uploads/${item.image}`}
                        alt={item.title || 'Found Item'}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImageSrc;
                          handleImageError(item.id);
                        }}
                      />
                    ) : (
                      <div className="no-image">
                        <i className="fas fa-image"></i>
                      </div>
                    )}
                  </div>
                  
                  <div className="square-info">
                    <h3>{item.title || 'Untitled Item'}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Item Detail Modal using the enhanced ItemModal component */}
      {showModal && selectedItemId && (
        <ItemModal
          itemId={selectedItemId}
          onClose={closeItemModal}
          onRequestItem={handleRequestItem}
          refreshItems={handleRefresh}
        />
      )}
    </div>
  );
};

export default ViewAllItems; 