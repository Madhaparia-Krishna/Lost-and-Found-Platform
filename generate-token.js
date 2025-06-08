const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const config = require('./server-config');
const bcrypt = require('bcryptjs');

// JWT secret key
const JWT_SECRET = config.jwtConfig.secret;

async function generateSecurityUserToken() {
  try {
    // Create connection pool
    const pool = mysql.createPool(config.dbConfig);
    
    // Check connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    
    // Find security user
    const [users] = await connection.query('SELECT * FROM Users WHERE role = ? AND is_deleted = FALSE', ['security']);
    
    let securityUser;
    
    if (users.length === 0) {
      console.log('No security user found. Creating a new security user...');
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('Security@123', saltRounds);
      
      // Insert new security user
      const [result] = await connection.query(
        'INSERT INTO Users (name, email, password, role, is_deleted) VALUES (?, ?, ?, ?, ?)',
        ['Security Officer', 'security@example.com', hashedPassword, 'security', false]
      );
      
      console.log(`Created new security user with ID: ${result.insertId}`);
      
      // Get the newly created user
      const [newUsers] = await connection.query('SELECT * FROM Users WHERE id = ?', [result.insertId]);
      securityUser = newUsers[0];
    } else {
      securityUser = users[0];
      console.log(`Found existing security user: ${securityUser.name} (${securityUser.email})`);
    }
    
    // Generate JWT token
    const userData = {
      id: securityUser.id,
      name: securityUser.name,
      email: securityUser.email,
      role: securityUser.role
    };
    
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: config.jwtConfig.expiresIn });
    
    console.log('Generated new token:');
    console.log(token);
    
    // Update auth-token.json
    const fs = require('fs');
    const authTokenPath = './auth-token.json';
    const authTokenData = {
      token: token,
      note: "This token was automatically generated and will expire in 24 hours"
    };
    
    fs.writeFileSync(authTokenPath, JSON.stringify(authTokenData, null, 2));
    console.log(`Token saved to ${authTokenPath}`);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error generating token:', error);
    process.exit(1);
  }
}

// Run the function
generateSecurityUserToken(); 