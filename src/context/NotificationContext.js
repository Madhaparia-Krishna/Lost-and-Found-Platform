import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { notificationsApi } from '../utils/api';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useContext(AuthContext);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || !currentUser.token) return;

    try {
      setLoading(true);
      const data = await notificationsApi.getAll(currentUser.token);
      
      if (data && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!currentUser || !currentUser.token) return;

    try {
      await notificationsApi.markAsRead(notificationId, currentUser.token);
      
      // Update local state optimistically
      setNotifications(notifications.map(notification => 
        notification.id === notificationId
          ? { ...notification, is_read: 1 }
          : notification
      ));
      
      // Decrement unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [currentUser, notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser || !currentUser.token) return;

    try {
      await notificationsApi.markAllAsRead(currentUser.token);
      
      // Update local state optimistically
      setNotifications(notifications.map(notification => ({
        ...notification,
        is_read: 1
      })));
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [currentUser, notifications]);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      
      // Set up polling interval
      const interval = setInterval(fetchNotifications, 60000); // Poll every minute
      
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 