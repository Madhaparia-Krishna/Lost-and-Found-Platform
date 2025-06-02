require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function addTestItemNow() {
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
    
    // Get security user ID
    const [users] = await connection.query(`
      SELECT id FROM Users WHERE role = 'security' LIMIT 1
    `);
    
    if (users.length === 0) {
      console.log('No security user found. Creating test item with user_id = 1');
      userId = 1;
    } else {
      userId = users[0].id;
      console.log(`Using security user ID: ${userId}`);
    }
    
    // Add a test found item with is_approved explicitly set to FALSE
    const now = new Date();
    const title = `URGENT TEST ITEM ${now.toISOString().slice(0, 19).replace('T', ' ')}`;
    const [result] = await connection.query(`
      INSERT INTO Items 
        (title, category, description, location, status, date, user_id, is_approved) 
      VALUES 
        (?, 'Electronics', 'This is a URGENT test item added via script', 'Library', 'found', CURDATE(), ?, FALSE)
    `, [title, userId]);
    
    console.log(`Test item "${title}" added successfully with ID: ${result.insertId}`);
    
    // Verify the item was added with is_approved = FALSE
    const [items] = await connection.query(`
      SELECT id, title, status, is_approved 
      FROM Items 
      WHERE id = ?
    `, [result.insertId]);
    
    if (items.length > 0) {
      const item = items[0];
      console.log(`Verification: Item ID ${item.id}, Title: ${item.title}, Status: ${item.status}, Approved: ${item.is_approved ? 'Yes' : 'No'}`);
      console.log(`is_approved value: ${item.is_approved} (type: ${typeof item.is_approved})`);
    }
    
    console.log('\nNow check if this item appears in the Security Dashboard!');
    
    // Now check the pending items API directly
    console.log('\nChecking pending items API query directly:');
    const [pendingItems] = await connection.query(`
      SELECT 
        i.*,
        u.name as reporter_name
      FROM Items i
      JOIN Users u ON i.user_id = u.id
      WHERE i.is_deleted = FALSE 
      AND (
        (i.is_approved = FALSE AND i.status = 'found')
        OR 
        (i.status = 'lost')
      )
      ORDER BY i.created_at DESC
    `);
    
    console.log(`API query returned ${pendingItems.length} items`);
    
    // Check for pending found items
    const foundItems = pendingItems.filter(item => 
      item.status === 'found' && (item.is_approved === false || item.is_approved === 0)
    );
    
    console.log(`\nFound ${foundItems.length} pending found items:`);
    foundItems.forEach(item => {
      console.log(`ID: ${item.id}, Title: ${item.title}, Status: ${item.status}, Approved: ${item.is_approved}`);
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

addTestItemNow(); 