// Script to check and fix the database schema
require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');
const fs = require('fs');
const path = require('path');

async function fixDatabaseSchema() {
  let connection;
  try {
    console.log('Connecting to database...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: config.dbConfig.host,
      user: config.dbConfig.user,
      password: config.dbConfig.password,
      database: config.dbConfig.database,
      multipleStatements: true // Enable multiple statements
    });
    
    console.log('Connected to database successfully!');
    
    // Check the Items table schema
    console.log('\nChecking Items table schema...');
    const [columns] = await connection.query('DESCRIBE Items');
    
    // Check for specific columns
    const hasSubcategory = columns.some(col => col.Field === 'subcategory');
    const hasIsApproved = columns.some(col => col.Field === 'is_approved');
    const hasImageColumn = columns.some(col => col.Field === 'image');
    
    console.log('Schema check results:');
    console.log(`- subcategory column: ${hasSubcategory ? 'Present' : 'Missing'}`);
    console.log(`- is_approved column: ${hasIsApproved ? 'Present' : 'Missing'}`);
    console.log(`- image column: ${hasImageColumn ? 'Present' : 'Missing'}`);
    
    // Check status enum values
    const statusColumn = columns.find(col => col.Field === 'status');
    if (statusColumn) {
      const statusType = statusColumn.Type;
      console.log(`- status column type: ${statusType}`);
      
      const hasLostAndFound = statusType.includes('lost') && statusType.includes('found');
      console.log(`- status includes 'lost' and 'found': ${hasLostAndFound ? 'Yes' : 'No'}`);
      
      if (!hasLostAndFound) {
        console.log('\nFixing status enum to include lost and found...');
        await connection.query(`
          ALTER TABLE Items 
          MODIFY COLUMN status ENUM('lost', 'found', 'claimed', 'returned') NOT NULL
        `);
        console.log('Status enum updated successfully!');
      }
    }
    
    // Add missing columns if needed
    if (!hasSubcategory) {
      console.log('\nAdding subcategory column...');
      await connection.query(`
        ALTER TABLE Items 
        ADD COLUMN subcategory VARCHAR(50) AFTER category
      `);
      console.log('Subcategory column added successfully!');
    }
    
    if (!hasIsApproved) {
      console.log('\nAdding is_approved column...');
      await connection.query(`
        ALTER TABLE Items 
        ADD COLUMN is_approved BOOLEAN DEFAULT TRUE
      `);
      console.log('is_approved column added successfully!');
    }
    
    if (!hasImageColumn) {
      console.log('\nAdding image column...');
      await connection.query(`
        ALTER TABLE Items 
        ADD COLUMN image VARCHAR(255)
      `);
      console.log('Image column added successfully!');
    }
    
    // Verify the changes
    console.log('\nVerifying table structure after updates...');
    const [updatedColumns] = await connection.query('DESCRIBE Items');
    console.log('Updated Items table columns:');
    updatedColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // Check current data
    console.log('\nChecking current data in Items table...');
    const [items] = await connection.query(`
      SELECT id, title, category, subcategory, status, image, is_approved 
      FROM Items 
      LIMIT 5
    `);
    
    if (items.length > 0) {
      console.log('Sample items:');
      console.log(items);
    } else {
      console.log('No items found in the database.');
    }
    
    console.log('\nDatabase schema check and fix completed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      console.log('\nClosing database connection...');
      await connection.end();
    }
  }
}

// Run the function
fixDatabaseSchema().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 