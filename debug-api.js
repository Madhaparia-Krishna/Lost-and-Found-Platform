const mysql = require('mysql2/promise');
const config = require('./server-config');

async function debugPendingItemsAPI() {
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
    
    // Execute the same query that the API endpoint uses
    console.log('\nExecuting the same query as the API endpoint:');
    const [items] = await connection.query(`
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
    
    console.log(`Query returned ${items.length} items`);
    
    // Check for pending found items
    const pendingFoundItems = items.filter(item => 
      item.status === 'found' && (item.is_approved === false || item.is_approved === 0)
    );
    
    console.log(`\nFound ${pendingFoundItems.length} pending found items:`);
    pendingFoundItems.forEach(item => {
      console.log(`ID: ${item.id}, Title: ${item.title}, Status: ${item.status}, Approved: ${item.is_approved}, Type: ${typeof item.is_approved}`);
    });
    
    // Check for lost items
    const lostItems = items.filter(item => item.status === 'lost');
    console.log(`\nFound ${lostItems.length} lost items`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      console.log('\nClosing database connection...');
      await connection.end();
    }
  }
}

debugPendingItemsAPI(); 