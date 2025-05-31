// Script to add the missing subcategory column to the Items table
require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function addSubcategoryColumn() {
  // Create connection to database
  const connection = await mysql.createConnection({
    host: config.dbConfig.host,
    user: config.dbConfig.user,
    password: config.dbConfig.password,
    database: config.dbConfig.database,
  });

  try {
    console.log('Connected to database. Adding subcategory column to Items table...');
    
    // Add the subcategory column
    await connection.query(`
      ALTER TABLE Items 
      ADD COLUMN subcategory VARCHAR(50) NULL AFTER category
    `);
    
    console.log('Subcategory column added successfully!');
    
    // Verify the change
    const [columns] = await connection.query('SHOW COLUMNS FROM Items');
    console.log('\nUpdated Items table columns:');
    columns.forEach(column => {
      console.log(`${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Error updating database schema:', error);
  } finally {
    await connection.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the function
addSubcategoryColumn(); 