const mysql = require('mysql2/promise');

async function fixEnum() {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'lost_and_found_system'
    });

    console.log('Connected to database');

    // First, check the current schema
    const [itemsResult] = await connection.query('DESCRIBE Items');
    const statusField = itemsResult.find(field => field.Field === 'status');
    console.log('Current Items status enum:', statusField.Type);

    // Check if there are any 'claimed' items
    const [claimedItems] = await connection.query("SELECT id, title, status FROM Items WHERE status = 'claimed'");
    console.log(`Found ${claimedItems.length} items with 'claimed' status`);

    if (claimedItems.length > 0) {
      console.log('Updating claimed items to requested...');
      await connection.query("UPDATE Items SET status = 'requested' WHERE status = 'claimed'");
      console.log('Items updated successfully');
    }

    // Update the enum
    console.log('Updating Items table schema...');
    try {
      await connection.query("ALTER TABLE Items MODIFY COLUMN status ENUM('lost', 'found', 'requested', 'received', 'returned') NOT NULL");
      console.log('Schema updated successfully');
    } catch (schemaError) {
      console.error('Error updating schema:', schemaError);
    }

    // Verify the changes
    const [updatedItemsResult] = await connection.query('DESCRIBE Items');
    const updatedStatusField = updatedItemsResult.find(field => field.Field === 'status');
    console.log('Updated Items status enum:', updatedStatusField.Type);

    // Check items
    const [items] = await connection.query('SELECT id, title, status, is_approved FROM Items');
    console.log('Items in database:');
    console.table(items);

    await connection.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixEnum(); 