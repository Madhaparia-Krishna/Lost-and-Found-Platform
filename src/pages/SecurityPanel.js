import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/SecurityPanel.css';

const SecurityPanel = () => {
  const { currentUser } = useContext(AuthContext);

  // Mock lost and found items data
  const mockItems = [
    { id: 1, title: 'Laptop', category: 'Electronics', location: 'Library', status: 'claimed', date: '2023-11-05' },
    { id: 2, title: 'Wallet', category: 'Personal', location: 'Cafeteria', status: 'claimed', date: '2023-11-07' },
    { id: 3, title: 'Textbook', category: 'Books', location: 'Science Building', status: 'returned', date: '2023-11-08' },
    { id: 4, title: 'Water Bottle', category: 'Personal', location: 'Gym', status: 'claimed', date: '2023-11-10' },
    { id: 5, title: 'Student ID Card', category: 'Documents', location: 'Administration', status: 'returned', date: '2023-11-12' },
  ];

  // Mock claims data
  const mockClaims = [
    { id: 1, itemId: 1, claimerName: 'John Doe', status: 'pending', date: '2023-11-06' },
    { id: 2, itemId: 2, claimerName: 'Jane Smith', status: 'approved', date: '2023-11-08' },
    { id: 3, itemId: 4, claimerName: 'Alice Johnson', status: 'pending', date: '2023-11-11' },
  ];

  const handleClaimAction = (claimId, action) => {
    // In a real app, this would update the database
    console.log(`Claim ${claimId} ${action}`);
    alert(`Claim ${claimId} has been ${action}`);
  };

  return (
    <div className="security-panel">
      <div className="panel-header">
        <h1>Security Panel</h1>
        <div className="user-info">
          <span>Logged in as: {currentUser.name}</span>
          <span className="role-badge">{currentUser.role}</span>
        </div>
      </div>

      <div className="panel-content">
        <div className="panel-section">
          <h2>Pending Claims</h2>
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
              {mockClaims.map(claim => {
                const item = mockItems.find(item => item.id === claim.itemId);
                return (
                  <tr key={claim.id} className={claim.status === 'pending' ? 'pending-row' : ''}>
                    <td>{claim.id}</td>
                    <td>{item ? item.title : 'Unknown Item'}</td>
                    <td>{claim.claimerName}</td>
                    <td>{claim.date}</td>
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
                          >
                            Approve
                          </button>
                          <button 
                            className="reject-btn"
                            onClick={() => handleClaimAction(claim.id, 'rejected')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel-section">
          <h2>Recent Item Activity</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Item</th>
                <th>Category</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockItems.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.title}</td>
                  <td>{item.category}</td>
                  <td>{item.location}</td>
                  <td>{item.date}</td>
                  <td>
                    <span className={`status-badge status-${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SecurityPanel; 