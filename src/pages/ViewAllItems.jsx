import React, { useState, useEffect } from 'react';
import '../styles/ViewAllItems.css';

const ViewAllItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});

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
      // Filter to only show "found" items
      const foundItems = data.filter(item => item.status === 'found');
      setItems(foundItems);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (itemId) => {
    setImageErrors(prev => ({
      ...prev,
      [itemId]: true
    }));
  };

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="view-all-items">
      <h1>Found Items</h1>
      
      {items.length === 0 ? (
        <div className="no-items-message">No found items available at the moment</div>
      ) : (
        <div className="items-grid">
          {items.map(item => (
            <div key={item.id} className="item-card">
              {item.image && !imageErrors[item.id] ? (
                <div className="item-image">
                  <img 
                    src={`http://localhost:5000/uploads/${item.image}`} 
                    alt={item.title}
                    onError={() => handleImageError(item.id)}
                  />
                </div>
              ) : (
                <div className="item-image item-no-image">
                  <div className="placeholder-text">
                    {item.image ? `Image could not be loaded` : 'No image available'}
                  </div>
                </div>
              )}
              <div className="item-details">
                <h3>{item.title}</h3>
                <p className="item-category">{item.category}</p>
                <p className="item-description">{item.description}</p>
                <p className="item-reporter">Reported by: {item.reporter_name}</p>
                <p className="item-date">Date: {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewAllItems; 