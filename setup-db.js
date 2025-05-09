const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./server-config');

async function setupDatabase() {
  // Create connection to MySQL without database specified
  const connection = await mysql.createConnection({
    host: config.dbConfig.host,
    user: config.dbConfig.user,
    password: config.dbConfig.password
  });
  
  try {
    console.log('Setting up database...');
    
    // Read SQL file
    const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    
    // Split by semicolon to get individual queries
    const queries = sql.split(';').filter(query => query.trim() !== '');
    
    // Execute each query
    for (const query of queries) {
      await connection.query(query);
      console.log('Executed:', query.substring(0, 50) + '...');
    }
    
    console.log('Database setup completed successfully');
    
    // Create admin user
    await createAdminUser(connection);
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

async function createAdminUser(connection) {
  try {
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    
    // Admin credentials
    const admin = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: await bcrypt.hash('admin12345', saltRounds),
      role: 'admin'
    };
    
    // First check if admin already exists
    const [users] = await connection.query(
      `SELECT * FROM lost_and_found_system.Users WHERE email = ?`, 
      [admin.email]
    );
    
    if (users.length === 0) {
      // Create admin user
      await connection.query(
        `INSERT INTO lost_and_found_system.Users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        [admin.name, admin.email, admin.password, admin.role]
      );
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }
    
    // Create security user
    const security = {
      name: 'Security User',
      email: 'security@example.com',
      password: await bcrypt.hash('security12345', saltRounds),
      role: 'security'
    };
    
    // Check if security user exists
    const [securityUsers] = await connection.query(
      `SELECT * FROM lost_and_found_system.Users WHERE email = ?`, 
      [security.email]
    );
    
    if (securityUsers.length === 0) {
      // Create security user
      await connection.query(
        `INSERT INTO lost_and_found_system.Users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        [security.name, security.email, security.password, security.role]
      );
      console.log('Security user created');
    } else {
      console.log('Security user already exists');
    }
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Run setup
setupDatabase(); 