require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function checkRecentItems() {
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
    
    // Check the most recently added items (last 30 minutes)
    console.log('\nChecking items added in the last 30 minutes:');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const formattedTime = thirtyMinutesAgo.toISOString().slice(0, 19).replace('T', ' ');
    
    const [recentItems] = await connection.query(`
      SELECT id, title, status, is_approved, created_at, user_id 
      FROM Items 
      WHERE created_at > ?
      ORDER BY created_at DESC
    `, [formattedTime]);
    
    if (recentItems.length === 0) {
      console.log('No items added in the last 30 minutes.');
    } else {
      console.log(`Found ${recentItems.length} recently added items:`);
      recentItems.forEach(item => {
        console.log(`ID: ${item.id}, Title: ${item.title}, Status: ${item.status}, Approved: ${item.is_approved ? 'Yes' : 'No'}, Created: ${item.created_at}`);
      });
    }
    
    // Check if there are any issues with the is_approved field
    console.log('\nChecking for potential issues with is_approved field:');
    const [items] = await connection.query(`
      SELECT id, title, status, is_approved, created_at
      FROM Items
      WHERE status = 'found'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    items.forEach(item => {
      console.log(`ID: ${item.id}, Title: ${item.title}, is_approved: ${item.is_approved} (type: ${typeof item.is_approved})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      console.log('\nClosing database connection...');
      await connection.end();
    }
  }
}

checkRecentItems(); 