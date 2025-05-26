// LostForm.jsx
import React, { useState } from 'react';
import '../src/App.css';

const categories = [
  'Electronics',
  'Clothing',
  'Books',
  'Bags',
  'Documents',
  'Bottle',
  'Other',
];


const electronicsSubcategories = ['Phones', 'Chargers', 'Laptops', 'Buds'];

const locations = [
  'stc',
  'stmb',
  'msb',
  'central building',
  'oval building',
  'library',
  'other',
];

const LostForm = ({ contact, setContact }) => {
  const [formData, setFormData] = useState({
    item: '',
    category: categories[0],
    subcategory: '',
    location: locations[0],
    date_lost: '',
    description: '',
    contact: contact || '',
    image: null,
  });

  const handleChange = e => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, image: files[0] }));
    } else if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subcategory: value === 'Electronics' ? electronicsSubcategories[0] : '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (name === 'contact') {
      setContact(value);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      if (val) data.append(key, val);
    });

    try {
      const res = await fetch('http://localhost:5000/lost/submit', {
        method: 'POST',
        body: data,
      });
      if (!res.ok) throw new Error('Submission failed');
      alert('Lost item submitted!');
      setFormData({
        item: '',
        category: categories[0],
        subcategory: '',
        location: locations[0],
        date_lost: '',
        description: '',
        contact: formData.contact,
        image: null,
      });
      e.target.reset();
    } catch (err) {
      alert('Error submitting form: ' + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form" encType="multipart/form-data" id="lost-form">
      <h2>Lost Item Form</h2>
      <label>
        Item:
        <input required name="item" value={formData.item} onChange={handleChange} />
      </label>
      <label>
        Category:
        <select name="category" value={formData.category} onChange={handleChange} required>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      {formData.category === 'Electronics' && (
        <label>
          Subcategory:
          <select name="subcategory" required value={formData.subcategory} onChange={handleChange}>
            {electronicsSubcategories.map(sc => (
              <option key={sc} value={sc}>{sc}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        Location:
        <select name="location" value={formData.location} onChange={handleChange} required>
          {locations.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </label>
      <label>
        Date lost:
        <input name="date_lost" type="date" value={formData.date_lost} onChange={handleChange} required />
      </label>
      <label>
        Description:
        <textarea required name="description" value={formData.description} onChange={handleChange} />
      </label>
      <label>
        Image (optional):
        <input type="file" accept="image/*" name="image" onChange={handleChange} />
      </label>
      <label>
        Contact Email:
        <input type="email" required name="contact" value={formData.contact} onChange={handleChange} />
      </label>
      <button type="submit" className="submit-btn">Submit Lost Item</button>
    </form>
  );
};

export default LostForm;
