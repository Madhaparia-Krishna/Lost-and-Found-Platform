import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { notificationsApi } from '../utils/api';
import { Toast, ToastContainer, Badge } from 'react-bootstrap';
import '../styles/Notification.css';

const MatchNotification = () => {
  const [matchNotifications, setMatchNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(true);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      fetchMatchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchMatchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchMatchNotifications = async () => {
    if (!currentUser) return;
    
    try {
      const result = await notificationsApi.getAll();
      
      if (result && result.notifications) {
        // Filter for unread match notifications only
        const matches = result.notifications.filter(notification => 
          notification.type === 'match' && notification.status === 'unread'
        );
        
        setMatchNotifications(matches);
      }
    } catch (error) {
      console.error('Error fetching match notifications:', error);
    }
  };

  const handleDismiss = async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setMatchNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };
  
  const handleClick = (notification) => {
    // Mark as read
    handleDismiss(notification.id);
    
    // Navigate to item details if available
    if (notification.related_item_id) {
      navigate(`/items/${notification.related_item_id}`);
    }
  };

  // Don't render anything if there are no match notifications
  if (matchNotifications.length === 0) {
    return null;
  }

  return (
    <ToastContainer className="match-notifications-container" position="top-end">
      {matchNotifications.map(notification => (
        <Toast 
          key={notification.id} 
          onClose={() => handleDismiss(notification.id)}
          show={showNotifications}
          className="match-notification-toast"
        >
          <Toast.Header>
            <i className="fas fa-search-plus me-2"></i>
            <strong className="me-auto">Potential Match Found</strong>
            <small>
              {new Date(notification.created_at).toLocaleTimeString()}
            </small>
          </Toast.Header>
          <Toast.Body onClick={() => handleClick(notification)} style={{ cursor: 'pointer' }}>
            <div className="match-notification-content">
              <p>{notification.message}</p>
              {notification.match_score && (
                <Badge bg="info" className="match-score-badge">
                  {Math.round(notification.match_score * 100)}% Match
                </Badge>
              )}
              <div className="match-notification-footer">
                <small>Click to view details</small>
              </div>
            </div>
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default MatchNotification; 