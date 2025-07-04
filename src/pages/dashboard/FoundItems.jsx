import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { itemsApi, API_BASE_URL } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import ItemModal from '../../components/ItemModal';
import Image from '../../components/Image';
import '../../styles/dashboard/FoundItems.css';
import { toast } from 'react-hot-toast';

const FoundItems = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    dateRange: '30'
  });

  useEffect(() => {
    fetchFoundItems();
  }, [filters]);

  const fetchFoundItems = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching found items...');
      
      // Get all items and filter for 'found' status only
      const retrievedItems = await itemsApi.getAll('found');
      console.log('Retrieved items:', retrievedItems);
      
      if (Array.isArray(retrievedItems)) {
        // Further ensure we're only showing 'found' items (in case API filtering doesn't work)
        const foundItems = retrievedItems.filter(item => item.status === 'found');
        console.log('Filtered to found items only:', foundItems);
        setItems(foundItems);
      } else {
        console.error('API did not return an array of items:', retrievedItems);
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching found items:', error);
      setError('Failed to load items. Please try again later.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      location: '',
      dateRange: '30'
    });
  };

  const handleViewDetails = (itemId) => {
    setSelectedItemId(itemId);
  };

  const handleCloseModal = () => {
    setSelectedItemId(null);
  };

  const handleRequestItem = async (itemId) => {
    try {
      setIsRequesting(true);
      console.log(`Requesting item with ID: ${itemId}`);
      
      // Check if user is logged in
      if (!currentUser || !currentUser.token) {
        toast.error('Please log in to request items');
        setIsRequesting(false);
        return;
      }
      
      // Call the API to request the item
      const response = await itemsApi.requestItem(itemId);
      console.log('Request successful:', response);
      
      // Update the item status instead of removing it
      // Keep the item in the list but mark it as requested
      setItems(prevItems => prevItems.map(item => 
        item.id === itemId 
          ? { ...item, status: 'requested' } 
          : item
      ));
      
      // Show success toast
      toast.success('Item requested successfully! Your request is pending approval by security staff.');
      
      // Close the modal if it's open
      setShowModal(false);
    } catch (error) {
      console.error('Error requesting item:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to request item. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsRequesting(false);
    }
  };

  // Unique categories and locations for filter dropdowns
  const categories = [...new Set(items.filter(item => item.category).map(item => item.category))];
  const locations = [...new Set(items.filter(item => item.location).map(item => item.location))];

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Filter and sort items based on search term and selected category
  const filteredItems = useMemo(() => {
    let filtered = [...items];
    
    // Ensure we only show 'found' status items
    filtered = filtered.filter(item => item.status === 'found');
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.title && item.title.toLowerCase().includes(search)) ||
        (item.description && item.description.toLowerCase().includes(search)) ||
        (item.category && item.category.toLowerCase().includes(search)) ||
        (item.location && item.location.toLowerCase().includes(search))
      );
    }
    
    // Apply additional filters
    if (filters.category && filters.category !== '') {
      filtered = filtered.filter(item => 
        item.category === filters.category
      );
    }
    
    if (filters.location && filters.location !== '') {
      filtered = filtered.filter(item => 
        item.location === filters.location
      );
    }
    
    if (filters.dateRange && filters.dateRange !== '') {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(filters.dateRange));
      
      filtered = filtered.filter(item => {
        if (!item.date) return true; // Include items without dates
        const itemDate = new Date(item.date);
        return itemDate >= date;
      });
    }
    
    // Process items to ensure they have proper image paths and format
    const processedItems = filtered.map(item => {
      // Ensure image path is correctly formatted
      if (item.image) {
        // If it's just a filename without a path, add the full path
        if (!item.image.startsWith('http') && !item.image.startsWith('/')) {
          item.image = `${API_BASE_URL}/uploads/${item.image}`;
        }
        // If it already has /uploads in the path but is missing the base URL
        else if (item.image.startsWith('/uploads/')) {
          item.image = `${API_BASE_URL}${item.image}`;
        }
        
        console.log('Image path in grid:', item.image);
      }
      return item;
    });
    
    console.log('Filtered items:', processedItems);
    return processedItems;
  }, [items, filters, searchTerm]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Navigate to report found item form
  const navigateToReportFoundItem = () => {
    navigate('/report-found');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-state">
        <div className="error-icon">
          ⚠️ {/* Warning emoji */}
        </div>
        <h3>Error Loading Items</h3>
        <p>{error}</p>
        <button onClick={fetchFoundItems} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="found-items-container" style={{ marginTop: '-10px' }}>
      <div className="found-items-header">
        <h1>Found Items</h1>
        <button className="primary-btn" onClick={navigateToReportFoundItem}>
          <i className="fas fa-plus"></i> Report Found Item
        </button>
      </div>
      
      <div className="search-filters">
        <form onSubmit={(e) => e.preventDefault()} className="search-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Search by name, description..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          <div className="form-group">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="category-select"
            >
              <option value="">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Books">Books</option>
              <option value="Personal">Personal</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button type="button" onClick={resetFilters} className="search-btn">
            <i className="fas fa-search"></i> Search
          </button>
        </form>
      </div>
      
      <div className="items-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <div key={item.id} className="item-card">
              <div className="item-image">
                <Image
                  src={item.image}
                  alt={item.title}
                  className="item-image"
                />
              </div>
              
              <div className="item-details">
                <h3>{item.title}</h3>
                
                <div className="item-actions">
                  <button 
                    onClick={() => handleViewDetails(item.id)} 
                    className="view-button"
                  >
                    View Details
                  </button>
                  
                  <button 
                    onClick={() => handleRequestItem(item.id)} 
                    className="request-button"
                    disabled={item.status === 'requested'}
                  >
                    {item.status === 'requested' ? 'Requested' : 'Request'}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-items-message">
            <h3>No found items available</h3>
            <p>There are currently no found items matching your criteria. Please check back later or adjust your filters.</p>
          </div>
        )}
      </div>
      
      {selectedItemId && (
        <ItemModal 
          itemId={selectedItemId} 
          onClose={handleCloseModal}
          onRequestItem={handleRequestItem}
        />
      )}
    </div>
  );
};

export default FoundItems; 