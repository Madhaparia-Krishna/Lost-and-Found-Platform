import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { notificationsApi } from '../utils/api';
import { AuthContext } from './AuthContext';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const { currentUser } = useContext(AuthContext);

  // Initialize socket connection
  useEffect(() => {
    if (currentUser && currentUser.token) {
      console.log('Setting up socket connection for user:', currentUser.id);
      
      // Create socket connection
      const newSocket = io(API_BASE_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });
      
      // Set up socket event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected with ID:', newSocket.id);
        
        // Authenticate socket connection
        console.log('Authenticating socket with token...');
        newSocket.emit('authenticate', currentUser.token);
      });
      
      newSocket.on('authenticated', (response) => {
        if (response.success) {
          console.log('Socket authenticated successfully for user:', currentUser.id);
          console.log('User role:', currentUser.role);
          
          // Force fetch notifications after authentication
          setTimeout(() => {
            console.log('Fetching notifications after socket authentication...');
            fetchNotifications();
          }, 1000);
        } else {
          console.error('Socket authentication failed:', response.error);
        }
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected. Reason:', reason);
      });
      
      // Store socket in state
      setSocket(newSocket);
      
      // Clean up on unmount
      return () => {
        console.log('Cleaning up socket connection');
        newSocket.disconnect();
      };
    }
  }, [currentUser]);
  
  // Set up notification event listeners
  useEffect(() => {
    if (socket) {
      console.log('Setting up notification event listeners...');
      
      // Listen for new notifications
      socket.on('new_notification', (notification) => {
        console.log('🔔 Received new notification:', notification);
        
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            // Determine notification type and customize the browser notification
            let title = 'New Notification';
            let icon = '/favicon.ico';
            
            // Check notification message to determine type
            if (notification.message.includes('match')) {
              title = 'Item Match Found!';
              icon = '/images/favicon.svg';
            } else if (notification.message.includes('found item')) {
              title = 'New Found Item';
              icon = '/images/favicon.svg';
            } else if (notification.message.includes('approved')) {
              title = 'Request Approved';
              icon = '/images/favicon.svg';
            } else if (notification.message.includes('rejected')) {
              title = 'Request Rejected';
              icon = '/images/favicon.svg';
            }
            
            new Notification(title, {
              body: notification.message,
              icon: icon
            });
          } catch (e) {
            console.log('Browser notification failed:', e);
          }
        }
        
        // Add new notification to state
        setNotifications(prev => {
          // Check if notification already exists to prevent duplicates
          const exists = prev.some(n => n.id === notification.id);
          if (exists) {
            return prev;
          }
          return [notification, ...prev];
        });
        
        // Increment unread count
        setUnreadCount(prev => prev + 1);
      });
      
      // Listen for notification read events
      socket.on('notification_read', ({ id, unreadCount }) => {
        console.log('Notification marked as read:', id);
        
        // Update notification in state
        setNotifications(prev => prev.map(notification => 
          notification.id === id
            ? { ...notification, is_read: 1 }
            : notification
        ));
        
        // Update unread count
        setUnreadCount(unreadCount);
      });
      
      // Listen for notification deleted events
      socket.on('notification_deleted', ({ id, unreadCount }) => {
        console.log('Notification deleted:', id);
        
        // Remove notification from state
        setNotifications(prev => prev.filter(notification => notification.id !== id));
        
        // Update unread count
        setUnreadCount(unreadCount);
      });
      
      // Listen for all notifications read event
      socket.on('all_notifications_read', () => {
        console.log('All notifications marked as read');
        
        // Update all notifications in state
        setNotifications(prev => prev.map(notification => ({
          ...notification,
          is_read: 1
        })));
        
        // Reset unread count
        setUnreadCount(0);
      });
      
      // Listen for unread count updates
      socket.on('unread_count', ({ count }) => {
        console.log('Unread count updated:', count);
        setUnreadCount(count);
      });
      
      // Listen for security notifications if user is security or admin
      if (currentUser && (currentUser.role === 'security' || currentUser.role === 'admin')) {
        console.log('Setting up security notification listener for', currentUser.role);
        
        socket.on('security_notification', (data) => {
          console.log('🚨 Received security notification:', data);
          
          // Show browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              // Determine security notification type
              let title = 'Security Alert';
              let icon = '/images/favicon.svg';
              
              // Check notification message to determine type
              if (data.message.includes('request')) {
                title = 'New Item Request';
              } else if (data.message.includes('found item')) {
                title = 'New Found Item';
              } else if (data.message.includes('lost item')) {
                title = 'New Lost Item Report';
              }
              
              new Notification(title, {
                body: data.message,
                icon: icon
              });
            } catch (e) {
              console.log('Browser notification failed:', e);
            }
          }
          
          // We'll fetch notifications to get the proper notification object
          fetchNotifications();
          
          // Dispatch a custom event that the SecurityDashboard can listen for
          const event = new CustomEvent('security_notification', { detail: data });
          window.dispatchEvent(event);
        });
      }
      
      // Clean up event listeners
      return () => {
        socket.off('new_notification');
        socket.off('notification_read');
        socket.off('notification_deleted');
        socket.off('all_notifications_read');
        socket.off('unread_count');
        socket.off('security_notification');
      };
    }
  }, [socket, currentUser]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || !currentUser.token) {
      console.log('Cannot fetch notifications: No user or token');
      return;
    }

    try {
      console.log('Fetching notifications for user:', currentUser.id);
      setLoading(true);
      const data = await notificationsApi.getAll(currentUser.token);
      
      if (data && data.notifications) {
        console.log(`Received ${data.notifications.length} notifications, ${data.unreadCount} unread`);
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      } else {
        console.log('No notifications data received');
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
      const response = await notificationsApi.markAsRead(notificationId, currentUser.token);
      
      // Update local state optimistically
      setNotifications(notifications.map(notification => 
        notification.id === notificationId
          ? { ...notification, is_read: 1 }
          : notification
      ));
      
      // Update unread count from response or decrement
      if (response && response.unreadCount !== undefined) {
        setUnreadCount(response.unreadCount);
      } else {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
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

  const deleteNotification = useCallback(async (notificationId) => {
    if (!currentUser || !currentUser.token) return;

    try {
      const response = await notificationsApi.deleteNotification(notificationId, currentUser.token);
      
      // Update local state optimistically
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
      
      // Update unread count from response or calculate
      if (response && response.unreadCount !== undefined) {
        setUnreadCount(response.unreadCount);
      } else {
        // Count unread notifications after removal
        const remainingUnread = notifications.filter(n => 
          n.id !== notificationId && n.is_read === 0
        ).length;
        setUnreadCount(remainingUnread);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error };
    }
  }, [currentUser, notifications]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      console.log('Requesting notification permission...');
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Fetch notifications when user changes
  useEffect(() => {
    if (currentUser) {
      console.log('User changed, fetching notifications...');
      fetchNotifications();
      
      // Initial fetch only, no polling needed since we're using sockets
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
        markAllAsRead,
        deleteNotification
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