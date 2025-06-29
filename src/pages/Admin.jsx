import React, { useState, useContext } from 'react';
import AdminDashboard from './AdminDashboard';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const Admin = () => {
  const { currentUser } = useContext(AuthContext);
  const [testMessage, setTestMessage] = useState('Test security notification from Admin panel');
  const [notificationResult, setNotificationResult] = useState(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  
  const handleTestNotification = async () => {
    try {
      setNotificationLoading(true);
      setNotificationResult(null);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/debug/notify-security`,
        { message: testMessage },
        {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setNotificationResult({
        success: true,
        message: `Successfully sent notification to ${response.data.notificationsCreated} security staff`,
        details: response.data
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      setNotificationResult({
        success: false,
        message: error.response?.data?.message || 'Failed to send notification',
        details: error.response?.data
      });
    } finally {
      setNotificationLoading(false);
    }
  };
  
  return (
    <>
      <AdminDashboard />
      <div className="admin-card">
        <h3>Test Security Notifications</h3>
        <div className="admin-form-group">
          <label>Notification Message:</label>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="admin-input"
          />
        </div>
        <button
          onClick={handleTestNotification}
          className="admin-button"
          disabled={notificationLoading}
        >
          {notificationLoading ? 'Sending...' : 'Send Test Notification'}
        </button>
        
        {notificationResult && (
          <div className={`notification-result ${notificationResult.success ? 'success' : 'error'}`}>
            <p>{notificationResult.message}</p>
            {notificationResult.details && (
              <pre>{JSON.stringify(notificationResult.details, null, 2)}</pre>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Admin; 