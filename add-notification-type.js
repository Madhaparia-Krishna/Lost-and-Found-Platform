require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function addNotificationType() {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(config.dbConfig);
    
    // Check if the type column exists
    console.log('Checking if type column exists in Notifications table...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${config.dbConfig.database}' 
      AND TABLE_NAME = 'Notifications' 
      AND COLUMN_NAME = 'type'
    `);
    
    if (columns.length === 0) {
      console.log('Adding type column to Notifications table...');
      await connection.query(`
        ALTER TABLE Notifications 
        ADD COLUMN type ENUM('match', 'claim', 'request', 'system', 'approval') DEFAULT 'system' AFTER message
      `);
      console.log('Successfully added type column to Notifications table');
    } else {
      console.log('Type column already exists in Notifications table');
    }
    
    // Check if related_item_id column exists
    console.log('Checking if related_item_id column exists in Notifications table...');
    const [itemIdColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${config.dbConfig.database}' 
      AND TABLE_NAME = 'Notifications' 
      AND COLUMN_NAME = 'related_item_id'
    `);
    
    if (itemIdColumns.length === 0) {
      console.log('Adding related_item_id column to Notifications table...');
      await connection.query(`
        ALTER TABLE Notifications 
        ADD COLUMN related_item_id INT DEFAULT NULL AFTER type,
        ADD FOREIGN KEY (related_item_id) REFERENCES Items(id) ON DELETE SET NULL
      `);
      console.log('Successfully added related_item_id column to Notifications table');
    } else {
      console.log('related_item_id column already exists in Notifications table');
    }
    
    await connection.end();
    console.log('Database update completed successfully');
  } catch (error) {
    console.error('Error updating database:', error);
  }
}

addNotificationType(); 