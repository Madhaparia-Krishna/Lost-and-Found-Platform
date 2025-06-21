/**
 * Script to add is_donated column to Items table
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
  console.log('Starting database update script...');
  
  // Create connection pool
  const pool = mysql.createPool(dbConfig);
  
  try {
    // Check connection
    console.log('Checking database connection...');
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully');
    connection.release();
    
    // Check if is_donated column exists
    console.log('Checking if is_donated column exists...');
    const [columns] = await pool.query('SHOW COLUMNS FROM Items');
    
    // Check if is_donated column exists
    const isDonatedColumn = columns.find(col => col.Field === 'is_donated');
    
    if (!isDonatedColumn) {
      console.log('is_donated column not found in Items table. Adding it...');
      await pool.query('ALTER TABLE Items ADD COLUMN is_donated BOOLEAN DEFAULT FALSE');
      console.log('Added is_donated column to Items table');
    } else {
      console.log('is_donated column already exists with type:', isDonatedColumn.Type);
      
      // If the column type is not BOOLEAN/TINYINT, fix it
      if (!isDonatedColumn.Type.toLowerCase().includes('tinyint')) {
        console.log('Fixing is_donated column type...');
        await pool.query('ALTER TABLE Items MODIFY COLUMN is_donated BOOLEAN DEFAULT FALSE');
        console.log('Fixed is_donated column type');
      }
    }
    
    // Check for items with NULL is_donated values
    console.log('Checking for NULL is_donated values...');
    const [nullResults] = await pool.query('SELECT COUNT(*) as count FROM Items WHERE is_donated IS NULL');
    
    if (nullResults[0].count > 0) {
      console.log(`Found ${nullResults[0].count} items with NULL is_donated values. Fixing...`);
      await pool.query('UPDATE Items SET is_donated = FALSE WHERE is_donated IS NULL');
      console.log('Fixed NULL is_donated values');
    } else {
      console.log('No NULL is_donated values found');
    }
    
    console.log('Database update script completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('Database connection pool closed');
  }
}

// Run the script
main().catch(console.error); 