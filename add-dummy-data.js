const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const config = require('./server-config');

async function addDummyData() {
  // Create connection to MySQL
  const connection = await mysql.createConnection({
    host: config.dbConfig.host,
    user: config.dbConfig.user,
    password: config.dbConfig.password,
    database: config.dbConfig.database
  });
  
  try {
    console.log('Adding dummy data...');
    
    // Create test users including Eeshan
    const users = await createTestUsers(connection);
    
    // Create lost items
    const items = await createLostItems(connection, users);
    
    // Create pending claims
    await createPendingClaims(connection, items, users);
    
    // Create notifications for security
    await createNotifications(connection);
    
    console.log('Dummy data added successfully!');
    
  } catch (error) {
    console.error('Error adding dummy data:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

async function createTestUsers(connection) {
  const saltRounds = 10;
  const users = [
    {
      name: 'Eeshan Sharma',
      email: 'eeshan@gmail.com',
      password: await bcrypt.hash('password123', saltRounds),
      admission_number: 'A12345',
      faculty_school: 'School of Engineering',
      year_of_study: '3rd Year',
      phone_number: '9876543210',
      role: 'user'
    },
    {
      name: 'Rahul Verma',
      email: 'rahul@gmail.com',
      password: await bcrypt.hash('password123', saltRounds),
      admission_number: 'A54321',
      faculty_school: 'School of Business',
      year_of_study: '2nd Year',
      phone_number: '8765432109',
      role: 'user'
    },
    {
      name: 'Priya Singh',
      email: 'priya@gmail.com',
      password: await bcrypt.hash('password123', saltRounds),
      admission_number: 'A67890',
      faculty_school: 'School of Arts',
      year_of_study: '4th Year',
      phone_number: '7654321098',
      role: 'user'
    }
  ];
  
  const existingUsers = [];
  
  for (const user of users) {
    // Check if user already exists
    const [rows] = await connection.query(
      'SELECT * FROM Users WHERE email = ?', 
      [user.email]
    );
    
    if (rows.length === 0) {
      // Create user
      const [result] = await connection.query(
        'INSERT INTO Users (name, email, password, admission_number, faculty_school, year_of_study, phone_number, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user.name, user.email, user.password, user.admission_number, user.faculty_school, user.year_of_study, user.phone_number, user.role]
      );
      
      user.id = result.insertId;
      existingUsers.push(user);
      console.log(`User ${user.name} created with ID: ${user.id}`);
    } else {
      user.id = rows[0].id;
      existingUsers.push(user);
      console.log(`User ${user.name} already exists with ID: ${user.id}`);
    }
  }
  
  return existingUsers;
}

async function createLostItems(connection, users) {
  // Sample images as base64 URLs (in reality, these would be file paths or URLs)
  // For demo purposes, we'll use placeholder values
  const items = [
    {
      title: 'MacBook Pro',
      category: 'Electronics',
      description: 'Space Gray MacBook Pro (15-inch, 2019) with charger. Lost in the Main Library on the 2nd floor.',
      location: 'Main Library',
      status: 'claimed',
      image: '/images/lost-items/macbook.jpg', // Updated path
      date: '2023-10-15',
      user_id: users.find(u => u.name === 'Eeshan Sharma').id
    },
    {
      title: 'Student ID Card',
      category: 'ID/Documents',
      description: 'University student ID card with name "Priya Singh". Lost near the cafeteria.',
      location: 'University Cafeteria',
      status: 'claimed',
      image: '/images/lost-items/id_card.jpg', // Updated path
      date: '2023-11-05',
      user_id: users.find(u => u.name === 'Priya Singh').id
    },
    {
      title: 'Wireless Earbuds',
      category: 'Electronics',
      description: 'Black wireless earbuds with charging case. Lost in the gym.',
      location: 'University Gym',
      status: 'claimed',
      image: '/images/lost-items/earbuds.jpg', // Updated path
      date: '2023-11-20',
      user_id: users.find(u => u.name === 'Rahul Verma').id
    },
    {
      title: 'Blue Water Bottle',
      category: 'Personal Item',
      description: 'Blue metal water bottle with university logo. Left in CS Lab 101.',
      location: 'Computer Science Building',
      status: 'claimed',
      image: '/images/lost-items/water_bottle.jpg', // Updated path
      date: '2023-12-01',
      user_id: users.find(u => u.name === 'Eeshan Sharma').id
    },
    {
      title: 'Textbook - Advanced Physics',
      category: 'Books',
      description: 'Advanced Physics textbook (8th Edition) with some highlighting. Lost in Science Building.',
      location: 'Science Building',
      status: 'claimed',
      image: '/images/lost-items/textbook.jpg', // Updated path
      date: '2023-12-10',
      user_id: users.find(u => u.name === 'Rahul Verma').id
    }
  ];
  
  const createdItems = [];
  
  for (const item of items) {
    // Check if item already exists (by title and user_id)
    const [rows] = await connection.query(
      'SELECT * FROM Items WHERE title = ? AND user_id = ?', 
      [item.title, item.user_id]
    );
    
    if (rows.length === 0) {
      // Create item
      const [result] = await connection.query(
        'INSERT INTO Items (title, category, description, location, status, image, date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [item.title, item.category, item.description, item.location, item.status, item.image, item.date, item.user_id]
      );
      
      item.id = result.insertId;
      createdItems.push(item);
      console.log(`Item ${item.title} created with ID: ${item.id}`);
    } else {
      item.id = rows[0].id;
      createdItems.push(item);
      console.log(`Item ${item.title} already exists with ID: ${item.id}`);
    }
  }
  
  return createdItems;
}

async function createPendingClaims(connection, items, users) {
  // Create claims (each user claims an item not their own)
  const claims = [
    {
      item_id: items.find(i => i.title === 'MacBook Pro').id,
      claimer_id: users.find(u => u.name === 'Rahul Verma').id,
      status: 'pending',
      date: '2023-10-17'
    },
    {
      item_id: items.find(i => i.title === 'Student ID Card').id,
      claimer_id: users.find(u => u.name === 'Eeshan Sharma').id,
      status: 'pending',
      date: '2023-11-07'
    },
    {
      item_id: items.find(i => i.title === 'Wireless Earbuds').id,
      claimer_id: users.find(u => u.name === 'Priya Singh').id,
      status: 'pending',
      date: '2023-11-22'
    }
  ];
  
  for (const claim of claims) {
    // Check if claim already exists
    const [rows] = await connection.query(
      'SELECT * FROM Claims WHERE item_id = ? AND claimer_id = ?', 
      [claim.item_id, claim.claimer_id]
    );
    
    if (rows.length === 0) {
      // Create claim
      const [result] = await connection.query(
        'INSERT INTO Claims (item_id, claimer_id, status, date) VALUES (?, ?, ?, ?)',
        [claim.item_id, claim.claimer_id, claim.status, claim.date]
      );
      
      console.log(`Claim created with ID: ${result.insertId}`);
    } else {
      console.log(`Claim already exists with ID: ${rows[0].id}`);
    }
  }
}

async function createNotifications(connection) {
  // First, get all security users
  const [securityUsers] = await connection.query(
    'SELECT id FROM Users WHERE role = "security" OR role = "admin"'
  );
  
  if (securityUsers.length === 0) {
    console.log('No security users found to send notifications to');
    return;
  }
  
  // Get pending claims with item and claimer info
  const [claims] = await connection.query(`
    SELECT 
      c.id AS claim_id,
      i.title AS item_title,
      u.name AS claimer_name
    FROM 
      Claims c
    JOIN 
      Items i ON c.item_id = i.id
    JOIN 
      Users u ON c.claimer_id = u.id
    WHERE 
      c.status = 'pending'
  `);
  
  for (const claim of claims) {
    // Create notification for each security user
    for (const user of securityUsers) {
      const message = `New claim request: ${claim.claimer_name} has claimed the item "${claim.item_title}". Please review and take action.`;
      
      // Check if notification already exists
      const [rows] = await connection.query(
        'SELECT * FROM Notifications WHERE message = ? AND user_id = ?', 
        [message, user.id]
      );
      
      if (rows.length === 0) {
        await connection.query(
          'INSERT INTO Notifications (message, user_id, status) VALUES (?, ?, "unread")',
          [message, user.id]
        );
        
        console.log(`Notification created for security user ID: ${user.id}`);
      } else {
        console.log(`Notification already exists for security user ID: ${user.id}`);
      }
    }
  }
}

// Run the script
addDummyData(); 