// FoundForm.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/form.css';

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

const FoundForm = ({ currentUserId }) => {
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
    contact: savedContact || '',
    image: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = e => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      if (file && !file.type.startsWith('image/')) {
        setSubmitError('Please upload only image files');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      setSubmitError('');
    } else if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subcategory: value === 'Electronics' ? electronicsSubcategories[0] : '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      // Save contact to localStorage when it changes
      if (name === 'contact') {
        localStorage.setItem('userContact', value);
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (!currentUser || !currentUser.token) {
        throw new Error('You must be logged in to submit a form');
      }

      // Log form data for debugging
      console.log('Submitting form data:', {
        title: formData.title,
        category: formData.category,
        subcategory: formData.subcategory,
        location: formData.location,
        date: formData.date,
        description: formData.description,
        contact: formData.contact,
        image: formData.image ? 'Image file present' : 'No image'
      });

      // Creating a simpler JSON payload first as a test
      const jsonPayload = {
        title: formData.title,
        category: formData.category,
        subcategory: formData.subcategory || '',
        description: formData.description,
        location: formData.location,
        date: formData.date,
        status: 'found'
      };

      console.log('Sending JSON payload to server');
      
      // Try a simple JSON submission first without the image
      const res = await fetch('http://localhost:5000/items/found', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(jsonPayload)
      });

      let responseData;
      try {
        responseData = await res.json();
        console.log('Server response:', responseData);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        const responseText = await res.text();
        console.error('Server returned:', responseText);
        responseData = { message: 'Error parsing server response' };
      }

      if (!res.ok) {
        throw new Error(responseData.message || 'Failed to submit found item');
      }

      setSubmitSuccess(true);
      setFormData({
        title: '',
        category: categories[0],
        subcategory: '',
        location: locations[0],
        date: '',
        description: '',
        contact: formData.contact, // Keep contact info
        image: null,
      });
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setSubmitError(err.message || 'Error submitting form');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="form-container">
        <div className="form success-message">
          <h2>Thank You!</h2>
          <p>Your found item has been reported successfully.</p>
          <button 
            className="submit-btn"
            onClick={() => {
              setSubmitSuccess(false);
              window.scrollTo(0, 0);
            }}
          >
            Report Another Item
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="form" encType="multipart/form-data">
        <h2>Report Found Item</h2>
        
        {submitError && <div className="error-message">{submitError}</div>}

        <div className="form-group">
          <label htmlFor="title">Item Name*</label>
          <input
            id="title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Enter item name"
            maxLength={100}
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
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {formData.category === 'Electronics' && (
            <div className="form-group">
              <label htmlFor="subcategory">Type*</label>
              <select
                id="subcategory"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                required
              >
                {electronicsSubcategories.map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="location">Found Location*</label>
            <select
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            >
              {locations.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date Found*</label>
            <input
              id="date"
              type="date"
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
            placeholder="Please provide detailed description of the item including any identifying marks or features"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Image</label>
          <input
            id="image"
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="file-input"
          />
          <small>Upload a clear image of the item (if available)</small>
        </div>

        <div className="form-group">
          <label htmlFor="contact">Contact Email*</label>
          <input
            id="contact"
            type="email"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
            placeholder="Enter your contact email"
          />
        </div>

        <button 
          type="submit" 
          className="submit-btn" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
};

export default FoundForm;

