import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { itemsApi, API_BASE_URL } from '../utils/api';
import '../styles/ItemDetail.css';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";
  
  useEffect(() => {
    fetchItem();
  }, [id]);
  
  const fetchItem = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the specific item by ID
      const fetchedItem = await itemsApi.getItemById(id);
      
      if (!fetchedItem) {
        throw new Error('Item not found');
      }
      
      setItem(fetchedItem);
      
      // After successfully fetching the item, fetch matches
      fetchMatches(fetchedItem);
    } catch (error) {
      console.error('Error fetching item details:', error);
      setError('Error fetching item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMatches = async (itemData) => {
    if (!currentUser || !itemData) return;
    
    try {
      setMatchesLoading(true);
      
      // Only fetch matches for lost or found items
      if (itemData.status === 'lost' || itemData.status === 'found') {
        const matchesResponse = await itemsApi.getMatchStatus(itemData.id, currentUser.token);
        
        if (matchesResponse && matchesResponse.matches) {
          setMatches(matchesResponse.matches);
        }
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      // Don't set an error state for matches, just log it
    } finally {
      setMatchesLoading(false);
    }
  };
  
  const handleClaimRequest = () => {
    navigate(`/claim/${id}`);
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
    return new Date(dateString).toLocaleDateString();
  };
  
  const handleBackClick = () => {
    navigate(-1);
  };
  
  // Format match score as percentage
  const formatMatchScore = (score) => {
    return `${Math.round(score * 100)}%`;
  };
  
  if (loading) {
    return (
      <div className="item-detail-loading">
        <div className="spinner"></div>
        <p>Loading item details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="item-detail-error">
        <div className="error-icon">
          <i className="fas fa-exclamation-circle"></i>
        </div>
        <h3>Error Loading Item</h3>
        <p>{error}</p>
        <button onClick={fetchItem} className="retry-btn">
          <i className="fas fa-sync-alt"></i> Retry
        </button>
        <button onClick={handleBackClick} className="back-btn">
          <i className="fas fa-arrow-left"></i> Go Back
        </button>
      </div>
    );
  }
  
  if (!item) {
    return (
      <div className="item-detail-not-found">
        <div className="not-found-icon">
          <i className="fas fa-search"></i>
        </div>
        <h3>Item Not Found</h3>
        <p>The item you're looking for doesn't exist or has been removed.</p>
        <button onClick={handleBackClick} className="back-btn">
          <i className="fas fa-arrow-left"></i> Go Back
        </button>
      </div>
    );
  }
  
  const isOwner = currentUser && item.user_id === currentUser.id;
  const isClaimer = currentUser && item.claimer_id === currentUser.id;
  const isClaimable = currentUser && item.status === 'found' && !item.is_claimed;
  const canEdit = isOwner && (item.status === 'lost' || item.status === 'found');
  const hasMatches = matches.length > 0;

  return (
    <div className="item-detail-container">
      <div className="item-detail-header">
        <button onClick={handleBackClick} className="back-btn">
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <h1>{item.title}</h1>
        <div className={`status-badge ${getStatusBadgeClass(item.status)}`}>
          {item.status}
        </div>
        {hasMatches && (
          <div className="match-badge">
            <i className="fas fa-link"></i> {matches.length} Match{matches.length > 1 ? 'es' : ''}
          </div>
        )}
      </div>
      
      <div className="item-detail-content">
        <div className="item-image-container">
          {item.image ? (
            <img 
              src={`${API_BASE_URL}/uploads/${item.image}`} 
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
              <div className="info-value">{formatDateString(item.created_at)}</div>
            </div>
            
            {item.description && (
              <div className="info-row description">
                <div className="info-label">Description:</div>
                <div className="info-value">{item.description}</div>
              </div>
            )}
          </div>
          
          {/* Matches Section */}
          {isOwner && hasMatches && (
            <div className="info-section matches-section">
              <h3>Potential Matches</h3>
              <div className="matches-list">
                {matches.map(match => (
                  <div key={match.id} className="match-item" onClick={() => navigate(`/items/${match.matchedItem.id}`)}>
                    <div className="match-title">
                      {match.matchedItem.title}
                    </div>
                    <div className="match-details">
                      <span className="match-category">{match.matchedItem.category}</span>
                      <span className="match-location">{match.matchedItem.location}</span>
                      <span className="match-date">{formatDateString(match.matchedItem.date)}</span>
                    </div>
                    <div className="match-score">
                      <span className="score-label">Match Score:</span>
                      <span className="score-value">{formatMatchScore(match.matchScore)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(isOwner || isClaimer) && (
            <div className="info-section status-section">
              <h3>Status Information</h3>
              
              {isOwner && (
                <div className="owner-info">
                  <p>You reported this item on {formatDateString(item.created_at)}</p>
                </div>
              )}
              
              {isClaimer && (
                <div className="claimer-info">
                  <p>You claimed this item on {formatDateString(item.updated_at)}</p>
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
          
          <div className="item-actions">
            {isClaimable && (
              <button onClick={handleClaimRequest} className="claim-btn">
                <i className="fas fa-hand-paper"></i> Claim This Item
              </button>
            )}
            
            {canEdit && (
              <div className="owner-actions">
                <button 
                  className="edit-btn"
                  onClick={() => navigate(`/edit-item/${item.id}`)}
                >
                  <i className="fas fa-edit"></i> Edit Details
                </button>
              </div>
            )}
            
            {/* Manual Match Check Button (only for item owner) */}
            {isOwner && !matchesLoading && (
              <button 
                className="check-matches-btn"
                onClick={() => {
                  fetchMatches(item);
                }}
              >
                <i className="fas fa-search"></i> Check for Matches
              </button>
            )}
            
            {matchesLoading && (
              <div className="matches-loading">
                <div className="spinner-small"></div>
                <span>Checking for matches...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail; 