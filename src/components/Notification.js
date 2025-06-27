import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { notificationsApi } from '../utils/api';
import '../styles/Notification.css';

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    // Set up polling for new notifications
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    if (!currentUser || !currentUser.token) return;
    
    try {
      const result = await notificationsApi.getAll(currentUser.token);
      
      // Filter notifications based on user's reported items
      const relevantNotifications = (result.notifications || []).filter(notification => {
        // Only show match notifications for lost items reported by this user
        if (notification.type === 'match' && notification.item_status === 'lost') {
          return true;
        }
        
        // Only show new found item notifications for users who reported lost items
        if (notification.type === 'new_found_item' && notification.user_has_lost_items === true) {
          return true;
        }
        
        return false;
      });
      
      setNotifications(relevantNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    if (!currentUser || !currentUser.token) return;
    
    try {
      await notificationsApi.markAsRead(notificationId, currentUser.token);
      setNotifications(notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: 'read' }
          : notification
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const handleNotificationClick = (notification) => {
    // Close the dropdown
    setIsOpen(false);
    
    // Mark as read
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }
    
    // Navigate to related item if it exists
    if (notification.related_item_id) {
      navigate(`/items/${notification.related_item_id}`);
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  const matchNotifications = notifications.filter(n => n.type === 'match');
  const hasUnreadMatches = matchNotifications.some(n => n.status === 'unread');

  // Don't render if there are no notifications
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      <button 
        className={`notification-button ${hasUnreadMatches ? 'has-match' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read"
                onClick={() => notifications.forEach(n => markAsRead(n.id))}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notification-item ${notification.status} ${notification.type === 'match' ? 'match-notification' : ''} ${notification.type === 'new_found_item' ? 'found-item-notification' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    {notification.type === 'match' && (
                      <div className="notification-icon">
                        <i className="fas fa-search-plus"></i>
                      </div>
                    )}
                    {notification.type === 'new_found_item' && (
                      <div className="notification-icon">
                        <i className="fas fa-box-open"></i>
                      </div>
                    )}
                    <div className="notification-text">
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {notification.status === 'unread' && (
                    <button
                      className="mark-read-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      <i className="fas fa-check"></i> Mark as read
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="no-notifications">No notifications</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification; 