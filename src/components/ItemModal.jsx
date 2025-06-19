import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { itemsApi, API_BASE_URL } from '../utils/api';
import '../styles/ItemModal.css';
import Image from './Image';
import axios from 'axios';
import { Button, Spinner, Alert } from 'react-bootstrap';

const ItemModal = ({ itemId, onClose, onRequestItem, refreshItems }) => {
  const { currentUser } = useContext(AuthContext);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState(null);
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";
  
  useEffect(() => {
    fetchItem();
  }, [itemId]);
  
  const fetchItem = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the specific item by ID
      const fetchedItem = await itemsApi.getItemById(itemId);
      
      if (!fetchedItem) {
        throw new Error('Item not found');
      }
      
      // Ensure image path is correctly formatted
      if (fetchedItem.image) {
        // If it's just a filename without a path, add the full path
        if (!fetchedItem.image.startsWith('http') && !fetchedItem.image.startsWith('/')) {
          fetchedItem.image = `${API_BASE_URL}/uploads/${fetchedItem.image}`;
        }
        // If it already has /uploads in the path but is missing the base URL
        else if (fetchedItem.image.startsWith('/uploads/')) {
          fetchedItem.image = `${API_BASE_URL}${fetchedItem.image}`;
        }
        
        console.log('Image path in modal:', fetchedItem.image);
      }
      
      setItem(fetchedItem);
    } catch (error) {
      console.error('Error fetching item details:', error);
      setError('Error fetching item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRequestItem = async () => {
    if (!currentUser || !item) return;
    
    setRequestLoading(true);
    setRequestError(null);
    
    try {
      // Make API call to request the item
      await axios.post(`${API_BASE_URL}/api/items/${item.id}/request`, {}, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });
      
      // Update the item status locally
      setItem(prevItem => ({
        ...prevItem,
        status: 'requested'
      }));
      
      // Show success message
      setRequestSuccess(true);
      
      // Call the parent component's onRequestItem if provided
      if (onRequestItem) {
        onRequestItem(item.id);
      }
      
      // Refresh the items list in parent component after a short delay
      if (refreshItems) {
        setTimeout(() => {
          refreshItems();
        }, 1000);
      }
    } catch (error) {
      console.error('Error requesting item:', error);
      setRequestError(error.response?.data?.message || 'Failed to request item. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };
  
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'found':
        return 'status-found';
      case 'lost':
        return 'status-lost';
      case 'requested':
        return 'status-requested';
      case 'returned':
        return 'status-returned';
      default:
        return '';
    }
  };
  
  const formatDateString = (dateString) => {
    if (!dateString) return 'Date not available';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const handleModalClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };
  
  if (loading) {
    return (
      <div className="modal-overlay" onClick={handleModalClick}>
        <div className="modal-content">
          <div className="item-modal-loading">
            <div className="spinner"></div>
            <p>Loading item details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="modal-overlay" onClick={handleModalClick}>
        <div className="modal-content">
          <div className="item-modal-error">
            <div className="error-icon">⚠️</div>
            <h3>Error Loading Item</h3>
            <p>{error}</p>
            <div className="modal-actions">
              <button onClick={fetchItem} className="retry-btn">
                Retry
              </button>
              <button onClick={onClose} className="close-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!item) {
    return (
      <div className="modal-overlay" onClick={handleModalClick}>
        <div className="modal-content">
          <div className="item-modal-not-found">
            <div className="not-found-icon">🔍</div>
            <h3>Item Not Found</h3>
            <p>The item you're looking for doesn't exist or has been removed.</p>
            <button onClick={onClose} className="close-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const isOwner = currentUser && item.user_id === currentUser.id;
  const isClaimer = currentUser && item.claimer_id === currentUser.id;
  const isClaimable = currentUser && item.status === 'found' && !item.is_claimed;

  return (
    <div className="modal-overlay" onClick={handleModalClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{item.title}</h2>
          <div className={`status-badge ${getStatusBadgeClass(item.status)}`}>
            {item.status}
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="item-modal-content">
            <div className="item-image-container">
              {item.image && (
                <div className="modal-image-container">
                  <Image
                    src={item.image}
                    alt={item.title}
                    className="modal-image"
                  />
                </div>
              )}
            </div>
            
            <div className="item-info">
              <div className="info-section">
                <h3>Item Details</h3>
                
                <div className="info-row">
                  <div className="info-label">Category:</div>
                  <div className="info-value">{item.category || 'Uncategorized'}</div>
                </div>
                
                <div className="info-row">
                  <div className="info-label">Location:</div>
                  <div className="info-value">{item.location || 'Location not specified'}</div>
                </div>
                
                <div className="info-row">
                  <div className="info-label">Date:</div>
                  <div className="info-value">{formatDateString(item.created_at || item.date)}</div>
                </div>
                
                {item.description && (
                  <div className="info-row description">
                    <div className="info-label">Description:</div>
                    <div className="info-value">{item.description}</div>
                  </div>
                )}
              </div>
              
              {(isOwner || isClaimer) && (
                <div className="info-section status-section">
                  <h3>Status Information</h3>
                  
                  {isOwner && (
                    <div className="owner-info">
                      <p>You reported this item on {formatDateString(item.created_at || item.date)}</p>
                    </div>
                  )}
                  
                  {isClaimer && (
                    <div className="claimer-info">
                      <p>You requested this item on {formatDateString(item.updated_at)}</p>
                      <p>Status: <span className="highlight">{item.claim_status || 'Pending'}</span></p>
                    </div>
                  )}
                  
                  {item.security_notes && (
                    <div className="security-notes">
                      <h4>Notes from Security:</h4>
                      <p>{item.security_notes}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Request Success Message */}
              {requestSuccess && (
                <Alert variant="success" className="mt-3">
                  <Alert.Heading>Request Successful!</Alert.Heading>
                  <p>Your request for this item has been submitted. Security staff will review your request.</p>
                </Alert>
              )}
              
              {/* Request Error Message */}
              {requestError && (
                <Alert variant="danger" className="mt-3">
                  <Alert.Heading>Request Failed</Alert.Heading>
                  <p>{requestError}</p>
                </Alert>
              )}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          {isClaimable && !requestSuccess && (
            <Button 
              onClick={handleRequestItem} 
              variant="warning" 
              className="request-btn"
              disabled={requestLoading}
            >
              {requestLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-hand-paper me-2"></i>
                  Request This Item
                </>
              )}
            </Button>
          )}
          
          <button onClick={onClose} className="cancel-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemModal; 