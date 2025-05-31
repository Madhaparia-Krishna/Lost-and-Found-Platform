// Script to check database connection and Items table structure
require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function checkDatabase() {
  let connection;
  try {
    console.log('Attempting to connect to database...');
    console.log('Database config:', {
      host: config.dbConfig.host,
      user: config.dbConfig.user,
      database: config.dbConfig.database
    });
    
    // Create connection
    connection = await mysql.createConnection({
      host: config.dbConfig.host,
      user: config.dbConfig.user,
      password: config.dbConfig.password,
      database: config.dbConfig.database
    });
    
    console.log('Connected to database successfully!');
    
    // Check Tables
    console.log('\nChecking database tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in database:');
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    
    // Check Items table structure
    console.log('\nChecking Items table structure...');
    try {
      const [columns] = await connection.query('DESCRIBE Items');
      console.log('Items table columns:');
      columns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } catch (error) {
      console.error('Error checking Items table:', error.message);
    }
    
    // Check Users table structure
    console.log('\nChecking Users table structure...');
    try {
      const [columns] = await connection.query('DESCRIBE Users');
      console.log('Users table columns:');
      columns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } catch (error) {
      console.error('Error checking Users table:', error.message);
    }
    
    // Check Items count
    console.log('\nChecking Items count...');
    try {
      const [totalCount] = await connection.query('SELECT COUNT(*) as count FROM Items');
      console.log(`Total items: ${totalCount[0].count}`);
      
      const [approvedCount] = await connection.query('SELECT COUNT(*) as count FROM Items WHERE is_approved = TRUE');
      console.log(`Approved items: ${approvedCount[0].count}`);
      
      const [notApprovedCount] = await connection.query('SELECT COUNT(*) as count FROM Items WHERE is_approved = FALSE');
      console.log(`Not approved items: ${notApprovedCount[0].count}`);
      
      // Sample Items data
      if (totalCount[0].count > 0) {
        console.log('\nSample items data:');
        const [sampleItems] = await connection.query('SELECT * FROM Items LIMIT 2');
        console.log(JSON.stringify(sampleItems, null, 2));
      }
    } catch (error) {
      console.error('Error checking Items count:', error.message);
    }
    
    // Try the exact query from the endpoint
    console.log('\nTrying endpoint query...');
    try {
      const [items] = await connection.query(`
        SELECT 
          i.id,
          i.title,
          i.category,
          i.description,
          i.status,
          i.image,
          i.created_at,
          u.name as reporter_name
        FROM Items i
        JOIN Users u ON i.user_id = u.id
        WHERE i.is_deleted = FALSE 
        AND i.is_approved = TRUE
        ORDER BY i.created_at DESC
      `);
      console.log(`Query successful! Found ${items.length} items`);
    } catch (error) {
      console.error('Error with endpoint query:', error.message);
      // Try a simpler version
      try {
        console.log('Trying simpler query without JOIN...');
        const [items] = await connection.query(`
          SELECT * FROM Items WHERE is_deleted = FALSE AND is_approved = TRUE
        `);
        console.log(`Simpler query successful! Found ${items.length} items`);
      } catch (error2) {
        console.error('Error with simpler query:', error2.message);
      }
    }
    
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    if (connection) {
      console.log('\nClosing database connection...');
      await connection.end();
    }
  }
}

// Run the check
checkDatabase().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 