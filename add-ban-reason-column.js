// Script to add ban_reason column to the Users table
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'lost_and_found_system'
};

async function addBanReasonColumn() {
  console.log('Adding ban_reason column to Users table...');
  
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully!');
    
    // Check if the column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'Users' 
      AND COLUMN_NAME = 'ban_reason'
    `, [dbConfig.database]);
    
    if (columns.length > 0) {
      console.log('\n✅ The ban_reason column already exists in the Users table.');
      return true;
    }
    
    // Add the column
    console.log('\nAdding ban_reason column...');
    await connection.query(`
      ALTER TABLE Users 
      ADD COLUMN ban_reason VARCHAR(255) NULL DEFAULT NULL
    `);
    
    // Verify the column was added
    const [newColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'Users' 
      AND COLUMN_NAME = 'ban_reason'
    `, [dbConfig.database]);
    
    if (newColumns.length > 0) {
      console.log('\n✅ The ban_reason column was added successfully!');
      return true;
    } else {
      console.log('\n❌ Failed to add the ban_reason column.');
      return false;
    }
  } catch (error) {
    console.error('Error adding ban_reason column:', error);
    return false;
  } finally {
    // Close the connection
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the function
addBanReasonColumn()
  .then(success => {
    if (success) {
      console.log('\nThe ban function should now work correctly.');
      console.log('Restart the server to apply the changes.');
    } else {
      console.log('\nFailed to add the ban_reason column. Please check the error messages above.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 