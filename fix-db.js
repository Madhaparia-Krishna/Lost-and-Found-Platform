// Script to fix the Items table status enum
require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function fixDatabase() {
  // Create connection to database
  const connection = await mysql.createConnection({
    host: config.dbConfig.host,
    user: config.dbConfig.user,
    password: config.dbConfig.password,
    database: config.dbConfig.database,
  });

  try {
    console.log('Connected to database. Attempting to update Items table schema...');
    
    // Try to alter the Items table to include 'found' and 'lost' in the status enum
    await connection.query(`
      ALTER TABLE Items 
      MODIFY COLUMN status ENUM('lost', 'found', 'claimed', 'returned') NOT NULL
    `);
    
    console.log('Table schema updated successfully!');
    
    // Verify the change
    const [rows] = await connection.query('SHOW COLUMNS FROM Items LIKE "status"');
    console.log('Updated status field type:', rows[0].Type);
    
  } catch (error) {
    console.error('Error updating database schema:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

// Run the function
fixDatabase(); 