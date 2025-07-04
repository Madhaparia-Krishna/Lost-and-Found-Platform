import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemsApi } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/ItemForms.css';
import SuccessMessage from '../../components/SuccessMessage';
import { checkForMatches, sendMatchNotification, checkEmailMatches, notifyEmailMatches } from '../../utils/itemMatching';
import { toast } from 'react-hot-toast';

const ReportFoundItem = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    date: '',
    description: '',
    image: null
  });

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

      // First, upload the image if provided
      let imageUrl = null;
      if (formData.image) {
        try {
          const imageResponse = await itemsApi.uploadImage(formData.image);
          if (imageResponse && imageResponse.filename) {
            imageUrl = imageResponse.filename;
            console.log('Image uploaded successfully:', imageUrl);
          }
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          // Continue without image if upload fails
        }
      }

      // Prepare data for submission
      const submitData = {
        title: formData.title,
        category: formData.category,
        location: formData.location,
        date: formData.date,
        description: formData.description,
        status: 'found',
        image: imageUrl
      };

      console.log('Submitting found item:', submitData);
      
      // Use reportFound instead of createItem
      const response = await itemsApi.reportFound(submitData, currentUser.token);
      console.log('Found item reported:', response);
      
      // Check for matches with existing lost items
      if (response && response.id) {
        console.log('Checking for matches...');
        const matches = await checkForMatches({
          id: response.id,
          title: formData.title,
          category: formData.category,
          location: formData.location,
          date: formData.date,
          description: formData.description,
          status: 'found'
        }, true); // true indicates this is a found item
        
        console.log('Matches found:', matches);
        
        // If matches found, show toast notification
        if (matches && matches.length > 0) {
          toast.success('We found potential matches for your found item! Check your email for details.');
        }
        
        // Check for email matches
        console.log('Checking for email matches...');
        const { matches: emailMatches, matchCount } = await checkEmailMatches(currentUser.email, 'found');
        
        if (emailMatches && emailMatches.length > 0) {
          console.log(`Found ${emailMatches.length} email matches`);
          toast.success(`We found ${emailMatches.length} potential matches based on your email! Check your email for details.`);
          
          // Send email notification for email matches
          await notifyEmailMatches(
            currentUser.email,
            currentUser.name,
            emailMatches,
            'found'
          );
        }
      }

      // Show success message
      setSubmitSuccess(true);
      
    } catch (err) {
      console.error('Error reporting found item:', err);
      setError(err.message || 'Failed to report found item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="form-container">
        <div className="form-header">
          <h1>Report Found Item</h1>
        </div>
        
        <SuccessMessage 
          title="Thank You!"
          message="Your found item has been reported successfully."
          submessage="Your submission will be reviewed by security staff before being published."
          onReset={() => {
            setSubmitSuccess(false);
            setFormData({
              title: '',
              category: '',
              location: '',
              date: '',
              description: '',
              image: null
            });
            setImagePreview(null);
          }}
          resetButtonText="Report Another Item"
          showDashboardLink={true}
        />
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>Report Found Item</h1>
        <p>Please provide details about the item you found. The more information you provide, the easier it will be for the owner to identify it.</p>
        <p className="approval-note"><strong>Note:</strong> All found items will be reviewed by security staff before being published.</p>
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
            placeholder="What did you find? (e.g. Blue Backpack, Student ID Card)"
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
          <label htmlFor="location">Location Found*</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Where did you find this item? (e.g. Library, Main Hall)"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date Found*</label>
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
          <small>Adding a clear image can help the owner identify their item.</small>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate('/dashboard/found-items')}
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

export default ReportFoundItem; 