/**
 * Notification Routes
 * 
 * API routes for managing user notifications
 */

const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const config = require('../server-config');

// Create database connection pool (reusing the existing pool from server.js)
const pool = mysql.createPool(config.dbConfig);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the logged-in user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    // Get user ID from authenticated request
    const userId = req.user.id;
    
    // Query notifications from database, ordered by newest first
    const [notifications] = await pool.query(
      'SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    // Count unread notifications
    const [unreadResult] = await pool.query(
      'SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    
    const unreadCount = unreadResult[0].count;
    
    // Return notifications and count
    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private
 */
router.put('/:id/read', async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    // Make sure the notification belongs to the user
    const [notification] = await pool.query(
      'SELECT * FROM Notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    if (notification.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Update notification as read
    await pool.query(
      'UPDATE Notifications SET is_read = 1 WHERE id = ?',
      [notificationId]
    );
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

/**
 * @route   POST /api/notifications/mark-read
 * @desc    Mark all notifications as read for the current user
 * @access  Private
 */
router.post('/mark-read', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update all user's notifications as read
    await pool.query(
      'UPDATE Notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
});

module.exports = router; 