require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./server-config');

async function removeTestItems() {
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
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'remove-test-items.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL content into individual statements
    const sqlStatements = sqlContent
      .split(';')
      .filter(statement => statement.trim() !== '')
      .map(statement => statement.trim() + ';');
    
    console.log(`Found ${sqlStatements.length} SQL statements to execute`);
    
    // Execute each SQL statement
    for (const sql of sqlStatements) {
      try {
        console.log(`\nExecuting SQL: ${sql}`);
        const [result] = await connection.query(sql);
        console.log('Result:', result);
      } catch (sqlError) {
        console.error(`Error executing SQL: ${sqlError.message}`);
        console.log('Continuing with next statement...');
      }
    }
    
    console.log('\nTest items removal process completed.');
    
  } catch (error) {
    console.error('Error removing test items:', error);
  } finally {
    if (connection) {
      console.log('\nClosing database connection...');
      await connection.end();
    }
  }
}

// Run the function
removeTestItems(); 