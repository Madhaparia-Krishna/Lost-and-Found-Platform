import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { itemsApi, API_BASE_URL } from '../utils/api';
import '../styles/ClaimForm.css';
import SuccessMessage from '../components/SuccessMessage';

const ClaimForm = () => {
  const { itemId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    claim_description: '',
    contact_info: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);

  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching details for item ${itemId}...`);
      const itemData = await itemsApi.getById(itemId);
      
      if (!itemData) {
        throw new Error('Item not found');
      }
      
      console.log('Item data received:', itemData);
      setItem(itemData);
      
      // Pre-fill contact info if available in localStorage
      const savedContact = localStorage.getItem('userContact');
      if (savedContact) {
        setFormData(prev => ({
          ...prev,
          contact_info: savedContact
        }));
      } else if (currentUser && currentUser.phone_number) {
        // Use phone number from user profile if available
        setFormData(prev => ({
          ...prev,
          contact_info: currentUser.phone_number
        }));
      }
    } catch (err) {
      console.error('Error fetching item details:', err);
      if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and ensure the server is running.');
      } else {
        setError('Error fetching item details. Please try again.');
      }
      setActionStatus({
        type: 'error',
        message: err.message || 'Failed to load item details'
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user is logged in and fetch item details
  useEffect(() => {
    if (!currentUser) {
      setError('You must be logged in to claim an item');
      setActionStatus({
        type: 'error',
        message: 'Authentication required. Please log in to continue.'
      });
      return;
    }
    
    fetchItemDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, itemId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Save contact info to localStorage
    if (name === 'contact_info') {
      localStorage.setItem('userContact', value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to claim an item');
      setActionStatus({
        type: 'error',
        message: 'Authentication required. Please log in to continue.'
      });
      return;
    }
    
    if (!formData.claim_description) {
      setError('Please provide a description of why you believe this item is yours');
      return;
    }
    
    if (!formData.contact_info) {
      setError('Please provide contact information');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      setActionStatus({
        type: 'loading',
        message: 'Submitting your claim...'
      });
      
      console.log(`Submitting claim for item ${itemId}...`);
      console.log('Claim data:', formData);
      
      const response = await itemsApi.submitClaim(itemId, formData);
      
      console.log('Claim submission response:', response);
      
      setSubmitSuccess(true);
      setActionStatus({
        type: 'success',
        message: 'Your claim has been submitted successfully!'
      });
      
      // Clear form
      setFormData({
        claim_description: '',
        contact_info: formData.contact_info // Keep contact info
      });
      
    } catch (err) {
      console.error('Error submitting claim:', err);
      
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already have a pending request')) {
        setActionStatus({
          type: 'warning',
          message: 'You already have a pending claim for this item. Please wait for it to be processed.'
        });
      } else if (err.message === 'Network Error') {
        setActionStatus({
          type: 'error',
          message: 'Network error. Please check your connection and ensure the server is running.'
        });
      } else {
        setActionStatus({
          type: 'error',
          message: err.response?.data?.message || 'Error submitting claim. Please try again.'
        });
      }
      
      setError(err.response?.data?.message || 'Error submitting claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="claim-form-container">
        <div className="loading">Loading item details...</div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="claim-form-container">
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button 
            className="refresh-btn" 
            onClick={() => fetchItemDetails()}
          >
            Try Again
          </button>
          <Link to="/items" className="secondary-button">
            Return to Items
          </Link>
        </div>
      </div>
    );
  }
  
  if (submitSuccess) {
    return (
      <div className="claim-form-container">
        <SuccessMessage 
          title="Claim Submitted Successfully!"
          message="Your claim has been submitted for review by our security team."
          submessage="You will be notified when your claim is processed."
          onReset={() => navigate('/')}
          resetButtonText="Go to Dashboard"
          showDashboardLink={false}
        />
      </div>
    );
  }

  return (
    <div className="claim-form-container">
      <div className="claim-form-header">
        <h1>Claim Item</h1>
        <div className="navigation-links">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/items" className="nav-link">View All Items</Link>
        </div>
      </div>
      
      {actionStatus && (
        <div className={`action-status ${actionStatus.type}`}>
          {actionStatus.message}
          {actionStatus.type === 'loading' && <div className="loading-spinner"></div>}
        </div>
      )}
      
      {item && (
        <div className="item-summary">
          <h2>{item.title}</h2>
          {item.image ? (
            <div className="item-image">
              <img 
                src={`${API_BASE_URL}/uploads/${item.image}`} 
                alt={item.title}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = fallbackImageSrc;
                }}
              />
            </div>
          ) : (
            <div className="item-image no-image">
              <img src={fallbackImageSrc} alt="No image available" />
            </div>
          )}
          <div className="item-details">
            <p><strong>Category:</strong> {item.category}</p>
            {item.subcategory && <p><strong>Type:</strong> {item.subcategory}</p>}
            <p><strong>Description:</strong> {item.description}</p>
            <p><strong>Found at:</strong> {item.location}</p>
            <p><strong>Date:</strong> {item.date ? new Date(item.date).toLocaleDateString() : new Date(item.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}
      
      <div className="claim-instructions">
        <h3>Claim This Item</h3>
        <p>To claim this item, please provide specific details that would identify you as the owner.</p>
        <p>Your claim will be reviewed by security staff who will contact you if approved.</p>
      </div>
      
      <form className="claim-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="claim_description">
            Please describe why you believe this item belongs to you*
          </label>
          <textarea
            id="claim_description"
            name="claim_description"
            value={formData.claim_description}
            onChange={handleChange}
            rows={5}
            required
            placeholder="Provide specific details about the item that only the owner would know..."
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="contact_info">
            Contact Information*
          </label>
          <textarea
            id="contact_info"
            name="contact_info"
            value={formData.contact_info}
            onChange={handleChange}
            rows={3}
            required
            placeholder="Your phone number, email, or other preferred contact method..."
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className="secondary-button"
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="primary-button"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClaimForm; 