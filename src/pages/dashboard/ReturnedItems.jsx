import React, { useState, useEffect, useContext, useCallback } from 'react';
import { itemsApi, API_BASE_URL } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/dashboard/ReturnedItems.css';

const ReturnedItems = () => {
  const { currentUser } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";

  const fetchItems = useCallback(async () => {
    if (!currentUser) {
      console.log("No current user, cannot fetch returned items");
      return;
    }
    
    console.log("Fetching returned items for user:", currentUser.id, typeof currentUser.id);
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all items
      const allItems = await itemsApi.getAll();
      console.log("All items fetched:", allItems.length);
      
      if (!Array.isArray(allItems)) {
        console.error("Expected array of items but got:", typeof allItems);
        setError("Data format error: Expected array of items");
        setLoading(false);
        return;
      }
      
      // Log full items data to inspect structure
      console.log("Full items data (first item):", allItems.length > 0 ? allItems[0] : "No items");
      
      // TEMPORARY: For testing, show all user's items, including 'received' status
      const userReturnedItems = allItems.filter(item => {
        // Compare user_id and claimed_by as numbers to handle string/number mismatches
        const userId = item.user_id === undefined ? 0 : Number(item.user_id);
        const claimedBy = item.claimed_by === undefined ? 0 : Number(item.claimed_by);
        const currentUserId = Number(currentUser.id);
        
        // For testing, include both 'returned' and 'received' status
        const isRelevantStatus = item.status === 'returned' || item.status === 'received';
        const isUserInvolved = userId === currentUserId || claimedBy === currentUserId;
        const isNotDeleted = item.is_deleted !== true && item.is_deleted !== 1 && item.is_deleted !== '1';
        
        console.log(`Item ${item.id}: status=${item.status}, user_id=${item.user_id} (${typeof item.user_id}), claimed_by=${item.claimed_by} (${typeof item.claimed_by}), currentUser.id=${currentUser.id} (${typeof currentUser.id}), userId=${userId}, claimedBy=${claimedBy}, currentUserId=${currentUserId}, isUserInvolved=${isUserInvolved}`);
        
        // TEMPORARY: For testing, show all items with 'returned' or 'received' status
        // Original: return isReturned && isUserInvolved && isNotDeleted;
        return isRelevantStatus && isNotDeleted;
      });
      
      console.log("Items with 'returned' or 'received' status:", userReturnedItems.length);
      
      // Log the actual found returned items
      if (userReturnedItems.length > 0) {
        console.log("Returned items details:", userReturnedItems);
      }
      
      setItems(userReturnedItems);
    } catch (error) {
      console.error('Error fetching returned items:', error);
      setError('Error fetching returned items: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Render empty state
  const renderEmptyState = () => {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <i className="fas fa-box-open"></i>
        </div>
        <h3>No Returned Items</h3>
        <p>You don't have any items that have been returned to their owners yet.</p>
      </div>
    );
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not specified';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Returned Items</h1>

      {loading ? (
        <LoadingSpinner message="Loading your returned items..." />
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
          {items.map(item => (
            <div key={item.id} className="item-card">
              <div className="item-image">
                {item.image ? (
                  <img 
                    src={item.image.startsWith('http') ? item.image : `${API_BASE_URL}/uploads/${item.image}`} 
                    alt={item.title}
                    onError={(e) => {
                      e.target.onerror = null;
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
                  <button className="view-button">View Details</button>
                  <button className="request-button" disabled>
                    Returned
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

export default ReturnedItems; 