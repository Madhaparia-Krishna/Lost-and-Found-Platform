require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const config = require('./server-config');
const crypto = require('crypto');

// Create Express app
const app = express();

// Middleware
app.use(cors(config.serverConfig.corsOptions));
app.use(bodyParser.json());

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// Create connection pool
const pool = mysql.createPool(config.dbConfig);

// Initialize database connection
async function initializeDatabase() {
  try {
    // Check connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    connection.release();
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// JWT secret key
const JWT_SECRET = config.jwtConfig.secret;

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }
  
  try {
    // Check if user already exists
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);
    
    if (users.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert new user (default role: user)
    const [result] = await pool.query(
      'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'user']
    );
    
    // Generate JWT token
    const user = {
      id: result.insertId,
      name,
      email,
      role: 'user'
    };
    
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: config.jwtConfig.expiresIn });
    
    // Return user data with token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        ...user,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Find user in database
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ? AND is_deleted = FALSE', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const user = users[0];
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: config.jwtConfig.expiresIn });
    
    // Log successful login
    try {
      await pool.query(
        'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
        [`User login`, user.id]
      );
    } catch (logError) {
      console.error('Error logging login:', logError);
      // Don't fail the login if logging fails
    }
    
    // Return user data with token
    res.json({
      message: 'Logged in successfully',
      user: {
        ...userData,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Verify token endpoint
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Set krishna@gmail.com as admin (one-time setup endpoint)
app.get('/api/set-admin', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE Users SET role = ? WHERE email = ?',
      ['admin', 'krishna@gmail.com']
    );
    
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'User role updated to admin' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Error updating user role' });
  }
});

