import React, { useState, useEffect, useContext, useCallback } from 'react';
import { itemsApi, API_BASE_URL } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/dashboard/RequestedItems.css';

const RequestedItems = () => {
  const { currentUser } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";

  const fetchItems = useCallback(async () => {
    if (!currentUser) {
      console.log("No current user, cannot fetch requested items");
      return;
    }
    
    console.log("Fetching requested items for user:", currentUser.id, typeof currentUser.id);
    
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
      
      // TEMPORARY: For testing, show any items regardless of claimed_by status
      const userRequestedItems = allItems.filter(item => {
        // Compare claimed_by as numbers to handle string/number mismatches
        const claimedBy = item.claimed_by === undefined ? 0 : Number(item.claimed_by);
        const currentUserId = Number(currentUser.id);
        
        // For testing, use looser conditions to see all relevant items
        // const isRequested = item.status === 'requested';
        // const isUserClaimer = claimedBy === currentUserId;
        const isNotDeleted = item.is_deleted !== true && item.is_deleted !== 1 && item.is_deleted !== '1';
        
        console.log(`Item ${item.id}: status=${item.status}, claimed_by=${item.claimed_by} (${typeof item.claimed_by}), currentUser.id=${currentUser.id} (${typeof currentUser.id}), claimedBy=${claimedBy}, currentUserId=${currentUserId}, isUserClaimer=${claimedBy === currentUserId}`);
        
        // TEMPORARY: For testing, show any items with a status of 'requested'
        // return isRequested && isUserClaimer && isNotDeleted;
        return item.status === 'requested' && isNotDeleted;
      });
      
      console.log("Items with 'requested' status:", userRequestedItems.length);
      
      // Log the actual found requested items
      if (userRequestedItems.length > 0) {
        console.log("Requested items details:", userRequestedItems);
      }
      
      setItems(userRequestedItems);
    } catch (error) {
      console.error('Error fetching requested items:', error);
      setError('Error fetching requested items: ' + (error.message || 'Unknown error'));
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
          <i className="fas fa-hand-paper"></i>
        </div>
        <h3>No Requested Items</h3>
        <p>You haven't requested any items yet. Browse found items to submit a claim.</p>
      </div>
    );
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-requested';
    }
  };

  // Format claim status
  const formatClaimStatus = (item) => {
    if (item.claim_status) {
      return item.claim_status.charAt(0).toUpperCase() + item.claim_status.slice(1);
    }
    return 'Pending';
  };

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Requested Items</h1>
      <p className="page-description">
        This page shows all the items you have claimed. Security staff will review your requests and update 
        their status. Approved claims will be ready for pickup at the security office.
      </p>

      {loading ? (
        <LoadingSpinner message="Loading your requested items..." />
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
              <div className={`item-status ${getStatusClass(item.claim_status)}`}>
                {formatClaimStatus(item)}
              </div>
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
                <div className="item-meta">
                  <i className="fas fa-tag"></i> {item.category || 'Uncategorized'}
                </div>
                <div className="item-meta">
                  <i className="fas fa-map-marker-alt"></i> {item.location || 'Location not specified'}
                </div>
                <div className="item-meta">
                  <i className="fas fa-calendar-alt"></i> Claimed: {item.date ? new Date(item.date).toLocaleDateString() : 'Date not specified'}
                </div>
                {item.claim_notes && (
                  <div className="claim-notes">
                    <h4>Your Claim Details:</h4>
                    <p>{item.claim_notes}</p>
                  </div>
                )}
                {item.security_notes && (
                  <div className="security-notes">
                    <h4>Security Notes:</h4>
                    <p>{item.security_notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestedItems; 