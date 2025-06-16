import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { itemsApi, API_BASE_URL } from '../utils/api';
import '../styles/ViewAllItems.css';
import { Modal, Button, Card, Container, Row, Col, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import ItemModal from '../components/ItemModal';

const ViewAllItems = () => {
  const { currentUser } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [searchParams, setSearchParams] = useState({
    search: '',
    category: ''
  });
  const [activeTab, setActiveTab] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [actionStatus, setActionStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  
  // Fallback image for when image loading fails
  const fallbackImageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,40 L70,40 L70,60 L30,60 Z' fill='%23d0d0d0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='12' text-anchor='middle' alignment-baseline='middle' fill='%23909090'%3ENo Image%3C/text%3E%3C/svg%3E";
  
  // Get search parameters from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const category = urlParams.get('category') || '';
    
    if (search || category) {
      setSearchParams({ search, category });
    }
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      setActionStatus(null);
      
      // Log the fetch attempt
      console.log('Fetching items from server...');
      
      // Use the API utility for better error handling
      const itemsArray = await itemsApi.getAll();
      console.log('All items received:', itemsArray.length);
      
      // Check if data is in the expected format
      if (!itemsArray || itemsArray.length === 0) {
        console.log('No items received from server');
        setItems([]);
        setActionStatus({
          type: 'info',
          message: 'No approved items found. Items must be approved by security staff before appearing here.'
        });
        return;
      }
      
      console.log('Sample item:', itemsArray[0]);
      
      // Filter to only show approved found items
      let filteredItems = itemsArray.filter(item => {
        // Log each item's approval status for debugging
        console.log(`Item ${item.id || 'unknown'}: title=${item.title}, status=${item.status}, approved=${item.is_approved === true ? 'true' : 'false'}, deleted=${item.is_deleted === true ? 'true' : 'false'}`);
        
        // Strict check to ensure item is approved
        const isApproved = item.is_approved === true;
        
        // Check for valid status (found, requested, received)
        // Exclude lost items from the view
        const hasValidStatus = item.status === 'found' || item.status === 'requested' || item.status === 'received';
        
        // Ensure item is not deleted
        const isNotDeleted = item.is_deleted !== true;
        
        // Only return true if all conditions are met
        return isApproved && hasValidStatus && isNotDeleted;
      });
      
      console.log('Filtered approved items:', filteredItems.length);
      
      // Apply search filters if present
      if (searchParams.search) {
        const searchTerm = searchParams.search.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.title?.toLowerCase().includes(searchTerm) || 
          (item.description && item.description.toLowerCase().includes(searchTerm))
        );
      }
      
      if (searchParams.category) {
        filteredItems = filteredItems.filter(item => 
          item.category === searchParams.category
        );
      }
      
      setItems(filteredItems);
      
      // Show message if no items match the criteria
      if (filteredItems.length === 0) {
        setActionStatus({
          type: 'info',
          message: 'No approved items found. Items must be approved by security staff before appearing here.'
        });
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Server may be down or overloaded.');
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your connection and ensure the server is running.');
      } else {
        setError(`Error fetching items: ${err.message || 'Unknown error'}`);
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch items when search parameters change or refresh is triggered
  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, refreshTrigger]);

  const handleImageError = (itemId) => {
    setImageErrors(prev => ({
      ...prev,
      [itemId]: true
    }));
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({
      search: e.target.search.value,
      category: e.target.category.value
    });
  };
  
  // Check if user has security/admin access
  const hasSecurityAccess = currentUser && 
    (currentUser.role === 'security' || currentUser.role === 'admin');

  // Refresh button to reload items
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Filter items based on active tab
  const getFilteredItems = () => {
    if (activeTab === 'all') {
      return items;
    } else if (activeTab === 'electronics') {
      return items.filter(item => item.category === 'Electronics');
    } else if (activeTab === 'documents') {
      return items.filter(item => item.category === 'Documents');
    } else if (activeTab === 'clothing') {
      return items.filter(item => item.category === 'Clothing');
    } else {
      return items.filter(item => 
        item.category !== 'Electronics' && 
        item.category !== 'Documents' && 
        item.category !== 'Clothing'
      );
    }
  };

  // Handle opening the modal with the selected item
  const openItemModal = (itemId) => {
    setSelectedItemId(itemId);
    setShowModal(true);
  };

  // Handle closing the modal
  const closeItemModal = () => {
    setShowModal(false);
    setSelectedItemId(null);
  };

  // Handle requesting an item (callback for ItemModal)
  const handleRequestItem = async (itemId) => {
    try {
      // Update the item status locally
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, status: 'requested' } 
            : item
        )
      );
      
      // Show success message
      setActionStatus({
        type: 'success',
        message: 'Item requested successfully. The security team will review your request.'
      });
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setActionStatus(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error requesting item:', error);
      setActionStatus({
        type: 'error',
        message: 'Failed to request item. Please try again.'
      });
    }
  };
  
  // Get filtered items based on active tab
  const filteredItems = getFilteredItems();

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading items...</p>
        </div>
      </Container>
    );
  }

  if (error && !error.includes('Using sample data')) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Items</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={handleRefresh}>Try Again</Button>
          </div>
        </Alert>
        <div className="mt-4">
          <h5>Troubleshooting tips:</h5>
          <ul>
            <li>Check if the server is running</li>
            <li>Ensure you're connected to the internet</li>
            <li>The server might be using a different port (currently trying port 5000)</li>
          </ul>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header Section */}
      <div className="bg-light p-4 rounded-3 mb-4 shadow-sm">
        <Container>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <h1 className="display-5">Found Items</h1>
            {currentUser && (
              <div className="d-flex align-items-center">
                <span className="me-2">Logged in as: {currentUser.name || currentUser.email}</span>
                <Badge bg={currentUser.role === 'admin' ? 'danger' : currentUser.role === 'security' ? 'warning' : 'info'}>
                  {currentUser.role}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="mt-3">
            <Link to="/" className="btn btn-outline-secondary me-2">Home</Link>
            <Link to="/found" className="btn btn-outline-primary me-2">Report Found Item</Link>
            <Link to="/lost" className="btn btn-outline-primary me-2">Report Lost Item</Link>
            {currentUser && currentUser.role === 'security' && (
              <Link to="/security" className="btn btn-outline-warning me-2">Security Dashboard</Link>
            )}
            {currentUser && currentUser.role === 'admin' && (
              <Link to="/admin" className="btn btn-outline-danger me-2">Admin Panel</Link>
            )}
          </div>
        </Container>
      </div>
      
      <Container>
        {/* Info Banner */}
        <Alert variant="info" className="mb-4">
          <p className="mb-0">This page displays only items that have been approved by security staff. If you've reported an item that's not visible here, it may still be pending approval.</p>
          {currentUser && currentUser.role === 'security' && (
            <p className="mb-0 mt-2">Security staff: To approve pending items, please visit the <Link to="/security">Security Dashboard</Link>.</p>
          )}
        </Alert>
        
        {/* Action Status */}
        {actionStatus && (
          <Alert variant={actionStatus.type === 'error' ? 'danger' : actionStatus.type === 'success' ? 'success' : 'info'} 
                 className="mb-4" dismissible>
            {actionStatus.message}
          </Alert>
        )}
        
        {/* Search Form */}
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <Form onSubmit={handleSearch}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Control
                    type="text"
                    name="search"
                    placeholder="Search items..."
                    defaultValue={searchParams.search}
                  />
                </Col>
                <Col md={3}>
                  <Form.Select name="category" defaultValue={searchParams.category}>
                    <option value="">All Categories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Books">Books</option>
                    <option value="Bags">Bags</option>
                    <option value="Documents">Documents</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Col>
                <Col md={3} className="d-flex">
                  <Button type="submit" variant="primary" className="me-2">Search</Button>
                  <Button type="button" variant="outline-secondary" onClick={handleRefresh}>
                    <i className="fas fa-sync-alt"></i> Refresh
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
        
        {/* Filter Tabs */}
        <div className="mb-4">
          <div className="d-flex flex-wrap gap-2">
            <Button 
              variant={activeTab === 'all' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('all')}
            >
              All Items ({items.length})
            </Button>
            <Button 
              variant={activeTab === 'electronics' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('electronics')}
            >
              Electronics ({items.filter(item => item.category === 'Electronics').length})
            </Button>
            <Button 
              variant={activeTab === 'documents' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('documents')}
            >
              Documents ({items.filter(item => item.category === 'Documents').length})
            </Button>
            <Button 
              variant={activeTab === 'clothing' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('clothing')}
            >
              Clothing ({items.filter(item => item.category === 'Clothing').length})
            </Button>
            <Button 
              variant={activeTab === 'other' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('other')}
            >
              Other ({items.filter(item => 
                item.category !== 'Electronics' && 
                item.category !== 'Documents' && 
                item.category !== 'Clothing'
              ).length})
            </Button>
          </div>
        </div>
        
        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <Alert variant="light" className="text-center py-5">
            <i className="fas fa-search fa-3x mb-3 text-muted"></i>
            <h4>No Items Found</h4>
            <p className="mb-0">
              {searchParams.search || searchParams.category ? 
                "No items match your search criteria" : 
                "No approved items available at the moment. Check back later."}
            </p>
          </Alert>
        ) : (
          <Row xs={2} md={3} lg={4} className="g-4">
            {filteredItems.map(item => (
              <Col key={item.id || Math.random()}>
                <div className="item-perfect-square">
                  <Card className="item-square-card shadow-sm hover-effect">
                    <div className="square-image-container">
                      {item.image && !imageErrors[item.id] ? (
                        <Card.Img 
                          variant="top" 
                          src={`${API_BASE_URL}/uploads/${item.image}`}
                          alt={item.title || 'Found Item'}
                          className="item-square-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = fallbackImageSrc;
                            handleImageError(item.id);
                          }}
                        />
                      ) : (
                        <div className="bg-light d-flex justify-content-center align-items-center h-100">
                          <i className="fas fa-image fa-3x text-muted"></i>
                        </div>
                      )}
                      <Badge 
                        bg={
                          item.status === 'found' ? 'success' : 
                          item.status === 'requested' ? 'warning' : 
                          item.status === 'received' ? 'primary' : 
                          'secondary'
                        }
                        className="position-absolute top-0 end-0 m-2"
                      >
                        {item.status === 'found' ? 'Found' : 
                         item.status === 'requested' ? 'Requested' : 
                         item.status === 'received' ? 'Received' : 
                         'Unknown'}
                      </Badge>
                    </div>
                    <Card.Body className="d-flex flex-column align-items-center text-center">
                      <Card.Title className="item-title mb-3">{item.title || 'Untitled Item'}</Card.Title>
                      <div className="d-grid gap-2 w-100">
                        <Button 
                          variant="outline-primary" 
                          onClick={() => openItemModal(item.id)}
                          size="sm"
                        >
                          <i className="fas fa-search me-1"></i> View Details
                        </Button>
                        {currentUser && item.status === 'found' && (
                          <Button 
                            variant="outline-success"
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setShowModal(true);
                            }}
                            disabled={item.status !== 'found'}
                            size="sm"
                          >
                            <i className="fas fa-hand-paper me-1"></i> Request
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </Container>
      
      {/* Item Detail Modal using the enhanced ItemModal component */}
      {showModal && selectedItemId && (
        <ItemModal
          itemId={selectedItemId}
          onClose={closeItemModal}
          onRequestItem={handleRequestItem}
          refreshItems={handleRefresh}
        />
      )}
    </Container>
  );
};

export default ViewAllItems; 