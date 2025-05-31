const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./server-config');

async function setupDatabase() {
  let connection;
  
  try {
    console.log('Connecting to MySQL server...');
    
    // First connect without database to create it if needed
    connection = await mysql.createConnection({
      host: config.dbConfig.host,
      user: config.dbConfig.user,
      password: config.dbConfig.password
    });
    
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${config.dbConfig.database}`);
    console.log(`Database "${config.dbConfig.database}" created or already exists`);
    
    // Use the database
    await connection.query(`USE ${config.dbConfig.database}`);
    
    // Create Users table
    console.log('Creating Users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin', 'security') NOT NULL DEFAULT 'user',
        admission_number VARCHAR(20),
        faculty_school VARCHAR(100),
        year_of_study VARCHAR(20),
        phone_number VARCHAR(20),
        reset_token VARCHAR(255),
        reset_expires DATETIME,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create Items table
    console.log('Creating Items table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        subcategory VARCHAR(50),
        description TEXT,
        location VARCHAR(100),
        status ENUM('lost', 'found', 'claimed', 'returned') NOT NULL,
        image VARCHAR(255),
        date DATE,
        user_id INT,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `);
    
    // Create other tables as needed...
    console.log('Creating other tables...');
    
    // Create Claims table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        claimer_id INT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        proof TEXT,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES Items(id),
        FOREIGN KEY (claimer_id) REFERENCES Users(id)
      )
    `);
    
    // Create Notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50),
        status ENUM('unread', 'read') NOT NULL DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `);
    
    // Insert default admin user if doesn't exist
    console.log('Creating default admin user if needed...');
    const hashedPassword = '$2b$10$1Xp0MQ4XzDg9XGKVUzvhCOK9W5FZC6xvg/zDqMeYS5sm7X5NWAqGq'; // admin123
    await connection.query(`
      INSERT INTO Users (name, email, password, role)
      SELECT 'Admin', 'admin@example.com', ?, 'admin'
      WHERE NOT EXISTS (SELECT 1 FROM Users WHERE email = 'admin@example.com')
    `, [hashedPassword]);
    
    // Create Logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        by_user INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (by_user) REFERENCES Users(id)
      )
    `);
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupDatabase(); 