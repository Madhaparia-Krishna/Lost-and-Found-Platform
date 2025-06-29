/**
 * Notification Service
 * 
 * This service handles creating notifications for users when certain events occur.
 */

const mysql = require('mysql2/promise');
const config = require('../server-config');

// Create database connection pool (reusing the existing pool from server.js)
const pool = mysql.createPool(config.dbConfig);

// Reference to Socket.IO instance (will be set from server.js)
let io = null;

/**
 * Set the Socket.IO instance
 * 
 * @param {Object} socketIo - The Socket.IO instance
 */
function setSocketIO(socketIo) {
  io = socketIo;
  console.log('Socket.IO instance set in notification service');
}

/**
 * Create a new notification for a user
 * 
 * @param {number} userId - The ID of the user who will receive the notification
 * @param {string} message - The notification text
 * @param {string} linkUrl - A relative URL to navigate to when clicked
 * @returns {Promise<Object>} - The created notification or null if there was an error
 */
async function createNotification(userId, message, linkUrl) {
  try {
    // Validate input
    if (!userId || !message) {
      console.error('Invalid notification data: userId and message are required');
      return null;
    }

    console.log(`Creating notification for user ${userId}:`);
    console.log(`- Message: ${message}`);
    console.log(`- Link URL: ${linkUrl || 'None'}`);
    
    // Check if user is banned before creating notification
    const [userStatus] = await pool.query(
      'SELECT is_deleted FROM Users WHERE id = ?',
      [userId]
    );
    
    if (userStatus.length === 0 || userStatus[0].is_deleted) {
      console.log(`Skipping notification for user ${userId} - user does not exist or is banned`);
      return null;
    }

    // Insert notification into database
    try {
      const [result] = await pool.query(
        'INSERT INTO Notifications (user_id, message, link_url) VALUES (?, ?, ?)',
        [userId, message, linkUrl || null]
      );

      console.log(`✓ Notification created successfully with ID ${result.insertId}`);
      
      const notification = {
        id: result.insertId,
        user_id: userId,
        message,
        link_url: linkUrl || null,
        is_read: 0,
        created_at: new Date()
      };
      
      // Emit socket event if io is available
      if (io) {
        console.log(`Emitting notification event to user:${userId}`);
        io.to(`user:${userId}`).emit('new_notification', notification);
        
        // Also update the unread count
        try {
          const [unreadResult] = await pool.query(
            'SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND is_read = 0',
            [userId]
          );
          const unreadCount = unreadResult[0].count;
          io.to(`user:${userId}`).emit('unread_count', { count: unreadCount });
        } catch (countError) {
          console.error('Error getting unread count:', countError);
        }
      }
      
      return notification;
    } catch (dbError) {
      console.error('Database error creating notification:', dbError.message);
      
      // Check if the user exists
      try {
        const [users] = await pool.query('SELECT id FROM Users WHERE id = ?', [userId]);
        if (users.length === 0) {
          console.error(`Failed to create notification: User with ID ${userId} does not exist`);
        } else {
          console.error('Failed to create notification due to database error');
        }
      } catch (checkError) {
        console.error('Error checking if user exists:', checkError);
      }
      
      return null;
    }
  } catch (error) {
    console.error('Unexpected error creating notification:', error);
    return null;
  }
}

/**
 * Create a notification for all security staff
 * 
 * @param {string} message - The notification text
 * @param {string} linkUrl - A relative URL to navigate to when clicked
 * @returns {Promise<Array>} - Array of created notifications
 */
async function notifySecurityStaff(message, linkUrl) {
  try {
    console.log('=== SECURITY STAFF NOTIFICATION ===');
    console.log(`Message: ${message}`);
    console.log(`Link URL: ${linkUrl}`);
    
    // Get all active security staff users (not banned)
    const [securityUsers] = await pool.query(
      'SELECT id, name, email, role FROM Users WHERE (role = "security" OR role = "admin") AND is_deleted = FALSE'
    );
    
    console.log(`Found ${securityUsers.length} security staff to notify:`);
    securityUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Name: ${user.name}, Role: ${user.role}, Email: ${user.email}`);
    });
    
    const notifications = [];
    
    // Create a notification for each security staff member
    for (const user of securityUsers) {
      console.log(`Creating notification for security staff: ${user.name} (ID: ${user.id})`);
      const notification = await createNotification(user.id, message, linkUrl);
      if (notification) {
        console.log(`✓ Notification created successfully for ${user.name}`);
        notifications.push(notification);
      } else {
        console.error(`✗ Failed to create notification for ${user.name}`);
      }
    }
    
    // Emit a special event to the security-staff channel
    if (io) {
      console.log('Emitting security_notification event to security-staff channel');
      io.to('security-staff').emit('security_notification', {
        message,
        link_url: linkUrl,
        created_at: new Date()
      });
      
      // Also emit to individual security staff sockets
      for (const user of securityUsers) {
        console.log(`Emitting security_notification event to user:${user.id}`);
        io.to(`user:${user.id}`).emit('security_notification', {
          message,
          link_url: linkUrl,
          created_at: new Date()
        });
      }
    } else {
      console.warn('Socket.IO instance not available, real-time notifications will not be sent');
    }
    
    console.log(`Created ${notifications.length} security notifications`);
    console.log('=== END SECURITY NOTIFICATION ===');
    
    return notifications;
  } catch (error) {
    console.error('Error notifying security staff:', error);
    return [];
  }
}

module.exports = {
  createNotification,
  notifySecurityStaff,
  setSocketIO
}; 