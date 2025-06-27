require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function checkDatabase() {
  console.log('Database Connection Checker');
  console.log('=========================');
  
  try {
    console.log('Database config:', {
      host: config.dbConfig.host,
      port: config.dbConfig.port,
      database: config.dbConfig.database,
      user: config.dbConfig.user,
      // Password omitted for security
    });
    
    console.log('\nAttempting to connect to database...');
    const connection = await mysql.createConnection(config.dbConfig);
    console.log('✅ Connected to database successfully!');
    
    // Check tables
    console.log('\nChecking database tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    
    // Check Notifications table structure
    console.log('\nChecking Notifications table structure...');
    const [notificationColumns] = await connection.query('DESCRIBE Notifications');
    console.log('Notifications table columns:');
    notificationColumns.forEach(column => {
      console.log(`- ${column.Field} (${column.Type})`);
    });
    
    // Check for existing notifications
    console.log('\nChecking for existing notifications...');
    const [notifications] = await connection.query('SELECT COUNT(*) as count FROM Notifications');
    console.log(`Found ${notifications[0].count} notifications in the database`);
    
    // Check Users table
    console.log('\nChecking Users table...');
    const [users] = await connection.query('SELECT COUNT(*) as count FROM Users');
    console.log(`Found ${users[0].count} users in the database`);
    
    // Check Items table
    console.log('\nChecking Items table...');
    const [items] = await connection.query('SELECT COUNT(*) as count, status FROM Items GROUP BY status');
    console.log('Items by status:');
    items.forEach(item => {
      console.log(`- ${item.status}: ${item.count}`);
    });
    
    // Close connection
    await connection.end();
    console.log('\nDatabase check completed successfully!');
  } catch (error) {
    console.error('\n❌ Database check failed:', error);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    // Provide troubleshooting tips based on error
    console.log('\nTroubleshooting tips:');
    if (error.code === 'ECONNREFUSED') {
      console.log('- Make sure MySQL server is running');
      console.log('- Check that the host and port are correct');
      console.log('- Verify firewall settings allow connections to MySQL');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('- Check username and password in .env file');
      console.log('- Verify the user has proper permissions');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('- Database does not exist. Run the database.sql script to create it');
      console.log('- Check the database name in .env file');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('- Table does not exist. Run the database.sql script to create all tables');
    }
  }
}

// Script to check if the ban_reason column exists in the Users table
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'lost_and_found_system'
};

async function checkBanReasonColumn() {
  console.log('Checking if ban_reason column exists in Users table...');
  
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully!');
    
    // Check if the column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'Users' 
      AND COLUMN_NAME = 'ban_reason'
    `, [dbConfig.database]);
    
    if (columns.length > 0) {
      console.log('\n✅ The ban_reason column EXISTS in the Users table.');
      return true;
    } else {
      console.log('\n❌ The ban_reason column DOES NOT EXIST in the Users table.');
      console.log('\nYou need to run the add-ban-reason-column.js script:');
      console.log('node add-ban-reason-column.js');
      return false;
    }
  } catch (error) {
    console.error('Error checking ban_reason column:', error);
    return false;
  } finally {
    // Close the connection
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the check
checkBanReasonColumn()
  .then(exists => {
    if (!exists) {
      console.log('\nTo add the missing column, run:');
      console.log('node add-ban-reason-column.js');
    }
    process.exit(exists ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

checkDatabase(); 