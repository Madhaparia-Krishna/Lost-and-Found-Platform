/**
 * Notification Service
 * 
 * This service handles creating notifications for users when certain events occur.
 */

const mysql = require('mysql2/promise');
const config = require('../server-config');

// Create database connection pool (reusing the existing pool from server.js)
const pool = mysql.createPool(config.dbConfig);

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

    // Insert notification into database
    try {
      const [result] = await pool.query(
        'INSERT INTO Notifications (user_id, message, link_url) VALUES (?, ?, ?)',
        [userId, message, linkUrl || null]
      );

      console.log(`✓ Notification created successfully with ID ${result.insertId}`);
      
      return {
        id: result.insertId,
        user_id: userId,
        message,
        link_url: linkUrl || null,
        is_read: 0,
        created_at: new Date()
      };
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

module.exports = {
  createNotification
}; 