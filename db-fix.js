/**
 * Database fix script for the Lost and Found application
 * This script checks and updates the Items table structure to ensure consistency
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lost_and_found_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function main() {
  console.log('Starting database fix script...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check connection
    console.log('Checking database connection...');
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully');
    connection.release();
    
    // Check Items table structure
    console.log('Checking Items table structure...');
    
    // Check status column
    console.log('Checking status column...');
    try {
      const [statusInfo] = await pool.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'Items' 
        AND COLUMN_NAME = 'status'
      `, [dbConfig.database]);
      
      if (statusInfo.length > 0) {
        console.log('Status column type:', statusInfo[0].COLUMN_TYPE);
        
        // Check if the status column supports all our required values
        const statusType = statusInfo[0].COLUMN_TYPE.toLowerCase();
        const requiredValues = ['found', 'lost', 'claimed', 'requested'];
        let needsUpdate = false;
        
        if (statusType.includes('enum')) {
          // Check if all required values are in the enum
          for (const value of requiredValues) {
            if (!statusType.includes(`'${value}'`)) {
              needsUpdate = true;
              console.log(`Status column doesn't include value: '${value}'`);
            }
          }
        } else {
          // If it's not an enum, we need to convert it
          needsUpdate = true;
          console.log(`Status column is not an ENUM, current type: ${statusType}`);
        }
        
        if (needsUpdate) {
          console.log('Updating status column to support all required values...');
          await pool.query(`
            ALTER TABLE Items 
            MODIFY COLUMN status ENUM('found', 'lost', 'claimed', 'requested') NOT NULL DEFAULT 'found'
          `);
          console.log('Status column updated successfully');
        } else {
          console.log('Status column already supports all required values');
        }
      } else {
        console.log('Status column not found, this is a critical error');
      }
    } catch (error) {
      console.error('Error checking status column:', error);
    }
    
    // Check is_deleted column
    console.log('Checking is_deleted column...');
    const [columns] = await pool.query('SHOW COLUMNS FROM Items');
    
    // Check if is_deleted column exists
    const isDeletedColumn = columns.find(col => col.Field === 'is_deleted');
    
    if (!isDeletedColumn) {
      console.log('is_deleted column not found in Items table. Adding it...');
      await pool.query('ALTER TABLE Items ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE');
      console.log('Added is_deleted column to Items table');
    } else {
      console.log('is_deleted column exists with type:', isDeletedColumn.Type);
      
      // If the column type is not BOOLEAN/TINYINT, fix it
      if (!isDeletedColumn.Type.toLowerCase().includes('tinyint')) {
        console.log('Fixing is_deleted column type...');
        await pool.query('ALTER TABLE Items MODIFY COLUMN is_deleted BOOLEAN DEFAULT FALSE');
        console.log('Fixed is_deleted column type');
      }
    }
    
    // Check for items with NULL is_deleted values
    console.log('Checking for NULL is_deleted values...');
    const [nullResults] = await pool.query('SELECT COUNT(*) as count FROM Items WHERE is_deleted IS NULL');
    
    if (nullResults[0].count > 0) {
      console.log(`Found ${nullResults[0].count} items with NULL is_deleted values. Fixing...`);
      await pool.query('UPDATE Items SET is_deleted = FALSE WHERE is_deleted IS NULL');
      console.log('Fixed NULL is_deleted values');
    } else {
      console.log('No NULL is_deleted values found');
    }
    
    // Update all queries to use 0/1 instead of TRUE/FALSE for better compatibility
    console.log('Creating sample items for testing...');
    try {
      // Check if we have test items for each status
      const statuses = ['found', 'lost', 'claimed', 'requested'];
      
      for (const status of statuses) {
        const [items] = await pool.query(
          'SELECT * FROM Items WHERE status = ? LIMIT 1',
          [status]
        );
        
        if (items.length === 0) {
          console.log(`Creating test item with status '${status}'...`);
          await pool.query(
            `INSERT INTO Items (title, description, category, status, location, date, image, user_id, is_deleted, is_approved) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`Test ${status} item`, `This is a test ${status} item`, 'Other', status, 'Test Location', new Date(), 'test.jpg', 1, 0, 1]
          );
          console.log(`Created test item with status '${status}'`);
        } else {
          console.log(`Test item with status '${status}' already exists`);
        }
      }
    } catch (error) {
      console.error('Error creating test items:', error);
    }
    
    console.log('Database fix script completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('Database connection pool closed');
  }
}

// Run the script
main().catch(console.error); 