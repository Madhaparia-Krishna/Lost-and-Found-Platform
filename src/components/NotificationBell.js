import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import '../styles/Notification.css';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Add animation when unread count changes
  useEffect(() => {
    if (unreadCount > 0) {
      setAnimate(true);
      const timer = setTimeout(() => {
        setAnimate(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleToggle = () => {
    // If opening the dropdown and there are unread notifications, mark them as read
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = (notification) => {
    // If the notification is unread, mark it as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    // Close the dropdown
    setIsOpen(false);
  };

  return (
    <div className="notification-bell-container">
      <button 
        className={`notification-bell-button ${animate ? 'animate-bell' : ''}`}
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <i className="fas fa-bell" />
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
                className="mark-all-read-button"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <Link
                  key={notification.id}
                  to={notification.link_url || '#'}
                  className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                </Link>
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

export default NotificationBell; 