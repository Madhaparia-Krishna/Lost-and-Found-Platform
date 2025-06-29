/**
 * Script to check if notifications are being created in the database
 */

const mysql = require('mysql2/promise');
const config = require('./server-config');

async function checkNotifications() {
  let connection;
  try {
    console.log('Database config:', JSON.stringify(config.dbConfig));
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config.dbConfig);
    
    console.log('Connected to database');
    
    // Check the structure of the Notifications table
    console.log('Checking Notifications table structure...');
    try {
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM Notifications
      `);
      
      console.log('Notifications table structure:');
      columns.forEach(column => {
        console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(nullable)' : '(not null)'} ${column.Default ? `(default: ${column.Default})` : ''}`);
      });
    } catch (error) {
      console.error('Error checking table structure:', error.message);
    }
    
    // Get recent notifications
    console.log('\nFetching recent notifications...');
    try {
      const [notifications] = await connection.query(`
        SELECT * FROM Notifications ORDER BY created_at DESC LIMIT 10
      `);
      
      console.log(`Found ${notifications.length} recent notifications:`);
      notifications.forEach((notification, index) => {
        console.log(`\nNotification #${index + 1}:`);
        console.log(`- ID: ${notification.id}`);
        console.log(`- User ID: ${notification.user_id}`);
        console.log(`- Message: ${notification.message}`);
        console.log(`- Type: ${notification.type || 'N/A'}`);
        console.log(`- Status: ${notification.status || 'N/A'}`);
        console.log(`- Link URL: ${notification.link_url || 'N/A'}`);
        console.log(`- Is Read: ${notification.is_read !== undefined ? notification.is_read : 'N/A'}`);
        console.log(`- Created At: ${notification.created_at}`);
      });
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
    }
    
    // Check for unread notifications
    console.log('\nChecking for unread notifications...');
    try {
      const [unreadCount] = await connection.query(`
        SELECT COUNT(*) as count FROM Notifications WHERE user_id = 27 AND is_read = 0
      `);
      console.log(`Unread notifications for user 27: ${unreadCount[0].count}`);
    } catch (error) {
      console.error('Error checking unread notifications:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log('\nDatabase connection closed');
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
}

// Run the function
console.log('Starting script execution...');
checkNotifications(); 