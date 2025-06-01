// Script to update an existing item with a test image
require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function updateItemWithTestImage() {
  let connection;
  try {
    console.log('Connecting to database...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: config.dbConfig.host,
      user: config.dbConfig.user,
      password: config.dbConfig.password,
      database: config.dbConfig.database
    });
    
    console.log('Connected to database successfully!');
    
    // Check if there are any items with status 'found'
    const [foundItems] = await connection.query('SELECT id FROM Items WHERE status = "found" AND is_approved = TRUE LIMIT 1');
    
    if (foundItems.length === 0) {
      console.log('No found items exist in the database. Creating a test item...');
      
      // Insert a new test item
      const [result] = await connection.query(`
        INSERT INTO Items 
          (title, category, description, location, status, date, user_id, image, is_approved) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Test Item', 
        'Books', 
        'This is a test item with an image', 
        'library', 
        'found', 
        new Date(), 
        1, // Assuming user ID 1 exists
        'test-image.png',
        TRUE
      ]);
      
      console.log(`Created new test item with ID: ${result.insertId}`);
    } else {
      // Update the existing found item with the test image
      const itemId = foundItems[0].id;
      console.log(`Updating found item ID ${itemId} with test image...`);
      
      await connection.query(
        'UPDATE Items SET image = ? WHERE id = ?',
        ['test-image.png', itemId]
      );
      
      console.log(`Successfully updated item ${itemId} with test image!`);
    }
    
    // Verify the update
    const [items] = await connection.query(
      'SELECT id, title, status, image FROM Items WHERE image IS NOT NULL'
    );
    
    console.log('\nItems with images:');
    console.log(items);
    
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
updateItemWithTestImage().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 