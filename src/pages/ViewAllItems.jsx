import React, { useState, useEffect } from 'react';
import '../styles/ViewAllItems.css';

const ViewAllItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/items');
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="view-all-items">
      <h1>All Items</h1>
      <div className="items-grid">
        {items.map(item => (
          <div key={item.id} className="item-card">
            {item.image && (
              <div className="item-image">
                <img src={`http://localhost:5000/uploads/${item.image}`} alt={item.title} />
              </div>
            )}
            <div className="item-details">
              <h3>{item.title}</h3>
              <p className="item-category">{item.category}</p>
              <p className="item-description">{item.description}</p>
              <p className="item-status">Status: {item.status}</p>
              <p className="item-reporter">Reported by: {item.reporter_name}</p>
              <p className="item-date">Date: {new Date(item.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewAllItems; 