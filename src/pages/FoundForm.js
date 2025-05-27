import React, { useState } from 'react';
import './Form.css';

const categories = ['Electronics', 'Clothing', 'Books', 'Bags', 'Documents', 'Bottle', 'Other'];
const electronicsSubcategories = ['Phones', 'Chargers', 'Laptops', 'Buds'];
const locations = ['stc', 'stmb', 'msb', 'central building', 'oval building', 'library', 'other'];

const FoundForm = ({ contact, setContact, currentUserId }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: categories[0],
    subcategory: '',
    location: locations[0],
    date: '',
    description: '',
    contact: contact || '',
    image: '',
  });

  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'category' && value === 'Electronics' && { subcategory: electronicsSubcategories[0] }),
      ...(name === 'category' && value !== 'Electronics' && { subcategory: '' }),
    }));
    if (name === 'contact') setContact(value);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      ...formData,
      status: 'found',
      user_id: currentUserId,
    };

    try {
      const res = await fetch('http://localhost:5000/items/found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Submission failed');

      setShowConfirmation(true);
    } catch (err) {
      alert('Error submitting form: ' + err.message);
    }
  };

  const handleNewSubmission = () => {
    setFormData({
      title: '',
      category: categories[0],
      subcategory: '',
      location: locations[0],
      date: '',
      description: '',
      contact: formData.contact,
      image: '',
    });
    setShowConfirmation(false);
  };

  if (showConfirmation) {
    return (
      <div className="form confirmation-screen">
        <h2>Thank You!</h2>
        <p>Your found item has been submitted successfully.</p>
        <div className="summary">
          <p><strong>Item:</strong> {formData.title}</p>
          <p><strong>Category:</strong> {formData.category}{formData.subcategory && ` - ${formData.subcategory}`}</p>
          <p><strong>Location:</strong> {formData.location}</p>
          <p><strong>Date:</strong> {formData.date}</p>
          <p><strong>Description:</strong> {formData.description}</p>
          <p><strong>Contact:</strong> {formData.contact}</p>
        </div>
        <button onClick={handleNewSubmission} className="submit-btn">Submit Another Item</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2>Found Item Form</h2>

      <div className="form-group">
        <label>Item:</label>
        <input required name="title" value={formData.title} onChange={handleChange} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Category:</label>
          <select name="category" value={formData.category} onChange={handleChange} required>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {formData.category === 'Electronics' && (
          <div className="form-group">
            <label>Subcategory:</label>
            <select name="subcategory" value={formData.subcategory} onChange={handleChange} required>
              {electronicsSubcategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Location:</label>
          <select name="location" value={formData.location} onChange={handleChange} required>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Date Found:</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required />
        </div>
      </div>

      <div className="form-group">
        <label>Description:</label>
        <textarea name="description" value={formData.description} onChange={handleChange} required />
      </div>

      <div className="form-group">
        <label>Image URL (optional):</label>
        <input type="text" name="image" value={formData.image} onChange={handleChange} placeholder="https://example.com/image.jpg" />
      </div>

      <div className="form-group">
        <label>Contact Email:</label>
        <input type="email" name="contact" value={formData.contact} onChange={handleChange} required />
      </div>

      <button type="submit" className="submit-btn">Submit Found Item</button>
    </form>
  );
};

export default FoundForm;
