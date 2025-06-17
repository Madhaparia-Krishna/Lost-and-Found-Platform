import React, { useState, useEffect, useContext, useCallback } from 'react';
import { itemsApi, API_BASE_URL } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/dashboard/LostItems.css';

const LostItems = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";

  const fetchItems = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch only lost items using the status parameter
      const lostItems = await itemsApi.getAll('lost');
      
      if (!Array.isArray(lostItems)) {
        setError("Data format error: Expected array of items");
        setLoading(false);
        return;
      }
      
      // Filter for items that the current user has reported
      const userItems = lostItems.filter(item => {
        // Compare user_id as numbers to handle string/number mismatches
        const userId = item.user_id === undefined ? 0 : Number(item.user_id);
        const currentUserId = Number(currentUser.id);
        
        // Items should be user's lost items
        const isUserOwner = userId === currentUserId;
        const isNotDeleted = item.is_deleted !== true && item.is_deleted !== 1 && item.is_deleted !== '1';
        
        return isUserOwner && isNotDeleted;
      });
      
      setItems(userItems);
    } catch (error) {
      setError('Error fetching items: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearch = (e) => {
    e.preventDefault();
    // No need to reload all items, just filter the existing ones
  };

  const getFilteredItems = () => {
    return items.filter(item => {
      // Filter by search term
      const matchesSearch = searchTerm === '' || 
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by category
      const matchesCategory = selectedCategory === '' || 
        (item.category && item.category === selectedCategory);
      
      return matchesSearch && matchesCategory;
    });
  };

  // Handle item deletion
  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      try {
        await itemsApi.deleteItem(itemId);
        
        // Update local state
        setItems(items.filter(item => item.id !== itemId));
        
      } catch (error) {
        console.error('Error deleting item:', error);
        setError(`Failed to remove item: ${error.message}`);
      }
    }
  };

  // Navigate to report lost item form
  const navigateToReportLostItem = () => {
    navigate('/report-lost');
  };

  // Navigate to edit item form
  const navigateToEditItem = (itemId) => {
    navigate(`/edit-item/${itemId}`);
  };

  // Render empty state
  const renderEmptyState = () => {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <i className="fas fa-question-circle"></i>
        </div>
        <h3>No Lost Items</h3>
        <p>You haven't reported any lost items yet. When you lose something, report it here.</p>
        <button className="primary-btn" onClick={navigateToReportLostItem}>
          <i className="fas fa-plus"></i> Report Lost Item
        </button>
      </div>
    );
  };

  // Format match status badge
  const formatMatchStatus = (item) => {
    if (item.has_match) {
      return (
        <div className="item-badge matched">
          <i className="fas fa-check-circle"></i> Potential Match Found
        </div>
      );
    } else {
      return (
        <div className="item-badge unmatched">
          <i className="fas fa-search"></i> No Matches Yet
        </div>
      );
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Your Lost Items</h1>
        <button className="primary-btn" onClick={navigateToReportLostItem}>
          <i className="fas fa-plus"></i> Report Lost Item
        </button>
      </div>

      <div className="search-filters">
        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Search by name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="form-group">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Documents">Documents</option>
              <option value="Books">Books</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button type="submit" className="search-btn">
            <i className="fas fa-search"></i> Search
          </button>
        </form>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading your lost items..." />
      ) : error ? (
        <div className="error-state">
          <div className="error-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h3>Error Loading Items</h3>
          <p>{error}</p>
          <button onClick={fetchItems} className="retry-btn">
            <i className="fas fa-sync-alt"></i> Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="items-grid">
          {getFilteredItems().map(item => (
            <div key={item.id} className="item-card">
              <div className="item-image">
                {item.image ? (
                  <img 
                    src={item.image.startsWith('http') ? item.image : `${API_BASE_URL}/uploads/${item.image}`} 
                    alt={item.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      console.log(`Failed to load image: ${e.target.src}`);
                      e.target.src = fallbackImageSrc;
                    }}
                  />
                ) : (
                  <div className="no-image">No Image Available</div>
                )}
              </div>
              <div className="item-details">
                <h3>{item.title}</h3>
                <div className="item-actions">
                  <button 
                    className="view-button"
                    onClick={() => navigateToEditItem(item.id)}
                  >
                    Edit
                  </button>
                  <button 
                    className="request-button"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LostItems; 