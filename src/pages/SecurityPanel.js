import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/SecurityPanel.css';

const SecurityPanel = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [activeTab, setActiveTab] = useState('claims');

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || (currentUser.role !== 'security' && currentUser.role !== 'admin')) {
        navigate('/unauthorized');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch items
        const itemsResponse = await fetch('/api/security/items', {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!itemsResponse.ok) {
          throw new Error('Failed to fetch items');
        }

        const itemsData = await itemsResponse.json();
        setItems(itemsData.items || []);

        // Fetch claims
        const claimsResponse = await fetch('/api/security/claims', {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });

        if (!claimsResponse.ok) {
          throw new Error('Failed to fetch claims');
        }

        const claimsData = await claimsResponse.json();
        setClaims(claimsData.claims || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load security panel data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  // Handle claim status update
  const handleClaimAction = async (claimId, newStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/security/claims/${claimId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update claim status');
      }

      const data = await response.json();
      
      // Update claims in state
      setClaims(claims.map(claim => 
        claim.id === claimId ? { ...claim, status: newStatus } : claim
      ));

      // Refresh items list to reflect changes
      const itemsResponse = await fetch('/api/security/items', {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setItems(itemsData.items || []);
      }

      alert(`Claim has been ${newStatus}`);
    } catch (err) {
      console.error('Error updating claim status:', err);
      alert('Failed to update claim: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle item status update
  const handleItemStatusChange = async (itemId, newStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/security/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update item status');
      }

      const data = await response.json();
      
      // Update items in state
      setItems(items.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      ));

      alert(`Item status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating item status:', err);
      alert('Failed to update item status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Switch to admin panel
  const handleSwitchToAdmin = () => {
    navigate('/admin');
  };

  if (loading && items.length === 0 && claims.length === 0) {
    return <div className="security-panel loading">Loading security panel...</div>;
  }

  return (
    <div className="security-panel">
      <div className="panel-header">
        <h1>Security Panel</h1>
        <div className="user-info">
          <span>Logged in as: {currentUser.name}</span>
          <span className="role-badge">{currentUser.role}</span>
          {currentUser.role === 'admin' && (
            <button className="switch-panel-btn" onClick={handleSwitchToAdmin}>
              Switch to Admin Panel
            </button>
          )}
          <Link to="/" className="back-home-link">Back to Home</Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="panel-navigation">
        <button 
          className={`nav-tab ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          Pending Claims
        </button>
        <button 
          className={`nav-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items Management
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'claims' && (
          <div className="panel-section">
            <h2>Claims Management</h2>
            {claims.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item</th>
                    <th>Claimer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map(claim => (
                    <tr key={claim.id} className={claim.status === 'pending' ? 'pending-row' : ''}>
                      <td>{claim.id}</td>
                      <td>{claim.item_title || 'Unknown Item'}</td>
                      <td>{claim.claimer_name || 'Unknown User'}</td>
                      <td>{formatDate(claim.date || claim.created_at)}</td>
                      <td>
                        <span className={`status-badge status-${claim.status}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="action-buttons">
                        {claim.status === 'pending' && (
                          <>
                            <button 
                              className="approve-btn"
                              onClick={() => handleClaimAction(claim.id, 'approved')}
                              disabled={loading}
                            >
                              Approve
                            </button>
                            <button 
                              className="reject-btn"
                              onClick={() => handleClaimAction(claim.id, 'rejected')}
                              disabled={loading}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No claims found.</p>
            )}
          </div>
        )}

        {activeTab === 'items' && (
          <div className="panel-section">
            <h2>Items Management</h2>
            {items.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.title}</td>
                      <td>{item.category || 'N/A'}</td>
                      <td>{item.location || 'N/A'}</td>
                      <td>{formatDate(item.date || item.created_at)}</td>
                      <td>
                        <span className={`status-badge status-${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <select 
                          value={item.status}
                          onChange={(e) => handleItemStatusChange(item.id, e.target.value)}
                          className="status-select"
                          disabled={loading}
                        >
                          <option value="claimed">Claimed</option>
                          <option value="returned">Returned</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No items found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityPanel; 