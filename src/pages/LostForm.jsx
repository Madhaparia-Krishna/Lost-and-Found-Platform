// LostForm.jsx
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { itemsApi } from '../utils/api';
import '../styles/form.css';
import SuccessMessage from '../components/SuccessMessage';

const categories = [
  'Electronics',
  'Clothing',
  'Books',
  'Bags',
  'Documents',
  'Bottle',
  'Other'
];

const electronicsSubcategories = ['Phones', 'Chargers', 'Laptops', 'Buds'];

const locations = [
  'stc',
  'stmb',
  'msb',
  'central building',
  'oval building',
  'library',
  'other'
];

const LostForm = ({ currentUserId }) => {
  const { currentUser } = useContext(AuthContext);
  // Initialize contact from localStorage if available
  const savedContact = localStorage.getItem('userContact');
  
  const [formData, setFormData] = useState({
    title: '',
    category: categories[0],
    subcategory: '',
    location: locations[0],
    date: '',
    description: '',
    image: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = e => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      if (file && !file.type.startsWith('image/')) {
        setSubmitError('Please upload only image files');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      
      // Create preview URL for the selected image
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
      
      setSubmitError('');
    } else if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subcategory: value === 'Electronics' ? electronicsSubcategories[0] : '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setActionStatus({ type: 'loading', message: 'Submitting lost item report...' });

    try {
      // Check authentication before proceeding
      if (!currentUser || !currentUser.token) {
        throw new Error('Authentication token is missing. Please log out and log in again.');
      }

      // Log form data for debugging
      console.log('Submitting form data:', {
        title: formData.title,
        category: formData.category,
        subcategory: formData.subcategory,
        location: formData.location,
        date: formData.date,
        description: formData.description,
        image: formData.image ? 'Image file present' : 'No image'
      });

      // Creating a JSON payload for the item data
      const jsonPayload = {
        title: formData.title,
        category: formData.category,
        subcategory: formData.subcategory || '',
        description: formData.description,
        location: formData.location,
        date: formData.date,
        status: 'lost',
        user_id: currentUser.id // Ensure user ID is included
      };

      // If image exists, upload it first
      let imageFilename = null;
      if (formData.image) {
        try {
          console.log('Uploading image...');
          const uploadResult = await itemsApi.uploadImage(formData.image);
          imageFilename = uploadResult.filename;
          console.log('Image uploaded successfully:', imageFilename);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          // Continue with form submission even if image upload fails
          setActionStatus({ 
            type: 'warning', 
            message: `Note: Image upload failed (${uploadError.message}), but you can still submit the form.` 
          });
          
          // Clear warning after 5 seconds
          setTimeout(() => {
            setActionStatus(null);
          }, 5000);
        }
      }

      // Add image filename to payload if available
      if (imageFilename) {
        jsonPayload.image = imageFilename;
      }

      console.log('Sending JSON payload to server:', jsonPayload);
      
      // Submit the item data using the API utility
      const response = await itemsApi.reportLost(jsonPayload);
      console.log('Server response:', response);

      setSubmitSuccess(true);
      setFormData({
        title: '',
        category: categories[0],
        subcategory: '',
        location: locations[0],
        date: '',
        description: '',
        image: null,
      });
      
      // Reset file input and image preview
      setImagePreview(null);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.value = '';
      }
      
      setActionStatus({ type: 'success', message: 'Lost item reported successfully!' });
    } catch (err) {
      console.error('Form submission error:', err);
      
      // Provide more detailed error messages
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 401) {
          setActionStatus({ 
            type: 'error', 
            message: 'Authentication error: Your session may have expired. Please log out and log in again.' 
          });
        } else if (err.response.status === 403) {
          setActionStatus({ 
            type: 'error', 
            message: 'Permission denied: You do not have permission to submit lost items.' 
          });
        } else if (err.response.data && err.response.data.message) {
          setActionStatus({ 
            type: 'error', 
            message: `Server error: ${err.response.data.message}` 
          });
        } else {
          setActionStatus({ 
            type: 'error', 
            message: `Server error (${err.response.status}): Please try again later.` 
          });
        }
      } else if (err.request) {
        // The request was made but no response was received
        setActionStatus({ 
          type: 'error', 
          message: 'Network error: No response received from server. Please check your internet connection.' 
        });
      } else {
        // Something happened in setting up the request that triggered an Error
        setActionStatus({ 
          type: 'error', 
          message: err.message || 'An unexpected error occurred. Please try again.' 
        });
      }
      
      setSubmitError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="form-container">
        <div className="form-header">
          <h1>Report Lost Item</h1>
          <div className="navigation-menu">
            <Link to="/" className="menu-link">Home</Link>
            <Link to="/login" className="menu-link">Login</Link>
            <Link to="/register" className="menu-link">Register</Link>
          </div>
        </div>
        
        <div className="auth-message">
          <p>Please log in to report a lost item.</p>
          <Link to="/login" className="auth-button">Login</Link>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="form-container">
        <div className="form-header">
          <h1>Report Lost Item</h1>
          <div className="user-info">
            {currentUser && (
              <>
                <span>Logged in as: {currentUser.name || currentUser.email}</span>
                <span className="role-badge">{currentUser.role}</span>
              </>
            )}
          </div>
          <div className="navigation-menu">
            <Link to="/" className="menu-link">Home</Link>
            <Link to="/" className="menu-link">Dashboard</Link>
            <Link to="/items" className="menu-link">View All Items</Link>
            <Link to="/found" className="menu-link">Report Found Item</Link>
          </div>
        </div>
        
        {actionStatus && (
          <div className={`action-status ${actionStatus.type}`}>
            {actionStatus.message}
          </div>
        )}
        
        <SuccessMessage 
          title="Thank You!"
          message="Your lost item has been reported successfully."
          submessage="We will notify you if a matching item is found."
          onReset={() => {
            setSubmitSuccess(false);
            setActionStatus(null);
          }}
          resetButtonText="Report Another Item"
        />
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>Report Lost Item</h1>
        <div className="user-info">
          {currentUser && (
            <>
              <span>Logged in as: {currentUser.name || currentUser.email}</span>
              <span className="role-badge">{currentUser.role}</span>
            </>
          )}
        </div>
        <div className="navigation-menu">
          <Link to="/" className="menu-link">Home</Link>
          <Link to="/" className="menu-link">Dashboard</Link>
          <Link to="/items" className="menu-link">View All Items</Link>
          <Link to="/found" className="menu-link">Report Found Item</Link>
        </div>
      </div>
      
      {actionStatus && (
        <div className={`action-status ${actionStatus.type}`}>
          {actionStatus.message}
        </div>
      )}
      
      <div className="form-container">
        <div className="form">
          <div className="form-notice">
            <p>Please provide accurate details about your lost item. This will help us match it with found items.</p>
          </div>
          
          {submitError && <div className="error-message">{submitError}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Item Name/Title*</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="E.g. Blue Wallet, iPhone 13, Student ID Card"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category*</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              
              {formData.category === 'Electronics' && (
                <div className="form-group">
                  <label htmlFor="subcategory">Subcategory</label>
                  <select
                    id="subcategory"
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={handleChange}
                  >
                    {electronicsSubcategories.map((subcat) => (
                      <option key={subcat} value={subcat}>
                        {subcat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="location">Last Seen Location*</label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="date">Date Lost*</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description*</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Provide details about the item (color, brand, condition, any identifying features, etc.)"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="image">Upload Image (Optional)</label>
              <input
                type="file"
                id="image"
                name="image"
                onChange={handleChange}
                accept="image/*"
                className="file-input"
              />
              <small>Max file size: 5MB. Supported formats: JPG, PNG, GIF.</small>
            </div>
            
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
            
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Lost Item'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LostForm;
