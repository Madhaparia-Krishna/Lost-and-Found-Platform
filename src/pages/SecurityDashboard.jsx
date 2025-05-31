import React, { useState, useEffect } from 'react';
import axios from 'axios';
import emailService from '../utils/emailService';
import '../styles/SecurityDashboard.css';

const SecurityDashboard = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('items');

  useEffect(() => {
    fetchPendingItems();
    fetchPendingClaims();
  }, []);

  const fetchPendingItems = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/security/pending-items', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setPendingItems(response.data);
      setLoading(false);
    } catch (error) {
      setError('Error fetching pending items');
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const fetchPendingClaims = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/security/pending-claims', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setPendingClaims(response.data);
      setLoading(false);
    } catch (error) {
      setError('Error fetching pending claims');
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleApproveItem = async (itemId) => {
    try {
      await axios.put(
        `http://localhost:5000/api/security/items/${itemId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      fetchPendingItems();
    } catch (error) {
      setError('Error approving item');
      console.error('Error:', error);
    }
  };

  const handleClaimAction = async (claimId, action) => {
    try {
      await axios.put(
        `http://localhost:5000/api/security/claims/${claimId}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      fetchPendingClaims();
    } catch (error) {
      setError('Error processing claim');
      console.error('Error:', error);
    }
  };

  // Send email notification manually
  const sendEmailNotification = async (email, name, item) => {
    try {
      const result = await emailService.sendMatchNotification(
        email,
        name,
        item.title,
        'manual-notification',
        {
          category: item.category,
          date: item.date || new Date(),
          description: item.description
        }
      );

      if (result.success) {
        alert(`Email notification sent to ${email}`);
      } else {
        alert('Failed to send email notification');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email notification');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Separate lost and found items
  const foundItems = pendingItems.filter(item => item.status === 'found');
  const lostItems = pendingItems.filter(item => item.status === 'lost');

  return (
    <div className="security-dashboard">
      <h1>Security Dashboard</h1>
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Pending Items ({foundItems.length})
        </button>
        <button
          className={`tab ${activeTab === 'lost' ? 'active' : ''}`}
          onClick={() => setActiveTab('lost')}
        >
          Lost Items ({lostItems.length})
        </button>
        <button
          className={`tab ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          Pending Claims ({pendingClaims.length})
        </button>
      </div>

      {activeTab === 'items' && (
        <div className="pending-items">
          <h2>Pending Found Items</h2>
          {foundItems.length === 0 ? (
            <p>No pending found items to review</p>
          ) : (
            <div className="items-grid">
              {foundItems.map((item) => (
                <div key={item.id} className="item-card">
                  {item.image && (
                    <div className="item-image">
                      <img src={item.image} alt={item.title} />
                    </div>
                  )}
                  <div className="item-details">
                    <h3>{item.title}</h3>
                    <p className="category">{item.category}</p>
                    <p className="description">{item.description}</p>
                    <p className="reporter">Reported by: {item.reporter_name}</p>
                    <p className="date">Date: {new Date(item.created_at).toLocaleDateString()}</p>
                    <button
                      className="approve-button"
                      onClick={() => handleApproveItem(item.id)}
                    >
                      Approve Item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'lost' && (
        <div className="lost-items">
          <h2>Lost Items</h2>
          {lostItems.length === 0 ? (
            <p>No lost items reported</p>
          ) : (
            <div className="items-grid">
              {lostItems.map((item) => (
                <div key={item.id} className="item-card lost-item-card">
                  {item.image && (
                    <div className="item-image">
                      <img src={item.image} alt={item.title} />
                    </div>
                  )}
                  <div className="item-details">
                    <div className="status-badge lost">Lost</div>
                    <h3>{item.title}</h3>
                    <p className="category">{item.category}</p>
                    <p className="description">{item.description}</p>
                    <p className="reporter">Reported by: {item.reporter_name}</p>
                    <p className="date">Date: {new Date(item.created_at).toLocaleDateString()}</p>
                    <button
                      className="notification-button"
                      onClick={() => sendEmailNotification(
                        "user@example.com", // You'll need to get the actual email
                        item.reporter_name,
                        item
                      )}
                    >
                      Send Match Notification
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="pending-claims">
          <h2>Pending Claims</h2>
          {pendingClaims.length === 0 ? (
            <p>No pending claims to review</p>
          ) : (
            <div className="claims-grid">
              {pendingClaims.map((claim) => (
                <div key={claim.id} className="claim-card">
                  <div className="claim-details">
                    <h3>Claim for: {claim.item_title}</h3>
                    <p className="claimer">Claimed by: {claim.claimer_name}</p>
                    <p className="description">{claim.claim_description}</p>
                    <p className="contact">Contact: {claim.contact_info}</p>
                    <p className="date">Date: {new Date(claim.created_at).toLocaleDateString()}</p>
                    <div className="claim-actions">
                      <button
                        className="approve-button"
                        onClick={() => handleClaimAction(claim.id, 'approve')}
                      >
                        Approve Claim
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => handleClaimAction(claim.id, 'reject')}
                      >
                        Reject Claim
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard; 