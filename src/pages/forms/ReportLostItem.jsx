import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsApi } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/ItemForms.css';

const ReportLostItem = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    date: '',
    description: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        image: file
      });

      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      image: null
    });
    setImagePreview(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      // Create form data for multipart submission
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('category', formData.category);
      submitData.append('location', formData.location);
      submitData.append('date', formData.date);
      submitData.append('description', formData.description);
      submitData.append('status', 'lost'); // Set status to 'lost'
      submitData.append('user_id', currentUser.id);
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      console.log('Submitting with token:', currentUser.token);

      // Submit the form with the token
      const response = await itemsApi.createItem(submitData, currentUser.token);
      console.log('Item created:', response);

      // Redirect to the dashboard
      navigate('/dashboard/lost-items');
      
    } catch (err) {
      console.error('Error creating item:', err);
      setError(err.message || 'Failed to create item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>Report Lost Item</h1>
        <p>Please provide details about the item you lost. The more information you provide, the easier it will be for someone to find and return it to you.</p>
      </div>

      {error && (
        <div className="form-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="item-form">
        <div className="form-group">
          <label htmlFor="title">Item Name*</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="What did you lose? (e.g. Blue Backpack, Student ID Card)"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category*</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            <option value="Electronics">Electronics</option>
            <option value="Clothing">Clothing</option>
            <option value="Accessories">Accessories</option>
            <option value="Documents">Documents</option>
            <option value="Keys">Keys</option>
            <option value="Bags">Bags</option>
            <option value="Books">Books</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="location">Last Seen Location*</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Where did you last see this item? (e.g. Library, Main Hall)"
            required
          />
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
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide additional details about the item (color, size, distinguishing features, etc.)"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Upload Image</label>
          <div className="image-upload-container">
            <input
              type="file"
              id="image"
              name="image"
              onChange={handleImageChange}
              accept="image/*"
              className="image-upload-input"
            />
            <label htmlFor="image" className="image-upload-label">
              <i className="fas fa-cloud-upload-alt"></i> Select Image
            </label>
            {imagePreview && (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={handleRemoveImage}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>
          <small>Adding a clear image can help others identify your item if found.</small>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate('/dashboard/lost-items')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div> Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportLostItem; 