// Forgot password endpoint
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  try {
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ? AND is_deleted = FALSE', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'No user found with this email address' });
    }
    
    const user = users[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    console.log('Generated reset token:', resetToken);
    
    // Update user with reset token
    await pool.query(
      'UPDATE Users SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );
    
    // Create reset URL
    const resetUrl = `${config.serverConfig.frontendUrl}/reset-password?token=${resetToken}`;
    console.log('Generated reset URL:', resetUrl);
    
    // Log the password reset request
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Password reset requested`, user.id]
    );
    
    // Send response with required data for EmailJS
    const responseData = {
      message: 'Password reset instructions have been sent to your email',
      userName: user.name,
      resetUrl: resetUrl,
      userEmail: user.email
    };
    console.log('Sending response data:', responseData);
    
    res.json(responseData);
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }
  
  // Validate password length
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }
  
  try {
    // Find user with this reset token
    const [users] = await pool.query(
      'SELECT * FROM Users WHERE reset_token = ? AND reset_expires > NOW() AND is_deleted = FALSE',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    const user = users[0];
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password and clear reset token
    await pool.query(
      'UPDATE Users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );
    
    // Log the password reset
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Password reset completed`, user.id]
    );
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Verify reset token endpoint
app.post('/api/verify-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token is required' });
  }
  
  try {
    // Check if token exists and is not expired
    const [users] = await pool.query(
      'SELECT id FROM Users WHERE reset_token = ? AND reset_expires > NOW() AND is_deleted = FALSE',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired token' });
    }
    
    res.json({ valid: true });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, message: 'Error verifying token' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, admission_number, faculty_school, year_of_study, phone_number, role FROM Users WHERE id = ? AND is_deleted = FALSE', 
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    res.json({ profile: user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { name, admission_number, faculty_school, year_of_study, phone_number } = req.body;
  
  try {
    // Validate input
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Update user in database
    const [result] = await pool.query(
      `UPDATE Users 
       SET name = ?, 
           admission_number = ?, 
           faculty_school = ?, 
           year_of_study = ?, 
           phone_number = ? 
       WHERE id = ? AND is_deleted = FALSE`,
      [name, admission_number, faculty_school, year_of_study, phone_number, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the profile update
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Profile updated`, req.user.id]
    );
    
    // Get updated profile
    const [users] = await pool.query(
      'SELECT id, name, email, admission_number, faculty_school, year_of_study, phone_number, role FROM Users WHERE id = ? AND is_deleted = FALSE', 
      [req.user.id]
    );
    
    res.json({ 
      message: 'Profile updated successfully',
      profile: users[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Admin endpoint to update user role
app.put('/api/admin/users/:userId/role', authenticateToken, async (req, res) => {
  // Only allow admins to access this endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin permission required' });
  }

  const { userId } = req.params;
  const { role } = req.body;
  
  // Validate role
  if (!role || !['admin', 'security', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Valid role is required (admin, security, or user)' });
  }
  
  try {
    // Update user role
    const [result] = await pool.query(
      'UPDATE Users SET role = ? WHERE id = ? AND is_deleted = FALSE',
      [role, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the role update
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`User role updated to ${role} for user ID ${userId}`, req.user.id]
    );
    
    // Get updated user info
    const [users] = await pool.query(
      'SELECT id, name, email, role FROM Users WHERE id = ? AND is_deleted = FALSE',
      [userId]
    );
    
    res.json({ 
      message: 'User role updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  // Only allow admins to access this endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin permission required' });
  }
  
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM Users WHERE is_deleted = FALSE'
    );
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Security Panel API Routes
app.get('/api/security/items', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    // Get all items
    const [items] = await pool.query(`
      SELECT 
        i.*,
        u.name as owner_name
      FROM 
        Items i
      LEFT JOIN 
        Users u ON i.user_id = u.id
      WHERE 
        i.is_deleted = FALSE
      ORDER BY 
        i.created_at DESC
    `);
    
    res.json({ items });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Error fetching items' });
  }
});

app.get('/api/security/claims', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    // Get all claims with item and claimer info
    const [claims] = await pool.query(`
      SELECT 
        c.*,
        i.title as item_title,
        i.image as item_image,
        u.name as claimer_name
      FROM 
        Claims c
      JOIN 
        Items i ON c.item_id = i.id
      JOIN 
        Users u ON c.claimer_id = u.id
      WHERE 
        c.is_deleted = FALSE
      ORDER BY 
        c.created_at DESC
    `);
    
    res.json({ claims });
  } catch (error) {
    console.error('Error fetching claims:', error);
    res.status(500).json({ message: 'Error fetching claims' });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    // Get notifications for this user
    const [notifications] = await pool.query(`
      SELECT * FROM Notifications
      WHERE user_id = ? AND is_deleted = FALSE
      ORDER BY created_at DESC
    `, [req.user.id]);
    
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    // Update notification status
    await pool.query(`
      UPDATE Notifications
      SET status = 'read'
      WHERE id = ? AND user_id = ?
    `, [notificationId, req.user.id]);
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

app.put('/api/security/claims/:id/status', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const claimId = req.params.id;
    const { status } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Update claim status
    await pool.query(`
      UPDATE Claims
      SET status = ?
      WHERE id = ?
    `, [status, claimId]);
    
    // If approved, update item status to returned
    if (status === 'approved') {
      await pool.query(`
        UPDATE Items i
        JOIN Claims c ON i.id = c.item_id
        SET i.status = 'returned'
        WHERE c.id = ?
      `, [claimId]);
      
      // Get claim details for notification
      const [claimDetails] = await pool.query(`
        SELECT 
          c.claimer_id,
          i.title as item_title,
          i.user_id as owner_id
        FROM 
          Claims c
        JOIN 
          Items i ON c.item_id = i.id
        WHERE 
          c.id = ?
      `, [claimId]);
      
      if (claimDetails.length > 0) {
        const claim = claimDetails[0];
        
        // Create notification for claimer
        await pool.query(`
          INSERT INTO Notifications (user_id, message, type)
          VALUES (?, ?, ?)
        `, [
          claim.claimer_id,
          `Your claim for "${claim.item_title}" has been approved`,
          'claim_approved'
        ]);
        
        // Create notification for owner
        await pool.query(`
          INSERT INTO Notifications (user_id, message, type)
          VALUES (?, ?, ?)
        `, [
          claim.owner_id,
          `Your item "${claim.item_title}" has been claimed and approved`,
          'item_claimed'
        ]);
      }
    } else if (status === 'rejected') {
      // Get claim details for notification
      const [claimDetails] = await pool.query(`
        SELECT 
          c.claimer_id,
          i.title as item_title
        FROM 
          Claims c
        JOIN 
          Items i ON c.item_id = i.id
        WHERE 
          c.id = ?
      `, [claimId]);
      
      if (claimDetails.length > 0) {
        const claim = claimDetails[0];
        
        // Create notification for claimer
        await pool.query(`
          INSERT INTO Notifications (user_id, message, type)
          VALUES (?, ?, ?)
        `, [
          claim.claimer_id,
          `Your claim for "${claim.item_title}" has been rejected`,
          'claim_rejected'
        ]);
      }
    }
    
    res.json({ message: `Claim ${status} successfully` });
  } catch (error) {
    console.error('Error updating claim status:', error);
    res.status(500).json({ message: 'Error updating claim status' });
  }
});
// Submit a lost item
router.post('/items/lost', (req, res) => {
  const { title, category, description, location, image, date, user_id } = req.body;

  if (!title || !user_id) {
    return res.status(400).json({ message: 'Title and user_id are required' });
  }

  const sql = `
    INSERT INTO Items 
      (title, category, description, location, status, image, date, user_id) 
    VALUES (?, ?, ?, ?, 'lost', ?, ?, ?)
  `;

  db.query(sql, [title, category, description, location, image, date, user_id], (err, result) => {
    if (err) {
      console.error('Error inserting lost item:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(201).json({ message: 'Lost item submitted successfully', itemId: result.insertId });
  });
});

// Submit a found item
router.post('/items/found', (req, res) => {
  const { title, category, description, location, image, date, user_id } = req.body;

  if (!title || !user_id) {
    return res.status(400).json({ message: 'Title and user_id are required' });
  }

  const sql = `
    INSERT INTO Items 
      (title, category, description, location, status, image, date, user_id) 
    VALUES (?, ?, ?, ?, 'found', ?, ?, ?)
  `;

  db.query(sql, [title, category, description, location, image, date, user_id], (err, result) => {
    if (err) {
      console.error('Error inserting found item:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(201).json({ message: 'Found item submitted successfully', itemId: result.insertId });
  });
});


// Start server
const PORT = config.serverConfig.port;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  initializeDatabase();
});