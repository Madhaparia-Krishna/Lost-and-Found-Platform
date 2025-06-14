/**
 * Script to add SystemLogs and UserActivity tables to the database
 */

const mysql = require('mysql2/promise');

// Database configuration - same as in server-config.js
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lost_and_found_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function main() {
  console.log('Starting table creation script...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check connection
    console.log('Checking database connection...');
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully');
    connection.release();
    
    // Check if SystemLogs table exists
    console.log('Checking if SystemLogs table exists...');
    const [systemLogsExists] = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = ?
      AND table_name = 'SystemLogs'
    `, [dbConfig.database]);
    
    if (systemLogsExists[0].count === 0) {
      console.log('SystemLogs table does not exist. Creating it...');
      await pool.query(`
        CREATE TABLE SystemLogs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          action VARCHAR(255) NOT NULL,
          details TEXT,
          user_id INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
        )
      `);
      console.log('SystemLogs table created successfully');
    } else {
      console.log('SystemLogs table already exists');
    }
    
    // Check if UserActivity table exists
    console.log('Checking if UserActivity table exists...');
    const [userActivityExists] = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = ?
      AND table_name = 'UserActivity'
    `, [dbConfig.database]);
    
    if (userActivityExists[0].count === 0) {
      console.log('UserActivity table does not exist. Creating it...');
      await pool.query(`
        CREATE TABLE UserActivity (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          action_details TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
        )
      `);
      console.log('UserActivity table created successfully');
    } else {
      console.log('UserActivity table already exists');
    }
    
    // Create helper function for logging system actions
    console.log('Creating helper functions for the new tables...');
    
    // Example of how to use the new tables in your application:
    console.log(`
    // Add these functions to your server.js file:

    // Helper function to log system actions
    async function logSystemAction(action, details, userId = null) {
      try {
        await pool.query(
          'INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)',
          [action, details, userId]
        );
      } catch (error) {
        console.error('Error logging system action:', error);
      }
    }

    // Helper function to track user activity
    async function trackUserActivity(userId, actionType, actionDetails, req) {
      try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        await pool.query(
          'INSERT INTO UserActivity (user_id, action_type, action_details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
          [userId, actionType, actionDetails, ipAddress, userAgent]
        );
      } catch (error) {
        console.error('Error tracking user activity:', error);
      }
    }
    `);
    
    console.log('Table creation script completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('Database connection pool closed');
  }
}

// Run the script
main().catch(console.error); 