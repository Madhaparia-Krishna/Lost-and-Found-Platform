const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function updateDatabase() {
  try {
    console.log('Reading SQL script...');
    const sqlScript = fs.readFileSync(path.join(__dirname, 'update-status-enum.sql'), 'utf8');
    const sqlCommands = sqlScript.split(';').filter(cmd => cmd.trim() !== '');

    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'lost_and_found_system',
      multipleStatements: true
    });

    console.log('Connected to database. Executing SQL commands...');
    
    for (const command of sqlCommands) {
      console.log(`Executing: ${command.trim().substring(0, 50)}...`);
      await connection.execute(command);
      console.log('Command executed successfully');
    }

    console.log('All commands executed successfully');
    
    // Verify the changes
    const [itemsResult] = await connection.query('DESCRIBE Items');
    const statusField = itemsResult.find(field => field.Field === 'status');
    console.log('Updated Items status enum:', statusField.Type);
    
    const [notificationsResult] = await connection.query('DESCRIBE Notifications');
    const typeField = notificationsResult.find(field => field.Field === 'type');
    console.log('Updated Notifications type enum:', typeField.Type);
    
    // Check updated items
    const [items] = await connection.query('SELECT id, title, status, is_approved FROM Items');
    console.log('Items in database:');
    console.table(items);

    await connection.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error updating database:', error);
  }
}

updateDatabase(); 