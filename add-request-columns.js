/**
 * This script adds the missing request_status and request_user_id columns to the Items table
 * Run this script with: node add-request-columns.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function addColumnsToItemsTable() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      ...config.dbConfig,
      multipleStatements: true
    });
    
    console.log('Connected! Adding missing columns to Items table...');
    
    // First check if columns exist
    console.log('Checking if columns already exist...');
    const [columns] = await connection.query('DESCRIBE Items');
    
    // Create arrays of column names and columns to add
    const existingColumns = columns.map(col => col.Field);
    const columnsToAdd = [
      { name: 'request_status', definition: 'VARCHAR(20) DEFAULT NULL' },
      { name: 'request_user_id', definition: 'INT DEFAULT NULL' },
      { name: 'rejection_reason', definition: 'VARCHAR(255) DEFAULT NULL' }
    ];
    
    // Filter out columns that already exist
    const columnsToAddFiltered = columnsToAdd.filter(col => !existingColumns.includes(col.name));
    
    if (columnsToAddFiltered.length === 0) {
      console.log('All columns already exist, nothing to add.');
    } else {
      // Create individual ALTER TABLE statements for each column
      for (const col of columnsToAddFiltered) {
        console.log(`Adding column ${col.name}...`);
        const alterSQL = `ALTER TABLE Items ADD COLUMN ${col.name} ${col.definition}`;
        await connection.query(alterSQL);
        console.log(`✓ Added column ${col.name}`);
      }
      console.log('✅ Successfully added all missing columns!');
    }
    
    // List the current columns
    const [updatedColumns] = await connection.query('DESCRIBE Items');
    console.log('\nCurrent columns in Items table:');
    updatedColumns.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type}`);
    });
    
    console.log('\nDone!');
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the function
addColumnsToItemsTable(); 