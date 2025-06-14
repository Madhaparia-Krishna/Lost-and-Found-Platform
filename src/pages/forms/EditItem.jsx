import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { itemsApi, API_BASE_URL } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/ItemForms.css';

const EditItem = () => {
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    date: '',
    description: '',
    status: '',
    image: null
  });
  const [originalItem, setOriginalItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id || !currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const item = await itemsApi.getItemById(id);
        console.log('Fetched item:', item);
        
        // Check if user is authorized to edit this item
        if (item.user_id !== currentUser.id) {
          setError('You are not authorized to edit this item.');
          setLoading(false);
          return;
        }
        
        setOriginalItem(item);
        
        // Format date for the date input (YYYY-MM-DD)
        let formattedDate = '';
        if (item.date) {
          const dateObj = new Date(item.date);
          formattedDate = dateObj.toISOString().split('T')[0];
        }
        
        setFormData({
          title: item.title || '',
          category: item.category || '',
          location: item.location || '',
          date: formattedDate,
          description: item.description || '',
          status: item.status || ''
        });
        
        // Set image preview if exists
        if (item.image) {
          setImagePreview(`${API_BASE_URL}/uploads/${item.image}`);
        }
        
      } catch (err) {
        console.error('Error fetching item:', err);
        setError('Failed to load item details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchItem();
  }, [id, currentUser]);

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
    if (!currentUser || !id) return;

    try {
      setSaving(true);
      setError(null);

      // Create form data for multipart submission
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('category', formData.category);
      submitData.append('location', formData.location);
      submitData.append('date', formData.date);
      submitData.append('description', formData.description);
      submitData.append('status', formData.status);
      
      if (formData.image) {
        submitData.append('image', formData.image);
      }

      // Update the item
      const response = await itemsApi.updateItem(id, submitData);
      console.log('Item updated:', response);

      // Redirect to the appropriate dashboard page based on status
      switch (formData.status) {
        case 'lost':
          navigate('/dashboard/lost-items');
          break;
        case 'found':
          navigate('/dashboard/found-items');
          break;
        case 'requested':
          navigate('/dashboard/requested-items');
          break;
        case 'returned':
          navigate('/dashboard/returned-items');
          break;
        default:
          navigate('/dashboard');
      }
      
    } catch (err) {
      console.error('Error updating item:', err);
      setError(err.message || 'Failed to update item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Determine which dashboard to return to based on item status
  const getReturnPath = () => {
    if (!originalItem) return '/dashboard';
    
    switch (originalItem.status) {
      case 'lost':
        return '/dashboard/lost-items';
      case 'found':
        return '/dashboard/found-items';
      case 'requested':
        return '/dashboard/requested-items';
      case 'returned':
        return '/dashboard/returned-items';
      default:
        return '/dashboard';
    }
  };

  if (loading) {
    return (
      <div className="form-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading item details...</p>
        </div>
      </div>
    );
  }

  if (error && !originalItem) {
    return (
      <div className="form-container">
        <div className="error-state">
          <div className="error-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h3>Error Loading Item</h3>
          <p>{error}</p>
          <button onClick={() => navigate(getReturnPath())} className="retry-btn">
            <i className="fas fa-arrow-left"></i> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>Edit Item</h1>
        <p>Update the details of your reported item.</p>
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
            placeholder="Item name"
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
          <label htmlFor="location">Location*</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Where was the item found/lost?"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date*</label>
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
            placeholder="Provide additional details about the item"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="status">Status*</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
          >
            <option value="">Select a status</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
          <small>Change the status if needed (e.g., from lost to found or vice versa).</small>
        </div>

        <div className="form-group">
          <label htmlFor="image">Item Image</label>
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
              <i className="fas fa-cloud-upload-alt"></i> {imagePreview ? 'Change Image' : 'Upload Image'}
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
          <small>You can upload a new image or keep the existing one.</small>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate(getReturnPath())}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="btn-spinner"></div> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditItem; 