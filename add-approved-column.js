require('dotenv').config();
const mysql = require('mysql2/promise');
const config = require('./server-config');

async function addApprovedColumn() {
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
    
    // Check if column already exists
    const [columns] = await connection.query('DESCRIBE Items');
    const hasApprovedColumn = columns.some(col => col.Field === 'is_approved');
    
    if (hasApprovedColumn) {
      console.log('The is_approved column already exists in the Items table.');
      return;
    }
    
    // Add the is_approved column
    console.log('Adding is_approved column to Items table...');
    await connection.query(`
      ALTER TABLE Items 
      ADD COLUMN is_approved BOOLEAN DEFAULT TRUE
    `);
    
    console.log('Column added successfully!');
    
    // Set all existing items to approved by default
    console.log('Setting all existing items to approved...');
    await connection.query(`
      UPDATE Items 
      SET is_approved = TRUE
    `);
    
    console.log('Update complete. All existing items are now approved.');
    
    // Verify the column was added
    const [updatedColumns] = await connection.query('DESCRIBE Items');
    console.log('Updated Items table columns:');
    updatedColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      console.log('Closing database connection...');
      await connection.end();
    }
  }
}

// Run the function
addApprovedColumn().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
}); 