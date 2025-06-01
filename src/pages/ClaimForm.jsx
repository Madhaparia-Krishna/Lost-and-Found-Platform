import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../styles/ClaimForm.css';

// Create a base API URL that can be easily changed
const API_BASE_URL = 'http://localhost:5000';

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

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/items/${itemId}`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`
        },
        timeout: 10000 // 10 seconds timeout
      });
      
      setItem(response.data);
      
      // Pre-fill contact info if available in localStorage
      const savedContact = localStorage.getItem('userContact');
      if (savedContact) {
        setFormData(prev => ({
          ...prev,
          contact_info: savedContact
        }));
      }
    } catch (err) {
      console.error('Error fetching item details:', err);
      if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and ensure the server is running.');
      } else {
        setError('Error fetching item details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if user is logged in and fetch item details
  useEffect(() => {
    if (!currentUser) {
      setError('You must be logged in to claim an item');
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
      
      await axios.post(
        `${API_BASE_URL}/api/items/${itemId}/claim`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`
          },
          timeout: 10000 // 10 seconds timeout
        }
      );
      
      setSubmitSuccess(true);
      
      // Clear form
      setFormData({
        claim_description: '',
        contact_info: formData.contact_info // Keep contact info
      });
      
    } catch (err) {
      console.error('Error submitting claim:', err);
      if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and ensure the server is running.');
      } else {
        setError(err.response?.data?.message || 'Error submitting claim. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading item details...</div>;
  }

  if (error && !item) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button 
          className="refresh-btn" 
          onClick={() => fetchItemDetails()}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (submitSuccess) {
    return (
      <div className="claim-form-container">
        <div className="success-message">
          <h2>Claim Submitted Successfully!</h2>
          <p>Your claim has been submitted for review by our security team.</p>
          <p>You will be notified when your claim is processed.</p>
          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/items')}
              className="secondary-button"
            >
              Return to Items
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="claim-form-container">
      <h1>Claim Item</h1>
      
      {item && (
        <div className="item-summary">
          <h2>{item.title}</h2>
          {item.image && (
            <div className="item-image">
              <img 
                src={`${API_BASE_URL}/uploads/${item.image}`} 
                alt={item.title}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-image.png';
                }}
              />
            </div>
          )}
          <div className="item-details">
            <p><strong>Category:</strong> {item.category}</p>
            <p><strong>Description:</strong> {item.description}</p>
            <p><strong>Reported by:</strong> {item.reporter_name}</p>
            <p><strong>Date:</strong> {new Date(item.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      )}
      
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