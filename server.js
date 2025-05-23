require('dotenv').config();
console.log('Environment variables:', {
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set'
});

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const config = require('./server-config');
const nodemailer = require('nodemailer');

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

// Create test email account
async function createTestAccount() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('Test email account created:', {
      user: testAccount.user,
      pass: testAccount.pass,
      smtp: testAccount.smtp
    });
    
    // Create email transporter with test account
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('Error creating test account:', error);
    throw error;
  }
}

// Initialize email transporter
let transporter;
createTestAccount().then(t => {
  transporter = t;
  console.log('Email transporter initialized');
}).catch(error => {
  console.error('Failed to initialize email transporter:', error);
});

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
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Create reset URL
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    // Send email
    const mailOptions = {
      from: '"Lost@Campus" <noreply@lostcampus.com>',
      to: user.email,
      subject: 'Password Reset Request - Lost@Campus',
      html: `
        <h1>Password Reset Request</h1>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset your password for your Lost@Campus account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #4a90e2;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        ">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The Lost@Campus Team</p>
      `
    };
    
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      
      // Log the password reset request
      await pool.query(
        'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
        [`Password reset requested`, user.id]
      );
      
      res.json({
        message: 'Password reset instructions have been sent to your email',
        previewUrl: nodemailer.getTestMessageUrl(info) // For testing only
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing request: ' + error.message });
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
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    const [result] = await pool.query(
      'UPDATE Users SET password = ? WHERE id = ? AND is_deleted = FALSE',
      [hashedPassword, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log the password reset
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Password reset completed`, userId]
    );
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Reset token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid reset token' });
    }
    
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
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
          INSERT INTO Notifications (user_id, action, item_id, status)
          VALUES (?, ?, ?, ?)
        `, [claim.claimer_id, 'Item returned', claim.item_id, 'unread']);
      }
    }
    
    // Log the claim status update
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Claim status updated to ${status} for claim ID ${claimId}`, req.user.id]
    );
    
    res.json({ message: 'Claim status updated successfully' });
  } catch (error) {
    console.error('Error updating claim status:', error);
    res.status(500).json({ message: 'Error updating claim status' });
  }
});

// Verify reset token endpoint
app.post('/api/verify-token', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token is required' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is for password reset
    if (!decoded.userId || !decoded.email) {
      return res.status(400).json({ valid: false, message: 'Invalid token' });
    }
    
    // Check if user exists
    const [users] = await pool.query(
      'SELECT id FROM Users WHERE id = ? AND email = ? AND is_deleted = FALSE',
      [decoded.userId, decoded.email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ valid: false, message: 'User not found' });
    }
    
    res.json({ valid: true });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ valid: false, message: 'Token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ valid: false, message: 'Invalid token' });
    }
    
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, message: 'Error verifying token' });
  }
});

// Update the catch-all route
app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    res.redirect('http://localhost:3000');
  }
});

// Start server
const PORT = config.serverConfig.port;
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});