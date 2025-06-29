/**
 * Script to add is_read column to Notifications table
 */

const mysql = require('mysql2/promise');
const config = require('./server-config');

async function addNotificationColumn() {
  try {
    console.log('Starting database update script...');
    console.log('Database config:', JSON.stringify(config.dbConfig));
    
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(config.dbConfig);
    
    console.log('Connected to database');
    console.log('Adding is_read column to Notifications table...');
    
    // Check if column exists first
    console.log('Checking if is_read column exists...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [config.dbConfig.database, 'Notifications', 'is_read']);
    
    console.log('Query result:', columns);
    
    if (columns.length > 0) {
      console.log('Column is_read already exists in Notifications table');
    } else {
      console.log('Column is_read does not exist, adding it now...');
      // Add the column
      await connection.query(`
        ALTER TABLE Notifications 
        ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0
      `);
      console.log('✅ Successfully added is_read column to Notifications table');
    }
    
    // Also check if link_url column exists
    console.log('Checking if link_url column exists...');
    const [linkColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [config.dbConfig.database, 'Notifications', 'link_url']);
    
    console.log('Query result:', linkColumns);
    
    if (linkColumns.length > 0) {
      console.log('Column link_url already exists in Notifications table');
    } else {
      console.log('Column link_url does not exist, adding it now...');
      // Add the column
      await connection.query(`
        ALTER TABLE Notifications 
        ADD COLUMN link_url VARCHAR(255) NULL
      `);
      console.log('✅ Successfully added link_url column to Notifications table');
    }
    
    console.log('Database update completed successfully');
    await connection.end();
    
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

// Run the function
console.log('Starting script execution...');
addNotificationColumn(); 