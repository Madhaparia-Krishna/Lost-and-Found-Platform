// Script to check database connection and Items table structure
require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function checkDatabase() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: config.dbConfig.host,
      user: config.dbConfig.user,
      password: config.dbConfig.password,
      database: config.dbConfig.database
    });
    
    console.log('Connected to database successfully!');
    
    // Check recently added found items
    console.log('\nChecking recently added found items:');
    const [foundItems] = await connection.query(`
      SELECT id, title, status, is_approved, created_at, user_id 
      FROM Items 
      WHERE status = 'found' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (foundItems.length === 0) {
      console.log('No found items in the database.');
    } else {
      console.log(`Found ${foundItems.length} items:`);
      foundItems.forEach(item => {
        console.log(`ID: ${item.id}, Title: ${item.title}, Approved: ${item.is_approved ? 'Yes' : 'No'}, Created: ${item.created_at}`);
      });
    }
    
    // Check pending found items (not approved)
    console.log('\nChecking pending found items (not approved):');
    const [pendingItems] = await connection.query(`
      SELECT id, title, status, is_approved, created_at, user_id 
      FROM Items 
      WHERE status = 'found' AND is_approved = FALSE AND is_deleted = FALSE
      ORDER BY created_at DESC
    `);
    
    if (pendingItems.length === 0) {
      console.log('No pending found items in the database.');
    } else {
      console.log(`Found ${pendingItems.length} pending items:`);
      pendingItems.forEach(item => {
        console.log(`ID: ${item.id}, Title: ${item.title}, Created: ${item.created_at}`);
      });
    }
    
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
checkDatabase(); 