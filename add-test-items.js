const mysql = require('mysql2/promise');
const config = require('./server-config');

async function addTestItems() {
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
    
    // First, check if we have a test user
    console.log('\nChecking for test user...');
    const [users] = await connection.query(`
      SELECT id, name, email, role FROM Users 
      WHERE email = 'test@example.com' OR role = 'security' 
      LIMIT 2
    `);
    
    let userId, securityId;
    
    if (users.length === 0) {
      console.log('Creating test user...');
      // Create a test user
      const [result] = await connection.query(`
        INSERT INTO Users (name, email, password, role)
        VALUES ('Test User', 'test@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uQxTmrjCxMZxZcyxLc1FTOjr85H5hNZq', 'user')
      `);
      userId = result.insertId;
      console.log(`Created test user with ID: ${userId}`);
      
      // Create a security user
      const [securityResult] = await connection.query(`
        INSERT INTO Users (name, email, password, role)
        VALUES ('Security Staff', 'security@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uQxTmrjCxMZxZcyxLc1FTOjr85H5hNZq', 'security')
      `);
      securityId = securityResult.insertId;
      console.log(`Created security user with ID: ${securityId}`);
    } else {
      users.forEach(user => {
        if (user.role === 'user' || user.role === 'admin') {
          userId = user.id;
          console.log(`Using existing user: ${user.name} (ID: ${user.id})`);
        } else if (user.role === 'security') {
          securityId = user.id;
          console.log(`Using existing security user: ${user.name} (ID: ${user.id})`);
        }
      });
      
      // If we still don't have both users, create the missing one(s)
      if (!userId) {
        const [result] = await connection.query(`
          INSERT INTO Users (name, email, password, role)
          VALUES ('Test User', 'test@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uQxTmrjCxMZxZcyxLc1FTOjr85H5hNZq', 'user')
        `);
        userId = result.insertId;
        console.log(`Created test user with ID: ${userId}`);
      }
      
      if (!securityId) {
        const [securityResult] = await connection.query(`
          INSERT INTO Users (name, email, password, role)
          VALUES ('Security Staff', 'security@example.com', '$2b$10$CwTycUXWue0Thq9StjUM0uQxTmrjCxMZxZcyxLc1FTOjr85H5hNZq', 'security')
        `);
        securityId = securityResult.insertId;
        console.log(`Created security user with ID: ${securityId}`);
      }
    }
    
    // Create test found items with different approval statuses
    console.log('\nCreating test found items...');
    
    // Item 1: Approved found item
    await connection.query(`
      INSERT INTO Items (title, category, description, location, status, date, user_id, is_approved, is_deleted)
      VALUES ('Found Laptop', 'Electronics', 'MacBook Pro found in the library', 'Main Library', 'found', CURDATE(), ?, TRUE, FALSE)
    `, [userId]);
    console.log('Created approved found item: MacBook Pro');
    
    // Item 2: Unapproved found item
    await connection.query(`
      INSERT INTO Items (title, category, description, location, status, date, user_id, is_approved, is_deleted)
      VALUES ('Found Phone', 'Electronics', 'iPhone 13 found in the cafeteria', 'Student Center', 'found', CURDATE(), ?, FALSE, FALSE)
    `, [userId]);
    console.log('Created unapproved found item: iPhone 13');
    
    // Item 3: Another unapproved found item
    await connection.query(`
      INSERT INTO Items (title, category, description, location, status, date, user_id, is_approved, is_deleted)
      VALUES ('Found Wallet', 'Personal Items', 'Brown leather wallet with ID cards', 'Science Building', 'found', CURDATE(), ?, FALSE, FALSE)
    `, [userId]);
    console.log('Created unapproved found item: Wallet');
    
    // Item 4: Lost item (should not be affected by approval)
    await connection.query(`
      INSERT INTO Items (title, category, description, location, status, date, user_id, is_approved, is_deleted)
      VALUES ('Lost Textbook', 'Books', 'Computer Science textbook', 'Engineering Building', 'lost', CURDATE(), ?, TRUE, FALSE)
    `, [userId]);
    console.log('Created lost item: Textbook');
    
    console.log('\nVerifying items in database...');
    const [items] = await connection.query(`
      SELECT id, title, category, status, is_approved 
      FROM Items 
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log('Items in database:');
    items.forEach(item => {
      console.log(`- ID: ${item.id}, Title: ${item.title}, Status: ${item.status}, Approved: ${item.is_approved ? 'Yes' : 'No'}`);
    });
    
    console.log('\nTest items created successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      console.log('\nClosing database connection...');
      await connection.end();
    }
  }
}

// Run the function
addTestItems(); 