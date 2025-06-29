require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const config = require('./server-config');
const crypto = require('crypto');
const multer = require('multer');
const { calculateMatchScore } = require('./server-utils');
const emailService = require('./server-email');
const fs = require('fs');
const { matchItems } = require('./services/matching.service');
const notificationService = require('./services/notificationService');
const { createNotification } = notificationService;

// Import routes
const notificationRoutesModule = require('./routes/notificationRoutes');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage: storage });

const http = require('http');
const socketIo = require('socket.io');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Pass Socket.IO instance to notification service and routes
notificationService.setSocketIO(io);
notificationRoutesModule.setSocketIO(io);

// Middleware
app.use(cors({
  origin: config.serverConfig.corsOptions.origin,
  methods: config.serverConfig.corsOptions.methods,
  credentials: true,
  allowedHeaders: config.serverConfig.corsOptions.allowedHeaders,
  exposedHeaders: ['Authorization'],
}));

// Handle preflight requests for all routes
app.options('*', cors(config.serverConfig.corsOptions));

// Add custom response headers for all responses
app.use((req, res, next) => {
  // Ensure proper CORS headers are set
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // For API error responses, ensure content type is set to JSON
  const originalSend = res.send;
  res.send = function(body) {
    // Set Content-Type for API responses
    if (req.path.startsWith('/api/') && res.statusCode >= 400) {
      res.header('Content-Type', 'application/json');
      console.log('Sending error response:', body);
    }
    return originalSend.call(this, body);
  };
  
  next();
});

app.use(bodyParser.json());

// Ensure uploads directory is properly served with absolute path
app.use('/uploads', (req, res, next) => {
  
  // Add CORS headers for images
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  // Check if file exists and log full path
  const filePath = path.join(__dirname, 'uploads', req.url);
  if (fs.existsSync(filePath)) {
    console.log(`Image file exists: ${filePath}`);
  } else {
    console.log(`Image file does not exist: ${filePath}`);
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use(express.static('public')); // Serve static files from public directory

// Add middleware to log requests for images
app.use((req, res, next) => {
  if (req.url.startsWith('/uploads/')) {
    console.log(`Image request: ${req.url}`);
    // Check if the file exists
    const filePath = path.join(__dirname, req.url);
    if (fs.existsSync(filePath)) {
      console.log(`Image file exists: ${filePath}`);
    } else {
      console.log(`Image file does not exist: ${filePath}`);
    }
  }
  next();
});

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

// Authentication middleware
const authenticateToken = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  // Log the token for debugging
  console.log('Auth header:', authHeader);
  console.log('Token extracted:', token);
  
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  
  // Verify the token
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err.message);
      return res.status(403).json({ message: 'Forbidden: Invalid token', error: err.message });
    }
    
    console.log('Decoded token:', decoded);
    
    // Check if user is banned
    try {
      const [userCheck] = await pool.query(
        'SELECT is_deleted FROM Users WHERE id = ?',
        [decoded.id]
      );
      
      if (userCheck.length > 0 && userCheck[0].is_deleted) {
        console.log(`User ${decoded.id} is banned, rejecting request`);
        return res.status(403).json({ message: 'Account suspended: Your account has been suspended. Please contact support for assistance.', banned: true });
      }
    } catch (error) {
      console.error('Error checking user ban status:', error);
      // Continue processing even if check fails
    }
    
    req.user = decoded;
    next();
  });
};

// Apply route middleware
app.use('/api/notifications', authenticateToken, notificationRoutesModule.router);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Authentication check endpoint - used to verify if a user is banned
app.get('/api/check-auth', authenticateToken, (req, res) => {
  // If the middleware passes, the user is authenticated and not banned
  res.status(200).json({ status: 'ok', message: 'Authentication valid' });
});

// Public endpoint to get found items (not lost items)
app.get('/api/public/items', async (req, res) => {
  try {
    const [items] = await pool.query(
      'SELECT i.*, u.name as reporter_name FROM Items i LEFT JOIN Users u ON i.user_id = u.id WHERE i.status = "found" AND i.is_approved = 1 AND i.is_deleted = 0'
    );
    console.log(`Found ${items.length} approved items for public view`);
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching public items:', error);
    res.status(500).json({ message: 'Error fetching items' });
  }
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
  console.log('Login request received:', req.body);
  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('Login validation error: Email and password are required');
    return res.status(400)
      .header('Content-Type', 'application/json')
      .json({ 
        message: 'Email and password are required',
        success: false
      });
  }
  
  try {
    // Find user in database
    console.log('Attempting to find user with email:', email);
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ? AND is_deleted = FALSE', [email]);
    
    console.log('Users found with that email:', users.length);
    if (users.length === 0) {
      console.log('No account found with email:', email);
      return res.status(401)
        .header('Content-Type', 'application/json')
        .json({ 
          message: 'No account found with this email address',
          success: false,
          errorType: 'account_not_found'
        });
    }
    
    const user = users[0];
    
    // Compare password
    console.log('Comparing password for user:', user.id);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    console.log('Password valid?', isPasswordValid);
    if (!isPasswordValid) {
      console.log('Wrong password for user:', user.id);
      return res.status(401)
        .header('Content-Type', 'application/json')
        .json({ 
          message: 'Wrong password. Please try again',
          success: false,
          errorType: 'wrong_password'
        });
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
      
      // Track user activity with IP and user agent
      await trackUserActivity(
        user.id, 
        'login', 
        'User logged in successfully', 
        req
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
  
  console.log('Profile update request received:', {
    userId: req.user.id,
    name,
    admission_number,
    faculty_school,
    year_of_study,
    phone_number
  });
  
  try {
    // Validate input
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Ensure all values are strings to prevent SQL errors
    const sanitizedName = String(name || '');
    const sanitizedAdmissionNumber = String(admission_number || '');
    const sanitizedFacultySchool = String(faculty_school || '');
    const sanitizedYearOfStudy = String(year_of_study || '');
    const sanitizedPhoneNumber = String(phone_number || '');
    
    console.log('Sanitized profile data:', {
      name: sanitizedName,
      admission_number: sanitizedAdmissionNumber,
      faculty_school: sanitizedFacultySchool,
      year_of_study: sanitizedYearOfStudy,
      phone_number: sanitizedPhoneNumber
    });
    
    // Update user in database
    const [result] = await pool.query(
      `UPDATE Users 
       SET name = ?, 
           admission_number = ?, 
           faculty_school = ?, 
           year_of_study = ?, 
           phone_number = ? 
       WHERE id = ? AND is_deleted = FALSE`,
      [sanitizedName, sanitizedAdmissionNumber, sanitizedFacultySchool, sanitizedYearOfStudy, sanitizedPhoneNumber, req.user.id]
    );
    
    console.log('Update query result:', result);
    
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
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found after update' });
    }
    
    console.log('Updated profile retrieved:', users[0]);
    
    res.json({ 
      message: 'Profile updated successfully',
      profile: users[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
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

// Security Panel API Routes

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

// Notification routes are already imported and applied at the top of the file

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
        await createNotification(
          claim.claimer_id,
          `Your claim for "${claim.item_title}" has been approved`,
          `/items/${claim.item_id}`
        );
        
        // Create notification for owner
        await createNotification(
          claim.owner_id,
          `Your item "${claim.item_title}" has been claimed and approved`,
          `/items/${claim.item_id}`
        );
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
        await createNotification(
          claim.claimer_id,
          `Your claim for "${claim.item_title}" has been rejected`,
          `/items/${claim.item_id}`
        );
      }
    }
    
    res.json({ message: `Claim ${status} successfully` });
  } catch (error) {
    console.error('Error updating claim status:', error);
    res.status(500).json({ message: 'Error updating claim status' });
  }
});

// Get all items (with optional status filter)
app.get('/items', async (req, res) => {
  try {
    // Extract status from query parameters
    const { status } = req.query;
    console.log(`Status filter: ${status || 'none'}`);
    
    // Build query based on status filter
    let query = `
      SELECT i.*, u.name as reporter_name 
      FROM Items i 
      LEFT JOIN Users u ON i.user_id = u.id
      WHERE i.is_deleted = FALSE 
    `;
    
    // Add status filter if provided
    if (status) {
      query += ` AND i.status = ? `;
    }
    
    // Add order by
    query += ` ORDER BY i.created_at DESC`;
    
    // Execute query with or without the status parameter
    const [items] = status 
      ? await pool.query(query, [status])
      : await pool.query(query);
    
    console.log(`Retrieved ${items.length} items`);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Error fetching items' });
  }
});

// Specific endpoint for found items
app.get('/items/found', async (req, res) => {
  try {
    console.log('Found items endpoint called');
    const [items] = await pool.query(
      `SELECT i.*, u.name as reporter_name 
       FROM Items i 
       LEFT JOIN Users u ON i.user_id = u.id
       WHERE i.is_deleted = FALSE 
       AND i.status = 'found'
       AND i.is_approved = TRUE
       ORDER BY i.created_at DESC`
    );
    
    console.log(`Retrieved ${items.length} approved found items`);
    res.json(items);
  } catch (error) {
    console.error('Error fetching found items:', error);
    res.status(500).json({ message: 'Error fetching found items' });
  }
});

// Get all lost items (public view)
app.get('/items/lost', async (req, res) => {
  try {
    // First, check if we can connect to the database
    const connection = await pool.getConnection();
    connection.release();
    
    try {
      // Try the original query with JOIN
      const [items] = await pool.query(`
        SELECT 
          i.id,
          i.title,
          i.category,
          i.subcategory,
          i.description,
          i.status,
          i.location,
          i.date,
          i.image,
          i.created_at,
          i.is_approved,
          i.user_id,
          i.claimed_by,
          u.name as reporter_name
        FROM Items i
        LEFT JOIN Users u ON i.user_id = u.id
        WHERE i.is_deleted = FALSE 
        AND i.status = 'lost'
        ORDER BY i.created_at DESC
      `);
      
      res.json(items);
    } catch (queryError) {
      // If the JOIN fails, try a simpler query without the JOIN
      const [items] = await pool.query(`
        SELECT 
          id,
          title,
          category,
          subcategory,
          description,
          status,
          location,
          date,
          image,
          created_at,
          is_approved,
          user_id
        FROM Items
        WHERE is_deleted = FALSE 
        AND status = 'lost'
        ORDER BY created_at DESC
      `);
      
      // Add a placeholder for reporter_name
      const itemsWithReporter = items.map(item => ({
        ...item,
        reporter_name: 'Anonymous'
      }));
      
      res.json(itemsWithReporter);
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching lost items',
      error: error.message
    });
  }
});

// Get all items for authenticated user (includes all statuses for that user)
app.get('/api/items', authenticateToken, async (req, res) => {
  try {
    // Sanity check the user ID
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Check if we want to filter by status
    const statusFilter = req.query.status;
    
    // First, check if we can connect to the database
    let connection;
    try {
      connection = await pool.getConnection();
    } catch (connectionError) {
      return res.status(500).json({ 
        message: 'Database connection error',
        error: connectionError.message
      });
    } finally {
      if (connection) connection.release();
    }
    
    // Build query based on filters and user role
    let query = `
      SELECT 
        i.id,
        i.title,
        i.category,
        i.subcategory,
        i.description,
        i.status,
        i.location,
        i.date,
        i.image,
        i.created_at,
        i.is_approved,
        i.user_id,
        i.claimed_by,
        i.is_donated
      FROM Items i
      WHERE i.is_deleted = FALSE
    `;
    
    // Create array for query parameters
    const queryParams = [];
    
    // Apply role-based filtering:
    // - Admins: see all non-donated items
    // - Other users: see only non-donated items AND only those created within the past year
    if (req.user.role === 'admin') {
      // Admin sees all non-donated items
      query += ` AND i.is_donated = FALSE`;
    } else {
      // Regular users see only their own items
      query += ` AND i.user_id = ? AND i.is_donated = FALSE`;
      queryParams.push(req.user.id);
      
      // Regular users only see items less than a year old
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
      
      query += ` AND i.created_at >= ?`;
      queryParams.push(oneYearAgoStr);
    }
    
    // Add status filter if provided
    if (statusFilter) {
      query += ` AND i.status = ?`;
      queryParams.push(statusFilter);
    }
    
    // Add order by
    query += ` ORDER BY i.created_at DESC`;
    
    try {
      const [items] = await pool.query(query, queryParams);
      
      // Return the result
      return res.json(items);
    } catch (queryError) {
      // Return a proper error response
      return res.status(500).json({ 
        message: 'Database query error',
        error: queryError.message
      });
    }
  } catch (error) {
    // Return a proper error response
    return res.status(500).json({ 
      message: 'Server error fetching items',
      error: error.message
    });
  }
});

// Get item details (full details only for authorized users)
app.get('/items/:id', authenticateToken, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT 
        i.*,
        u.name as reporter_name,
        u.email as reporter_email
      FROM Items i
      JOIN Users u ON i.user_id = u.id
      WHERE i.id = ? AND i.is_deleted = FALSE
    `, [req.params.id]);

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = items[0];

    // Only return sensitive info if user is admin, security, or the item reporter
    if (req.user.role !== 'admin' && req.user.role !== 'security' && req.user.id !== item.user_id) {
      delete item.location;
      delete item.date;
      delete item.reporter_email;
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item details:', error);
    res.status(500).json({ message: 'Error fetching item details' });
  }
});

// Submit a lost item (JSON version)
app.post('/items/lost', authenticateToken, async (req, res) => {
  try {
    console.log('Received lost item submission request (JSON)');
    console.log('Request body:', req.body);
    
    // Extract data from request body
    const { title, category, subcategory, description, location, date } = req.body;
    
    // User ID from token
    const userId = req.user.id;
    console.log('User ID from token:', userId);
    
    if (!title) {
      console.error('Title is required but not provided');
      return res.status(400).json({ message: 'Title is required' });
    }

    console.log('Inserting lost item into database with JSON data');
    
    try {
      // Lost items are automatically approved (is_approved = TRUE)
      const [result] = await pool.query(`
        INSERT INTO Items 
          (title, category, subcategory, description, location, status, date, user_id, is_approved) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [title, category, subcategory, description, location, 'lost', date, userId]);

      const lostItemId = result.insertId;
      console.log('Lost item inserted successfully with ID:', lostItemId, '(automatically approved)');
      
      // Notify security staff about new lost item
      const message = `New lost item "${title}" has been reported.`;
      try {
        await notifySecurityStaff(message);
      } catch (notifyError) {
        console.error('Error notifying security staff:', notifyError);
        // Continue anyway
      }
      
      // Check for matches with existing found items
      try {
        console.log('Checking for matches with existing found items...');
        const itemWithId = { 
          id: lostItemId, 
          title, 
          category, 
          subcategory, 
          description, 
          location, 
          status: 'lost', 
          date, 
          user_id: userId 
        };
        const matches = await matchItems(itemWithId);
        console.log(`Found ${matches.length} potential matches for lost item ${lostItemId}`);
      } catch (matchError) {
        console.error('Error checking for matches:', matchError);
        // Continue anyway
      }

      return res.status(201).json({ 
        message: 'Lost item submitted successfully', 
        itemId: lostItemId 
      });
    } catch (dbError) {
      console.error('Database error during item insertion:', dbError);
      return res.status(500).json({ 
        message: 'Database error while submitting lost item',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error submitting lost item:', error);
    return res.status(500).json({ 
      message: 'Error submitting lost item',
      error: error.message
    });
  }
});

// Submit a found item (JSON version)
app.post('/items/found', authenticateToken, async (req, res) => {
  try {
    console.log('Received found item submission request (JSON)');
    console.log('Request body:', req.body);
    
    // Extract data from request body
    const { title, category, subcategory, description, location, date, status, image } = req.body;
    
    // User ID from token
    const userId = req.user.id;
    console.log('User ID from token:', userId);
    
    if (!title) {
      console.error('Title is required but not provided');
      return res.status(400).json({ message: 'Title is required' });
    }

    console.log('Inserting found item into database with JSON data');
    console.log('SQL parameters:', [title, category, subcategory, description, location, status, date, userId, image]);
    
    try {
      // Found items require security approval (is_approved = FALSE)
      const [result] = await pool.query(`
        INSERT INTO Items 
          (title, category, subcategory, description, location, status, date, user_id, image, is_approved) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
      `, [title, category, subcategory, description, location, status, date, userId, image || null]);

      console.log('Found item inserted successfully with ID:', result.insertId);
      console.log('Item approval status set to FALSE - requires security approval');
      
      // Notify security staff about new found item
      const message = `New found item "${title}" has been reported.`;
      try {
        await notifySecurityStaff(message);
      } catch (notifyError) {
        console.error('Error notifying security staff:', notifyError);
        // Continue anyway
      }
      
      // Check for matches with existing lost items if the item is approved
      if (result.is_approved) {
        try {
          console.log('Found item is approved, checking for matches with existing lost items...');
          const itemWithId = { 
            id: result.insertId, 
            title, 
            category, 
            subcategory, 
            description, 
            location, 
            status: 'found', 
            date, 
            user_id: userId 
          };
          const matches = await matchItems(itemWithId);
          console.log(`Found ${matches.length} potential matches for found item ${result.insertId}`);
        } catch (matchError) {
          console.error('Error checking for matches:', matchError);
          // Continue anyway
        }
      } else {
        console.log('Found item needs approval, skipping match check until approved');
      }

      return res.status(201).json({ 
        message: 'Found item submitted successfully', 
        itemId: result.insertId 
      });
    } catch (dbError) {
      console.error('Database error during item insertion:', dbError);
      console.error('Error code:', dbError.code);
      console.error('Error message:', dbError.message);
      console.error('Error stack:', dbError.stack);
      return res.status(500).json({ 
        message: 'Database error while submitting found item',
        error: dbError.message,
        code: dbError.code
      });
    }
  } catch (error) {
    console.error('Error submitting found item:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      message: 'Error submitting found item',
      error: error.message
    });
  }
});

// Helper function to notify security staff
async function notifySecurityStaff(message, type = 'item_report') {
  try {
    // Use the notifySecurityStaff function from notificationService
    await notificationService.notifySecurityStaff(message, '/security-dashboard');
  } catch (error) {
    console.error('Error notifying security staff:', error);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  // Authentication for socket connection
  socket.on('authenticate', (token) => {
    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Socket authenticated for user:', decoded.id);
      
      // Store user info in socket
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      
      // Join user's personal notification channel
      socket.join(`user:${decoded.id}`);
      
      // If security role, join security channel
      if (decoded.role === 'security' || decoded.role === 'admin') {
        socket.join('security-staff');
        console.log(`User ${decoded.id} joined security-staff channel`);
      }
      
      socket.emit('authenticated', { success: true });
    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });

  // Join a chat room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Handle chat messages
  socket.on('send_message', async (data) => {
    try {
      const { roomId, message, senderId, senderName, senderRole } = data;
      
      // Save message to database
      const [result] = await pool.query(
        'INSERT INTO ChatMessages (room_id, sender_id, message, sender_name, sender_role) VALUES (?, ?, ?, ?, ?)',
        [roomId, senderId, message, senderName, senderRole]
      );

      // Broadcast message to room
      io.to(roomId).emit('receive_message', {
        id: result.insertId,
        roomId,
        message,
        senderId,
        senderName,
        senderRole,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Get chat messages for a room
app.get('/api/chat/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const [messages] = await pool.query(
      'SELECT * FROM ChatMessages WHERE room_id = ? ORDER BY created_at ASC',
      [roomId]
    );
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching chat messages' });
  }
});

// Create a new chat room
app.post('/api/chat/rooms', authenticateToken, async (req, res) => {
  try {
    const { participants } = req.body;
    const [result] = await pool.query(
      'INSERT INTO ChatRooms (created_by) VALUES (?)',
      [req.user.id]
    );
    
    const roomId = result.insertId;
    
    // Add participants to room
    for (const participantId of participants) {
      await pool.query(
        'INSERT INTO ChatRoomParticipants (room_id, user_id) VALUES (?, ?)',
        [roomId, participantId]
      );
    }
    
    res.json({ roomId });
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ message: 'Error creating chat room' });
  }
});

// Get user's chat rooms
app.get('/api/chat/rooms', authenticateToken, async (req, res) => {
  try {
    const [rooms] = await pool.query(
      `SELECT cr.*, 
        GROUP_CONCAT(u.name) as participant_names,
        GROUP_CONCAT(u.role) as participant_roles
      FROM ChatRooms cr
      JOIN ChatRoomParticipants crp ON cr.id = crp.room_id
      JOIN Users u ON crp.user_id = u.id
      WHERE crp.user_id = ?
      GROUP BY cr.id`,
      [req.user.id]
    );
    
    res.json({ rooms });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ message: 'Error fetching chat rooms' });
  }
});

// Get system logs (admin only)
app.get('/api/admin/logs', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    console.log('Admin logs request received from user ID:', req.user.id);

    // Get system logs with user information - handle if there is no user info
    const [logs] = await pool.query(
      `SELECT l.id, l.action, l.created_at, l.by_user,
       u.name as user_name, u.email as user_email 
       FROM Logs l 
       LEFT JOIN Users u ON l.by_user = u.id 
       ORDER BY l.created_at DESC 
       LIMIT 500`
    );

    console.log(`Retrieved ${logs.length} logs from database`);

    // If no logs found, create a sample log for testing
    if (logs.length === 0) {
      console.log('No logs found in database, creating sample log');
      await pool.query(
        'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
        ['System check - no previous logs found', req.user.id]
      );
      
      // Fetch again with the new log
      const [updatedLogs] = await pool.query(
        `SELECT l.id, l.action, l.created_at, l.by_user,
         u.name as user_name, u.email as user_email 
         FROM Logs l 
         LEFT JOIN Users u ON l.by_user = u.id 
         ORDER BY l.created_at DESC 
         LIMIT 500`
      );
      
      logs.push(...updatedLogs);
      console.log(`Added sample log, now have ${logs.length} logs`);
    }

    // Process logs to handle null values
    const processedLogs = logs.map(log => ({
      id: log.id,
      action: log.action || 'Unknown action',
      created_at: log.created_at,
      by_user: log.by_user,
      user_name: log.user_name || 'Unknown user',
      user_email: log.user_email || 'N/A',
      details: log.details || '',
      date: log.created_at // Adding date field for compatibility
    }));

    console.log(`Returning ${processedLogs.length} processed logs`);
    res.json(processedLogs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ message: 'Error fetching system logs', error: error.message });
  }
});

// Get detailed system logs (admin only)
app.get('/api/admin/system-logs', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { limit = 100, offset = 0 } = req.query;
    
    // Get system logs with user information
    const [logs] = await pool.query(
      `SELECT sl.*, u.name as user_name, u.email as user_email 
       FROM SystemLogs sl
       LEFT JOIN Users u ON sl.user_id = u.id 
       ORDER BY sl.created_at DESC 
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    // Get total count for pagination
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM SystemLogs');
    
    res.json({
      logs,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ message: 'Error fetching system logs' });
  }
});

// Helper function to log system actions
async function logSystemAction(action, details, userId = null) {
  try {
    await pool.query(
      'INSERT INTO SystemLogs (action, details, user_id) VALUES (?, ?, ?)',
      [action, details, userId]
    );
  } catch (error) {
    console.error('Error logging system action:', error);
  }
}

// Helper function to track user activity
async function trackUserActivity(userId, actionType, actionDetails, req) {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    await pool.query(
      'INSERT INTO UserActivity (user_id, action_type, action_details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [userId, actionType, actionDetails, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
}

// Helper function to create notifications is now imported from notificationService

// This function is now consolidated with the other notifySecurityStaff function

// Add item endpoint (add this where you handle item creation)
app.post('/api/items', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('Received item creation request with body:', req.body);
    console.log('Authenticated user:', req.user);
    
    const { title, category, subcategory, description, location, date, status } = req.body;
    
    // Get image filename from multer if available
    const imagePath = req.file ? req.file.filename : null;
    console.log('Image path:', imagePath);
    
    // Insert item into database with proper fields
    const [result] = await pool.query(
      'INSERT INTO Items (title, category, subcategory, description, location, date, status, image, user_id, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)',
      [title, category, subcategory, description, location, date || new Date(), status || 'lost', imagePath, req.user.id]
    );
    
    console.log('Item inserted with ID:', result.insertId);
    
    // Notify security staff about any new item
    const message = `New ${status || 'lost'} item "${title}" has been reported. Location: ${location}`;
    await notifySecurityStaff(message, 'new_item');
    
    // If this is a found item, notify ALL users
    if (status === 'found') {
      try {
        console.log('Notifying all users about new found item');
        
        // Get all active users
        const [allUsers] = await pool.query(
          `SELECT id, name, email 
           FROM Users 
           WHERE is_deleted = 0 
           AND id != ?`, // Exclude the user who reported the item
          [req.user.id]
        );
        
        console.log(`Found ${allUsers.length} users to notify about new found item`);
        
        // Notify each user about the new found item
        for (const user of allUsers) {
          await createNotification(
            user.id,
            `A new item "${title}" has been found in category "${category}" at location "${location}". Check if it matches your lost item.`,
            `/items/${result.insertId}`
          );
        }
        
        console.log(`Notified ${allUsers.length} users about new found item`);
      } catch (notifyError) {
        console.error('Error notifying users about new found item:', notifyError);
      }
    }
    
    // Log the action
    await logSystemAction(
      'New item added',
      `Item "${title}" (${status || 'lost'}) added by user ${req.user.id}`,
      req.user.id
    );
    
    // Create a complete item object to pass to matchItems
    const newItem = {
      id: result.insertId,
      title,
      category,
      subcategory, 
      description,
      location,
      date: date || new Date(),
      status: status || 'lost',
      image: imagePath,
      user_id: req.user.id
    };
    
    // Check for matches with existing items
    try {
      console.log(`Checking for matches for new ${newItem.status} item ${newItem.id}: "${newItem.title}"`);
      const matches = await matchItems(newItem);
      console.log(`Found ${matches.length} potential matches for new ${newItem.status} item ${newItem.id}`);
    } catch (matchError) {
      console.error('Error checking for matches:', matchError);
      // Continue anyway, don't block item creation
    }
    
    res.status(201).json({ 
      message: 'Item added successfully', 
      itemId: result.insertId,
      item: newItem
    });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ message: 'Error adding item' });
  }
});

// Update item status endpoint to include notifications
app.put('/api/security/items/:itemId/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'security' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Security permission required' });
  }

  const { itemId } = req.params;
  const { status } = req.body;

  try {
    // Get item details
    const [items] = await pool.query(
      'SELECT * FROM Items WHERE id = ?',
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = items[0];

    // Update item status
    await pool.query(
      'UPDATE Items SET status = ? WHERE id = ?',
      [status, itemId]
    );

    // Create notification for the item owner
    if (item.reported_by) {
      const message = `Your ${item.type === 'lost' ? 'lost' : 'found'} item "${item.title}" has been ${status}`;
      await createNotification(item.reported_by, message, `/items/${item.id}`);
    }

    // Log the status update
    await logSystemAction(
      'Item status updated',
      `Item ID ${itemId} status changed to ${status}`,
      req.user.id
    );

    res.json({ message: 'Item status updated successfully' });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ message: 'Error updating item status' });
  }
});

// Check for matches when a new item is submitted
app.post('/api/items/matches', async (req, res) => {
  try {
    const { item, isFoundItem } = req.body;
    
    // Get items to compare against
    const [items] = await pool.query(`
      SELECT i.*, u.email, u.name
      FROM Items i
      JOIN Users u ON i.user_id = u.id
      WHERE i.is_deleted = FALSE
      AND i.status = ?
      ${isFoundItem ? 'AND i.is_approved = TRUE' : ''}
    `, [isFoundItem ? 'lost' : 'found']);

    const matches = [];
    const MATCH_THRESHOLD = 0.7; // Minimum score to consider a match

    // Use the imported calculateMatchScore function
    for (const compareItem of items) {
      const score = calculateMatchScore(
        isFoundItem ? compareItem : item,
        isFoundItem ? item : compareItem
      );

      if (score >= MATCH_THRESHOLD) {
        console.log(`Match found with score ${score}`);
        
        // Create match record
        const [matchResult] = await pool.query(
          `INSERT INTO ItemMatches 
           (lost_item_id, found_item_id, match_score) 
           VALUES (?, ?, ?)`,
          [
            isFoundItem ? compareItem.id : item.id,
            isFoundItem ? item.id : compareItem.id,
            score
          ]
        );

        // Create notification
        await createNotification(
          compareItem.user_id,
          `A potential match has been found for your ${isFoundItem ? 'lost' : 'found'} item "${compareItem.title}"`,
          `/items/${compareItem.id}`
        );

        // Send email notification to the user who lost the item
        try {
          const matchId = matchResult.insertId;
          const lostItem = isFoundItem ? compareItem : item;
          const foundItem = isFoundItem ? item : compareItem;
          const userEmail = compareItem.email;
          const userName = compareItem.name;
          
          // If this is a lost item, send email to the user who reported it lost
          if (!isFoundItem || (isFoundItem && compareItem.status === 'lost')) {
            // Import email sending functionality
            const { sendMatchNotification } = require('./server-email');
            
            console.log(`Sending match notification email to ${userEmail}`);
            await sendMatchNotification(
              userEmail,
              userName,
              lostItem.title,
              matchId,
              {
                category: lostItem.category,
                date: lostItem.date,
                description: lostItem.description
              }
            );
            console.log('Match notification email sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending match notification email:', emailError);
          // Continue even if email fails
        }

        matches.push({
          matchId: matchResult.insertId,
          score,
          item: compareItem
        });
      }
    }

    res.json({ matches });
  } catch (error) {
    console.error('Error checking for matches:', error);
    res.status(500).json({ message: 'Error checking for matches' });
  }
});

// Find items with matching email
app.post('/api/items/email-matches', async (req, res) => {
  try {
    const { email, itemType } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    console.log(`Searching for ${itemType} items with matching email: ${email}`);
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get items with the specified type
    const [items] = await pool.query(`
      SELECT i.*, u.email as reporter_email, u.name as reporter_name 
      FROM Items i 
      JOIN Users u ON i.user_id = u.id 
      WHERE i.status = ? 
      AND i.is_deleted = FALSE
      ${itemType === 'found' ? 'AND i.is_approved = TRUE' : ''}
    `, [itemType]);
    
    console.log(`Found ${items.length} ${itemType} items to check for email matches`);
    
    // Find items with matching email
    const matches = items.filter(item => {
      // Check if reporter email matches
      if (item.reporter_email && item.reporter_email.toLowerCase().trim() === normalizedEmail) {
        return true;
      }
      
      // Check if email is mentioned in description
      if (item.description && item.description.toLowerCase().includes(normalizedEmail)) {
        return true;
      }
      
      return false;
    });
    
    console.log(`Found ${matches.length} items with matching email: ${normalizedEmail}`);
    
    res.json({ matches });
  } catch (error) {
    console.error('Error finding email matches:', error);
    res.status(500).json({ message: 'Error finding email matches' });
  }
});

// Approve a found item
app.put('/api/security/items/:itemId/approve', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;

    // Update item approval status
    await pool.query(
      'UPDATE Items SET is_approved = TRUE WHERE id = ?',
      [itemId]
    );

    // Get item details for notification
    const [items] = await pool.query(
      'SELECT i.*, u.email, u.name FROM Items i JOIN Users u ON i.user_id = u.id WHERE i.id = ?',
      [itemId]
    );

    if (items.length > 0) {
      const item = items[0];
      
      // Create notification for item owner
      await createNotification(
        item.user_id,
        `Your found item "${item.title}" has been approved`,
        `/items/${itemId}`
      );

      // Check for matches with lost items
      if (item.status === 'found') {
        try {
          // Get lost items to compare against
          const [lostItems] = await pool.query(`
            SELECT i.*, u.email, u.name, u.id as user_id
            FROM Items i
            JOIN Users u ON i.user_id = u.id
            WHERE i.is_deleted = FALSE
            AND i.status = 'lost'
          `);

          const MATCH_THRESHOLD = 0.7; // Minimum score to consider a match
          const { calculateMatchScore } = require('./server-utils');
          const { sendMatchNotification } = require('./server-email');
          
          // Get unique user IDs of users who have lost items
          const lostItemUserIds = [...new Set(lostItems.map(lostItem => lostItem.user_id))];
          
          // Notify all users with lost items about the new found item
          for (const userId of lostItemUserIds) {
            await createNotification(
              userId,
              `A new found item "${item.title}" has been added that might match your lost item`,
              `/items/${itemId}`
            );
          }

          // Run our automatic matching after approval
          try {
            console.log('Item approved, running automatic matching...');
            const matches = await matchItems(item);
            console.log(`Found ${matches.length} potential matches for approved item ${item.id}`);
          } catch (matchError) {
            console.error('Error running automatic matching:', matchError);
            // Continue anyway, use old matching as fallback
          }

          for (const lostItem of lostItems) {
            const score = calculateMatchScore(lostItem, item);

            if (score >= MATCH_THRESHOLD) {
              console.log(`Match found with score ${score} between found item ${item.id} and lost item ${lostItem.id}`);
              
              // Create match record
              const [matchResult] = await pool.query(
                `INSERT INTO ItemMatches 
                (lost_item_id, found_item_id, match_score) 
                VALUES (?, ?, ?)`,
                [lostItem.id, item.id, score]
              );

              // Create notification for lost item owner
              await createNotification(
                lostItem.user_id,
                `A potential match has been found for your lost item "${lostItem.title}"`,
                `/items/${lostItem.id}`
              );

              // Send email notification to the user who reported the lost item
              try {
                const matchId = matchResult.insertId;
                
                console.log(`Sending match notification email to ${lostItem.email}`);
                await sendMatchNotification(
                  lostItem.email,
                  lostItem.name,
                  lostItem.title,
                  matchId,
                  {
                    category: lostItem.category,
                    date: lostItem.date,
                    description: lostItem.description
                  }
                );
                console.log('Match notification email sent successfully');
              } catch (emailError) {
                console.error('Error sending match notification email:', emailError);
                // Continue even if email fails
              }
            }
          }
        } catch (matchError) {
          console.error('Error checking for matches after approval:', matchError);
          // Continue even if matching fails
        }
      }
    }

    res.json({ message: 'Item approved successfully' });
  } catch (error) {
    console.error('Error approving item:', error);
    res.status(500).json({ message: 'Error approving item' });
  }
});

// Reject a found item
app.put('/api/security/items/:itemId/reject', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    const { reason } = req.body;

    // Mark the item as rejected (set is_approved to FALSE)
    await pool.query(
      'UPDATE Items SET is_approved = FALSE, rejection_reason = ? WHERE id = ?',
      [reason || 'Not approved by security', itemId]
    );

    // Get item details for notification
    const [items] = await pool.query(
      'SELECT user_id, title FROM Items WHERE id = ?',
      [itemId]
    );

    if (items.length > 0) {
      const item = items[0];
      
      // Create notification for item owner
      await createNotification(
        item.user_id,
        `Your found item "${item.title}" has been rejected${reason ? `: ${reason}` : ''}`,
        `/items/${itemId}`
      );
    }

    res.json({ message: 'Item rejected successfully' });
  } catch (error) {
    console.error('Error rejecting item:', error);
    res.status(500).json({ message: 'Error rejecting item' });
  }
});

// Submit a request for an item
app.post('/api/items/:itemId/claim', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { claim_description, contact_info } = req.body;

    // Check if item exists and is not already requested
    const [items] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = FALSE',
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = items[0];

    // Check if user already has a pending request for this item
    const [existingClaims] = await pool.query(
      'SELECT * FROM Claims WHERE item_id = ? AND claimer_id = ? AND status = "pending"',
      [itemId, req.user.id]
    );

    if (existingClaims.length > 0) {
      return res.status(400).json({ message: 'You already have a pending request for this item' });
    }

    // Create request
    const [claimResult] = await pool.query(
      `INSERT INTO Claims 
       (item_id, claimer_id, claim_description, contact_info) 
       VALUES (?, ?, ?, ?)`,
      [itemId, req.user.id, claim_description, contact_info]
    );

    // Create notification for security staff
    const [securityStaff] = await pool.query(
      'SELECT id FROM Users WHERE role IN ("security", "admin") AND is_deleted = FALSE'
    );

    for (const staff of securityStaff) {
      await createNotification(
        staff.id,
        `New item request for "${item.title}"`,
        `/items/${itemId}`
      );
    }
    
    // Also notify all security staff using notifySecurityStaff
    await notifySecurityStaff(
      `New item request for "${item.title}" needs your attention`,
      `/security-dashboard`
    );

    res.status(201).json({ 
      message: 'Item request submitted successfully',
      claimId: claimResult.insertId
    });
  } catch (error) {
    console.error('Error submitting item request:', error);
    res.status(500).json({ message: 'Error submitting item request' });
  }
});

// Request an item (mark as requested) - PUT endpoint
app.put('/items/:itemId/request', async (req, res) => {
  try {
    console.log('Request item PUT endpoint called');
    const { itemId } = req.params;
    
    // Log for debugging
    console.log(`Attempting to request item with ID: ${itemId}`);
    
    // Get the user ID from the token if available
    let userId = null;
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
        console.log(`User ID from token: ${userId}`);
      } catch (tokenError) {
        console.error('Token verification error:', tokenError);
        // Continue without user ID
      }
    }
    
    // Verify the item exists and is available
    console.log(`Checking if item ${itemId} exists and is available`);
    try {
      const [items] = await pool.query(
        'SELECT * FROM Items WHERE id = ? AND is_deleted = 0',
        [itemId]
      );

      if (items.length === 0) {
        console.log(`Item with ID ${itemId} not found`);
        return res.status(404).json({ message: 'Item not found' });
      }

      const item = items[0];
      console.log(`Found item: ${JSON.stringify(item)}`);
      
      // Only allow requesting items with 'found' status
      if (item.status !== 'found') {
        console.log(`Item with ID ${itemId} has status ${item.status}, not 'found'`);
        return res.status(400).json({ 
          message: `Item cannot be requested because its status is '${item.status}' not 'found'` 
        });
      }
      
      // Update item status to 'requested' with pending approval
      try {
        // Add request_status column if it doesn't exist
        try {
          await pool.query(`
            ALTER TABLE Items 
            ADD COLUMN IF NOT EXISTS request_status VARCHAR(20) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS request_user_id INT DEFAULT NULL
          `);
        } catch (alterError) {
          console.error('Error altering Items table:', alterError);
          // Continue anyway, column might already exist
        }
        
        // Update with pending approval status
        await pool.query(
          'UPDATE Items SET status = "requested", request_status = "pending", request_user_id = ?, updated_at = NOW() WHERE id = ?',
          [userId, itemId]
        );
        console.log(`Successfully updated item ${itemId} to 'requested' status with pending approval`);
        
        // Create notification for security staff
        if (userId) {
          try {
            // Get item details for better notification
            const [itemDetails] = await pool.query(
              'SELECT title FROM Items WHERE id = ?',
              [itemId]
            );
            
            const itemTitle = itemDetails.length > 0 ? itemDetails[0].title : `Item #${itemId}`;
            
            // Use the notifySecurityStaff function for more reliable notification
            const { notifySecurityStaff } = require('./services/notificationService');
            await notifySecurityStaff(
              `New item request for "${itemTitle}" needs your approval`,
              `/security-dashboard`
            );
            
            console.log('Security staff notifications created via notifySecurityStaff');
          } catch (notifyError) {
            console.error('Error notifying security staff:', notifyError);
            // Continue anyway
          }
        }
      } catch (statusUpdateError) {
        console.error('Error updating item status:', statusUpdateError);
        return res.status(500).json({ 
          message: 'Error updating item status', 
          error: statusUpdateError.message 
        });
      }
      
      // Return the updated item
      res.json({ 
        message: 'Item requested successfully. Your request is pending approval by security staff.',
        item: {
          ...item,
          status: 'requested',
          request_status: 'pending'
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ message: 'Database error', error: dbError.message });
    }
  } catch (error) {
    console.error('Error requesting item:', error);
    res.status(500).json({ message: 'Error requesting item', error: error.message });
  }
});

// Alternative POST endpoint for requesting items
app.post('/items/request/:itemId', async (req, res) => {
  try {
    console.log('Request item POST endpoint called');
    const { itemId } = req.params;
    
    // Log for debugging
    console.log(`Attempting to request item with ID: ${itemId}`);
    
    // Get the user ID from the token if available
    let userId = null;
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
        console.log(`User ID from token: ${userId}`);
      } catch (tokenError) {
        console.error('Token verification error:', tokenError);
        // Continue without user ID
      }
    }
    
    // Verify the item exists and is available
    console.log(`Checking if item ${itemId} exists and is available`);
    try {
      const [items] = await pool.query(
        'SELECT * FROM Items WHERE id = ? AND is_deleted = 0',
        [itemId]
      );

      if (items.length === 0) {
        console.log(`Item with ID ${itemId} not found`);
        return res.status(404).json({ message: 'Item not found' });
      }

      const item = items[0];
      console.log(`Found item: ${JSON.stringify(item)}`);
      
      // Only allow requesting items with 'found' status
      if (item.status !== 'found') {
        console.log(`Item with ID ${itemId} has status ${item.status}, not 'found'`);
        return res.status(400).json({ 
          message: `Item cannot be requested because its status is '${item.status}' not 'found'` 
        });
      }
      
      // Update item status to 'requested' with pending approval
      try {
        // Add request_status column if it doesn't exist
        try {
          await pool.query(`
            ALTER TABLE Items 
            ADD COLUMN IF NOT EXISTS request_status VARCHAR(20) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS request_user_id INT DEFAULT NULL
          `);
        } catch (alterError) {
          console.error('Error altering Items table:', alterError);
          // Continue anyway, column might already exist
        }
        
        // Update with pending approval status
        await pool.query(
          'UPDATE Items SET status = "requested", request_status = "pending", request_user_id = ?, updated_at = NOW() WHERE id = ?',
          [userId, itemId]
        );
        console.log(`Successfully updated item ${itemId} to 'requested' status with pending approval`);
        
        // Create notification for security staff
        if (userId) {
          try {
            // Get item details for better notification
            const [itemDetails] = await pool.query(
              'SELECT title FROM Items WHERE id = ?',
              [itemId]
            );
            
            const itemTitle = itemDetails.length > 0 ? itemDetails[0].title : `Item #${itemId}`;
            
            // Use the notifySecurityStaff function for more reliable notification
            const { notifySecurityStaff } = require('./services/notificationService');
            await notifySecurityStaff(
              `New item request for "${itemTitle}" needs your approval`,
              `/security-dashboard`
            );
            
            console.log('Security staff notifications created via notifySecurityStaff');
          } catch (notifyError) {
            console.error('Error notifying security staff:', notifyError);
            // Continue anyway
          }
        }
      } catch (statusUpdateError) {
        console.error('Error updating item status:', statusUpdateError);
        return res.status(500).json({ 
          message: 'Error updating item status', 
          error: statusUpdateError.message 
        });
      }
      
      // Return the updated item
      res.json({ 
        message: 'Item requested successfully. Your request is pending approval by security staff.',
        item: {
          ...item,
          status: 'requested',
          request_status: 'pending'
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ message: 'Database error', error: dbError.message });
    }
  } catch (error) {
    console.error('Error requesting item:', error);
    res.status(500).json({ message: 'Error requesting item', error: error.message });
  }
});

// Get pending items for security review
app.get('/api/security/pending-items', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const [items] = await pool.query(`
      SELECT 
        i.*,
        u.name as reporter_name
      FROM Items i
      JOIN Users u ON i.user_id = u.id
      WHERE i.is_deleted = FALSE 
      AND i.is_approved = FALSE 
      AND i.status = 'found'
      ORDER BY i.created_at DESC
    `);

    res.json(items);
  } catch (error) {
    console.error('Error fetching pending items:', error);
    res.status(500).json({ message: 'Error fetching pending items' });
  }
});

// Get pending item requests for security review
app.get('/api/security/pending-requests', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    console.log('Fetching pending item requests for security staff...');
    
    const [items] = await pool.query(`
      SELECT 
        i.*,
        u.name as requester_name,
        u.email as requester_email,
        r.name as reporter_name,
        r.email as reporter_email
      FROM Items i
      LEFT JOIN Users u ON i.request_user_id = u.id
      LEFT JOIN Users r ON i.user_id = r.id
      WHERE i.is_deleted = FALSE 
      AND i.status = 'requested'
      ORDER BY i.updated_at DESC
    `);
    
    console.log(`Found ${items.length} requested items`);
    
    // Log the first item for debugging if available
    if (items.length > 0) {
      console.log('Sample item details:');
      console.log(`- Item ID: ${items[0].id}`);
      console.log(`- Title: ${items[0].title || 'N/A'}`);
      console.log(`- Requester: ${items[0].requester_name || 'Unknown'} (ID: ${items[0].request_user_id || 'N/A'})`);
      console.log(`- Reporter: ${items[0].reporter_name || 'Unknown'} (ID: ${items[0].user_id || 'N/A'})`);
    }

    res.json(items);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Error fetching pending requests' });
  }
});

// Approve a pending item request
app.put('/api/security/requests/:itemId/approve', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    
    console.log(`Processing request approval for item ${itemId}`);
    
    // First check if item exists at all
    const [itemCheck] = await pool.query('SELECT * FROM Items WHERE id = ?', [itemId]);
    
    if (itemCheck.length === 0) {
      console.log(`Item ${itemId} not found in the database`);
      return res.status(404).json({ message: 'Item not found' });
    }
    
    console.log(`Found item ${itemId}: status=${itemCheck[0].status}, request_user_id=${itemCheck[0].request_user_id || 'null'}`);
    
    // If item exists but is not in requested status, update it
    if (itemCheck[0].status !== 'requested') {
      console.log(`Item ${itemId} exists but has status "${itemCheck[0].status}" instead of "requested". Updating status.`);
      await pool.query('UPDATE Items SET status = "requested" WHERE id = ?', [itemId]);
      console.log(`Updated item ${itemId} status to "requested"`);
    }
    
    // Use the fetched item
    const item = itemCheck[0];
    
    // Update the request status to approved
    try {
      await pool.query(
        'UPDATE Items SET request_status = "approved" WHERE id = ?',
        [itemId]
      );
      console.log(`Updated request_status to approved for item ${itemId}`);
    } catch (updateError) {
      console.error('Error updating request_status:', updateError);
      // Continue processing even if this specific update fails
    }
    
    // Notify the requester if available
    if (item.request_user_id) {
      // Get requester info
      const [requesters] = await pool.query(
        'SELECT * FROM Users WHERE id = ?',
        [item.request_user_id]
      );
      
      if (requesters.length > 0) {
        const requester = requesters[0];
        
        console.log(`Creating notification for requester ${requester.id} (${requester.name}) about approved item ${itemId}`);
        
        // Create notification
        const notification = await createNotification(
          requester.id,
          `Your request for item "${item.title}" has been approved. Please visit the security office to collect it.`,
          `/items/${itemId}`
        );
        
        console.log('Notification created:', notification ? 'Success' : 'Failed');
        
        // Also try to send an email notification
        try {
          const emailService = require('./server-email');
          await emailService.sendRequestApprovedNotification(
            requester.email,
            requester.name,
            item.title,
            itemId
          );
          console.log(`Email notification sent to ${requester.email}`);
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Continue with the process even if email fails
        }
      } else {
        console.log(`No requester found with ID ${item.request_user_id}`);
      }
    } else {
      console.log(`No request_user_id found for item ${itemId}`);
    }
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Item request approved: Item #${itemId}`, req.user.id]
    );

    res.json({ message: 'Item request approved successfully' });
  } catch (error) {
    console.error('Error approving item request:', error);
    res.status(500).json({ message: 'Error approving item request' });
  }
});

// Reject a pending item request
app.put('/api/security/requests/:itemId/reject', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    const { reason } = req.body;
    
    // Check if item exists and is in requested status
    const [items] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND status = "requested"',
      [itemId]
    );
    
    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found or not in pending request status' });
    }
    
    const item = items[0];
    
    // Update the item back to found status and clear request fields
    await pool.query(
      'UPDATE Items SET status = "found", request_status = "rejected", rejection_reason = ? WHERE id = ?',
      [reason || 'Request rejected by security', itemId]
    );
    
    // Notify the requester if available
    if (item.request_user_id) {
      // Get requester info
      const [requesters] = await pool.query(
        'SELECT * FROM Users WHERE id = ?',
        [item.request_user_id]
      );
      
      if (requesters.length > 0) {
        const requester = requesters[0];
        
        // Create notification
        await createNotification(
          requester.id,
          `Your request for item "${item.title}" has been rejected${reason ? `: ${reason}` : ''}.`,
          `/items/${itemId}`
        );
      }
    }
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Item request rejected: Item #${itemId}${reason ? ` - Reason: ${reason}` : ''}`, req.user.id]
    );

    res.json({ message: 'Item request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting item request:', error);
    res.status(500).json({ message: 'Error rejecting item request' });
  }
});

// Get pending claims for security review
app.get('/api/security/pending-claims', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const [claims] = await pool.query(`
      SELECT 
        c.*,
        i.title as item_title,
        u.name as claimer_name
      FROM Claims c
      JOIN Items i ON c.item_id = i.id
      JOIN Users u ON c.claimer_id = u.id
      WHERE c.status = 'pending'
      AND i.is_deleted = FALSE
      ORDER BY c.created_at DESC
    `);

    res.json(claims);
  } catch (error) {
    console.error('Error fetching pending claims:', error);
    res.status(500).json({ message: 'Error fetching pending claims' });
  }
});

// Process claim (approve/reject)
app.put('/api/security/claims/:claimId/:action', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { claimId, action } = req.params;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    // Get claim details
    const [claims] = await pool.query(
      'SELECT * FROM Claims WHERE id = ?',
      [claimId]
    );

    if (claims.length === 0) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    const claim = claims[0];

    // Update claim status
    await pool.query(
      'UPDATE Claims SET status = ? WHERE id = ?',
      [action === 'approve' ? 'approved' : 'rejected', claimId]
    );

    if (action === 'approve') {
      // Update item status
      await pool.query(
        'UPDATE Items SET status = ? WHERE id = ?',
        ['requested', claim.item_id]
      );

      // Create notification for claimer
      await createNotification(
        claim.claimer_id,
        'Your request has been approved',
        `/items/${claim.item_id}`,
        claim.item_id
      );
    } else {
      // Create notification for claimer
      await createNotification(
        claim.claimer_id,
        'Your request has been rejected',
        `/items/${claim.item_id}`
      );
    }

    res.json({ message: `Request ${action}d successfully` });
  } catch (error) {
    console.error('Error processing claim:', error);
    res.status(500).json({ message: 'Error processing claim' });
  }
});

// Upload route for found item images
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    // If no file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    console.log('File uploaded successfully:', req.file);

    // Return the filename that can be stored in the database
    res.json({ 
      success: true, 
      filename: req.file.filename,
      message: 'Image uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error uploading image'
    });
  }
});

// Test route to check uploads directory - commented out
// app.get('/api/test-uploads', (req, res) => {
//   try {
//     if (!fs.existsSync(uploadsDir)) {
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Uploads directory does not exist' 
//       });
//     }
//     
//     const files = fs.readdirSync(uploadsDir);
//     res.json({ 
//       success: true,
//       directory: uploadsDir,
//       files,
//       count: files.length,
//       message: 'Uploads directory is accessible'
//     });
//   } catch (error) {
//     console.error('Error checking uploads directory:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message,
//       message: 'Error checking uploads directory'
//     });
//   }
// });

// Test route to directly serve the test image - commented out
// app.get('/api/test-image', (req, res) => {
//   const testImagePath = path.join(__dirname, 'uploads', 'test-image.png');
//   
//   if (fs.existsSync(testImagePath)) {
//     console.log(`Test image exists at: ${testImagePath}`);
//     res.sendFile(testImagePath);
//   } else {
//     console.log(`Test image does not exist at: ${testImagePath}`);
//     res.status(404).json({ message: 'Test image not found' });
//   }
// });

// Mark item as received by security
app.put('/api/security/items/:itemId/receive', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;

    // Update item status
    await pool.query(
      'UPDATE Items SET status = ? WHERE id = ?',
      ['received', itemId]
    );

    // Log the action
    await logSystemAction('Item marked as received', { itemId }, req.user.id);

    res.json({ message: 'Item marked as received successfully' });
  } catch (error) {
    console.error('Error marking item as received:', error);
    res.status(500).json({ message: 'Error marking item as received' });
  }
});

// Mark item as returned to owner
app.put('/api/security/items/:itemId/return', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;

    // Update item status to returned
    await pool.query(
      'UPDATE Items SET status = ? WHERE id = ?',
      ['returned', itemId]
    );

    // Get item details for notification
    const [items] = await pool.query(
      'SELECT user_id, title FROM Items WHERE id = ?',
      [itemId]
    );

    if (items.length > 0) {
      const item = items[0];
      
      // Create notification for item owner
      await createNotification(
        item.user_id,
        `Your item "${item.title}" has been returned to its owner`,
        `/items/${itemId}`
      );
    }

    res.json({ message: 'Item marked as returned successfully' });
  } catch (error) {
    console.error('Error marking item as returned:', error);
    res.status(500).json({ message: 'Error marking item as returned' });
  }
});

// Get unclaimed items older than 1 year for potential donation
app.get('/api/admin/unclaimed-items', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Calculate date 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    // Get items that are found, approved, not deleted, and older than 1 year
    const [items] = await pool.query(`
      SELECT 
        i.*,
        u.name as reporter_name
      FROM Items i
      JOIN Users u ON i.user_id = u.id
      WHERE i.is_deleted = FALSE 
      AND i.is_approved = TRUE
      AND i.status = 'found'
      AND i.created_at < ?
      ORDER BY i.created_at ASC
    `, [oneYearAgoStr]);

    res.json(items);
  } catch (error) {
    console.error('Error fetching unclaimed items:', error);
    res.status(500).json({ message: 'Error fetching unclaimed items' });
  }
});

// Test route for sending match notification emails - commented out
// app.get('/api/test/email-match/:email', async (req, res) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET');
//   res.header('Access-Control-Allow-Headers', 'Content-Type');
//   
//   try {
//     const { email } = req.params;
//     const { name, itemTitle, category, location } = req.query;
// 
//     console.log(`Testing match notification email to: ${email}`);
//     
//     // Actually send the email notification
//     const emailResult = await emailService.sendMatchNotification(
//       email,
//       name || 'Test User',
//       itemTitle || 'Sample Item',
//       '0', // Sample match ID
//       {
//         category: category || 'Electronics',
//         date: new Date().toISOString().slice(0, 10),
//         description: 'Sample item description',
//         location: location || 'Library'
//       }
//     );
//     
//     // Send a response with the email status
//     res.json({
//       success: emailResult.success,
//       message: emailResult.success 
//         ? `Test match notification sent to ${email}` 
//         : `Failed to send test notification to ${email}`,
//       emailResult,
//       emailParams: {
//         userEmail: email,
//         userName: name || 'Test User',
//         itemTitle: itemTitle || 'Sample Item',
//         matchId: '0'
//       }
//     });
//   } catch (error) {
//     console.error('Error sending test match notification:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Error sending test match notification',
//       error: error.message,
//       stack: error.stack
//     });
//   }
// });

// Ban/Delete a user (soft delete) - Admin and Security only
app.put('/api/admin/users/:userId/ban', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin or Security permission required' });
    }
    
    const { userId } = req.params;
    const reason = req.body.reason || 'No reason provided';
    
    // Prevent self-banning
    if (userId == req.user.id) {
      return res.status(400).json({ message: 'You cannot ban yourself' });
    }
    
    // Check if user exists
    const [users] = await pool.query('SELECT * FROM Users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if trying to ban an admin (only admins can ban other admins)
    if (users[0].role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Security staff cannot ban admin users' });
    }
    
    // Soft delete the user
    await pool.query('UPDATE Users SET is_deleted = TRUE, ban_reason = ? WHERE id = ?', [reason, userId]);
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`User ${users[0].name} (ID: ${userId}) banned: ${reason}`, req.user.id]
    );
    
    // Send email notification to the banned user
    try {
      console.log('\n==== SENDING BAN EMAIL NOTIFICATION ====');
      console.log('User email:', users[0].email);
      console.log('User name:', users[0].name);
      
      const emailService = require('./server-email-nodemailer');
      const emailResult = await emailService.sendAccountBlockedNotification(users[0].email, users[0].name, reason);
      
      if (emailResult.success) {
        console.log('Ban notification email sent successfully!');
        console.log('Message ID:', emailResult.messageId);
      } else {
        console.error('Failed to send ban notification email:', emailResult.error);
      }
      console.log('==========================================\n');
    } catch (emailError) {
      console.error('Failed to send ban notification email:', emailError);
      // Continue with the ban process even if email fails
    }
    
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Error banning user' });
  }
});

// Get all items for security/admin dashboard
app.get('/api/security/all-items', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    // Get all items including unapproved ones
    // Include both reporter and requester information
    const [items] = await pool.query(`
      SELECT 
        i.*,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        requester.name as requester_name,
        requester.email as requester_email
      FROM 
        Items i
      LEFT JOIN 
        Users reporter ON i.user_id = reporter.id
      LEFT JOIN 
        Users requester ON i.request_user_id = requester.id
      WHERE 
        i.is_deleted = FALSE
      ORDER BY 
        i.created_at DESC
    `);
    
    console.log(`Fetched ${items.length} items for security dashboard`);
    // Log a sample item if available
    if (items.length > 0 && items[0].status === 'requested') {
      console.log('Sample requested item:');
      console.log(`- Item ID: ${items[0].id}`);
      console.log(`- Title: ${items[0].title}`);
      console.log(`- Status: ${items[0].status}`);
      console.log(`- Reporter: ${items[0].reporter_name || 'N/A'}`);
      console.log(`- Requester: ${items[0].requester_name || 'N/A'}`);
    }
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching all items:', error);
    res.status(500).json({ message: 'Error fetching all items' });
  }
});

// Admin routes

// Get all users for admin
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('User with role', req.user.role, 'attempted to access admin users endpoint');
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    console.log('Admin users endpoint accessed by user:', req.user.id, req.user.name);

    // Get all users including soft-deleted ones
    try {
      const [users] = await pool.query(
        'SELECT id, name, email, role, admission_number, faculty_school, year_of_study, phone_number, is_deleted, created_at FROM Users'
      );
      console.log('Users query successful, found', users.length, 'users');
      res.json(users);
    } catch (dbError) {
      console.error('Database error fetching users:', dbError);
      res.status(500).json({ message: 'Database error fetching users', error: dbError.message });
    }
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Error fetching all users', error: error.message });
  }
});

// Get system logs for admin
app.get('/api/admin/logs', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    // Get all logs with user information
    const [logs] = await pool.query(`
      SELECT l.*, u.name as user_name 
      FROM Logs l 
      LEFT JOIN Users u ON l.by_user = u.id
      ORDER BY l.created_at DESC
      LIMIT 200
    `);
    
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Error fetching logs' });
  }
});

// Get old items (older than 1 year) for admin
app.get('/api/admin/old-items', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const cutoffDate = req.query.date || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get items older than the cutoff date that are still unclaimed
    const [items] = await pool.query(`
      SELECT * FROM Items 
      WHERE status = 'found' 
      AND is_approved = 1 
      AND date <= ? 
      AND is_deleted = 0
      AND id NOT IN (SELECT item_id FROM Claims WHERE status = 'approved')
    `, [cutoffDate]);
    
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching old items:', error);
    res.status(500).json({ message: 'Error fetching old items' });
  }
});

// Block user (admin only)
app.put('/api/admin/users/:id/block', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const userId = req.params.id;
    const reason = req.body.reason || 'Policy violation';
    
    // Check if trying to block an admin
    const [userCheck] = await pool.query('SELECT role, name, email FROM Users WHERE id = ?', [userId]);
    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (userCheck[0].role === 'admin') {
      return res.status(403).json({ message: 'Cannot block an admin user' });
    }
    
    // Block the user
    await pool.query('UPDATE Users SET is_deleted = 1, ban_reason = ? WHERE id = ?', [reason, userId]);
    
    // Log the action
    await logSystemAction(`User ${userId} blocked by admin`, { userId, reason }, req.user.id);
    
    // Send email notification to the user
    try {
      const user = userCheck[0];
      await emailService.sendAccountBlockedNotification(
        user.email,
        user.name,
        reason
      );
      console.log(`Account blocked notification email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Error sending account blocked email:', emailError);
      // Continue anyway, don't fail the block operation because of email issues
    }
    
    res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'Error blocking user' });
  }
});

// Unblock user (admin only)
app.put('/api/admin/users/:id/unblock', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const userId = req.params.id;
    
    // Check if user exists and is banned
    const [userCheck] = await pool.query(
      'SELECT * FROM Users WHERE id = ? AND is_deleted = TRUE',
      [userId]
    );
    
    if (userCheck.length === 0) {
      console.log(`User with ID ${userId} not found or not banned`);
      return res.status(404).json({ message: 'User not found or not banned' });
    }
    
    const user = userCheck[0];
    console.log(`Found banned user: ${user.name} (${user.email})`);
    
    // Unblock the user
    await pool.query('UPDATE Users SET is_deleted = 0, ban_reason = NULL WHERE id = ?', [userId]);
    
    // Log the action
    await logSystemAction(`User ${user.name} (ID: ${userId}) unblocked by admin`, { userId }, req.user.id);
    
    // Send email notification to the unbanned user
    try {
      console.log('\n==== SENDING UNBAN EMAIL NOTIFICATION ====');
      console.log('User email:', user.email);
      console.log('User name:', user.name);
      
      const emailService = require('./server-email-nodemailer');
      const emailResult = await emailService.sendAccountUnblockedNotification(user.email, user.name);
      
      if (emailResult.success) {
        console.log('Unban notification email sent successfully!');
        console.log('Message ID:', emailResult.messageId);
      } else {
        console.error('Failed to send unban notification email:', emailResult.error);
      }
      console.log('==========================================\n');
    } catch (emailError) {
      console.error('Failed to send unban notification email:', emailError);
      // Continue with the unban process even if email fails
    }
    
    res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ message: 'Error unblocking user' });
  }
});

// Mark item for donation (admin only)
app.put('/api/admin/items/:id/mark-donation', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const itemId = req.params.id;
    
    // Mark the item for donation by adding a system note
    await pool.query(`
      INSERT INTO Notifications (message, type, related_item_id, user_id)
      VALUES (?, 'system', ?, ?)
    `, [`Item ${itemId} marked for donation due to being unclaimed for over 1 year`, itemId, req.user.id]);
    
    // Log the action
    await logSystemAction(`Item ${itemId} marked for donation`, { itemId }, req.user.id);
    
    res.status(200).json({ message: 'Item marked for donation successfully' });
  } catch (error) {
    console.error('Error marking item for donation:', error);
    res.status(500).json({ message: 'Error marking item for donation' });
  }
});

// Debug endpoint to check items table
app.get('/api/debug/items', async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM Items');
    res.json({
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Error fetching items for debug:', error);
    res.status(500).json({ message: 'Error fetching items for debug' });
  }
});

// Debug endpoint to check user-specific items
app.get('/api/debug/user-items/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const [lostItems] = await pool.query(
      'SELECT * FROM Items WHERE user_id = ? AND status = "lost" AND is_deleted = FALSE',
      [userId]
    );
    
    const [requestedItems] = await pool.query(
      'SELECT * FROM Items WHERE claimed_by = ? AND status = "requested" AND is_deleted = FALSE',
      [userId]
    );
    
    const [returnedItems] = await pool.query(
      'SELECT * FROM Items WHERE (user_id = ? OR claimed_by = ?) AND status = "returned" AND is_deleted = FALSE',
      [userId, userId]
    );
    
    res.json({
      userId,
      lostItems: {
        count: lostItems.length,
        items: lostItems
      },
      requestedItems: {
        count: requestedItems.length,
        items: requestedItems
      },
      returnedItems: {
        count: returnedItems.length,
        items: returnedItems
      }
    });
  } catch (error) {
    console.error('Error fetching user-specific items for debug:', error);
    res.status(500).json({ message: 'Error fetching user-specific items for debug' });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', port: PORT });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeDatabase();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const newPort = PORT + 1;
    console.error(`Port ${PORT} is already in use, trying ${newPort}`);
    server.listen(newPort, () => {
      console.log(`Server running on alternate port ${newPort}`);
      console.log(`Please update your frontend to use http://localhost:${newPort}`);
      initializeDatabase();
    });
  } else {
    console.error('Server error:', err);
  }
});

// Get all users (security staff only)
app.get('/api/security/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Get all users
    const [users] = await pool.query(
      'SELECT id, name, email, role, admission_number, faculty_school, year_of_study, phone_number, is_deleted, created_at FROM Users WHERE is_deleted = FALSE'
    );

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Revert item status (security staff only)
app.put('/api/security/items/:itemId/revert-status', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    const { status } = req.body;
    
    console.log(`Attempting to revert item ${itemId} status to: ${status}`);
    console.log('Request body:', req.body);

    // Validate status
    const validStatuses = ['lost', 'found', 'claimed', 'returned'];
    if (!validStatuses.includes(status)) {
      console.log(`Invalid status provided: ${status}`);
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Check if item exists
    const [itemCheck] = await pool.query(
      'SELECT * FROM Items WHERE id = ?',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      console.log(`Item with ID ${itemId} not found`);
      return res.status(404).json({ message: 'Item not found' });
    }
    
    console.log(`Item found: ${JSON.stringify(itemCheck[0])}`);

    // Update item status
    try {
      await pool.query(
        'UPDATE Items SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, itemId]
      );
      console.log(`Successfully updated item ${itemId} status to ${status}`);
    } catch (updateError) {
      console.error('Error updating item status:', updateError);
      return res.status(500).json({ message: 'Error updating item status', error: updateError.message });
    }

    // Get item details for notification
    try {
      const [items] = await pool.query(
        'SELECT user_id, title FROM Items WHERE id = ?',
        [itemId]
      );

      if (items.length > 0) {
        const item = items[0];
        console.log(`Creating notification for user ${item.user_id}`);
        
        // Create notification for item owner - using 'system' type which is valid in the ENUM
        try {
          await pool.query(
            'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
            [
              item.user_id,
              `Your item "${item.title}" status has been changed to ${status}`,
              'system', // Using a valid ENUM value from the Notifications table
              itemId
            ]
          );
          console.log('Notification created successfully');
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Continue even if notification creation fails
        }
      }
    } catch (itemError) {
      console.error('Error fetching item details for notification:', itemError);
      // Continue even if notification creation fails
    }

    res.json({ message: `Item status successfully changed to ${status}` });
  } catch (error) {
    console.error('Error reverting item status:', error);
    res.status(500).json({ message: 'Error reverting item status', error: error.message });
  }
});

// Ban a user (security staff only)
app.put('/api/security/users/:userId/ban', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { userId } = req.params;
    const reason = req.body.reason || 'No reason provided';
    
    console.log(`Attempting to ban user ${userId} with reason: ${reason}`);

    // Check if user exists
    const [userCheck] = await pool.query(
      'SELECT * FROM Users WHERE id = ? AND is_deleted = FALSE',
      [userId]
    );
    
    if (userCheck.length === 0) {
      console.log(`User with ID ${userId} not found or already banned`);
      return res.status(404).json({ message: 'User not found or already banned' });
    }
    
    const user = userCheck[0];
    console.log(`Found user: ${user.name} (${user.email})`);
    
    // Check if trying to ban an admin or security user
    if (user.role === 'admin' || user.role === 'security') {
      console.log(`Cannot ban user with role ${user.role}`);
      return res.status(400).json({ message: `Cannot ban user with role '${user.role}'` });
    }

    // Soft delete the user (set is_deleted to TRUE)
    await pool.query(
      'UPDATE Users SET is_deleted = TRUE, ban_reason = ? WHERE id = ?',
      [reason, userId]
    );
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`User ${user.name} (ID: ${userId}) banned: ${reason}`, req.user.id]
    );
    
    // Create notification for the banned user
    const { createNotification } = require('./services/notificationService');
    await createNotification(
      userId,
      `Your account has been suspended. Reason: ${reason}`,
      '/support'
    );

    // Send email notification
    try {
      console.log('\n==== SENDING BAN EMAIL NOTIFICATION ====');
      console.log('User email:', user.email);
      console.log('User name:', user.name);
      console.log('Ban reason:', reason);
      
      const emailService = require('./server-email-nodemailer');
      const emailResult = await emailService.sendAccountSuspensionNotification(user.email, user.name, reason);
      
      if (emailResult.success) {
        console.log('Ban notification email sent successfully!');
        console.log('Message ID:', emailResult.messageId);
      } else {
        console.error('Failed to send ban notification email:', emailResult.error);
      }
      console.log('==========================================\n');
    } catch (emailError) {
      console.error('Failed to send ban notification email:', emailError);
      // Continue with the ban process even if email fails
    }
    
    res.json({ message: `User ${user.name} banned successfully` });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Error banning user' });
  }
});

// Admin API endpoints
// Get all users (including banned users) - admin only
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('User with role', req.user.role, 'attempted to access admin users endpoint');
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    console.log('Admin users endpoint accessed by user:', req.user.id, req.user.name);

    // Get all users including soft-deleted ones
    try {
      const [users] = await pool.query(
        'SELECT id, name, email, role, admission_number, faculty_school, year_of_study, phone_number, is_deleted, created_at FROM Users'
      );
      console.log('Users query successful, found', users.length, 'users');
      res.json(users);
    } catch (dbError) {
      console.error('Database error fetching users:', dbError);
      res.status(500).json({ message: 'Database error fetching users', error: dbError.message });
    }
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Error fetching all users', error: error.message });
  }
});

// Get all items (including deleted items) - admin only
app.get('/api/admin/items', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Get all items including soft-deleted ones
    const [items] = await pool.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email 
       FROM Items i 
       LEFT JOIN Users u ON i.user_id = u.id`
    );

    res.json(items);
  } catch (error) {
    console.error('Error fetching all items:', error);
    res.status(500).json({ message: 'Error fetching all items' });
  }
});

// Get old items (older than 1 year) - admin only
app.get('/api/admin/old-items', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    console.log('Old items endpoint accessed by admin:', req.user.id, req.user.name);

    // Calculate date 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    
    console.log('Fetching items older than:', oneYearAgoStr);
    
    // Get items older than 1 year that are not donated
    const [items] = await pool.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email 
       FROM Items i 
       LEFT JOIN Users u ON i.user_id = u.id
       WHERE (i.created_at < ? OR i.date < ?)
       AND i.is_donated = FALSE
       AND i.is_deleted = FALSE`,
      [oneYearAgoStr, oneYearAgoStr]
    );
    
    console.log(`Found ${items.length} old items eligible for donation`);
    res.json(items);
  } catch (error) {
    console.error('Error fetching old items:', error);
    res.status(500).json({ message: 'Error fetching old items' });
  }
});

// Donate item endpoint (admin only)
app.patch('/api/items/:id/donate', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access: Admin permission required' });
    }

    const itemId = req.params.id;
    
    // Check if item exists
    const [itemCheck] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = FALSE',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Mark item as donated
    await pool.query(
      'UPDATE Items SET is_donated = TRUE WHERE id = ?',
      [itemId]
    );
    
    // Log the donation action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Item ID ${itemId} marked as donated`, req.user.id]
    );
    
    // Create system log
    await logSystemAction(`Item ID ${itemId} marked as donated by admin`, { itemId }, req.user.id);
    
    res.json({ 
      message: 'Item successfully marked as donated',
      itemId
    });
  } catch (error) {
    console.error('Error marking item as donated:', error);
    res.status(500).json({ message: 'Error marking item as donated' });
  }
});

// Donate item endpoint (admin only) - simplified version
app.post('/api/items/:id/donate', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access: Admin permission required' });
    }

    const itemId = req.params.id;
    console.log(`Processing donation request for item ${itemId} by user ${req.user.id}`);
    
    // Check if item exists
    const [itemCheck] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = FALSE',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      console.log(`Item ${itemId} not found or deleted`);
      return res.status(404).json({ message: 'Item not found' });
    }
    
    console.log(`Item found: ${JSON.stringify(itemCheck[0])}`);
    
    // Mark item as donated
    await pool.query(
      'UPDATE Items SET is_donated = TRUE WHERE id = ?',
      [itemId]
    );
    
    console.log(`Item ${itemId} marked as donated successfully`);
    
    // Log the donation action - with details
    try {
      await pool.query(
        'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
        [`Item ID ${itemId} marked as donated`, req.user.id]
      );
      console.log(`Donation action logged for item ${itemId}`);
    } catch (logError) {
      console.error('Error logging donation action:', logError);
      // Continue processing even if logging fails
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Item successfully marked as donated',
      itemId
    });
  } catch (error) {
    console.error('Error marking item as donated:', error);
    res.status(500).json({ message: 'Error marking item as donated', error: error.message });
  }
});

// Get system logs - admin only
app.get('/api/admin/logs', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Get system logs with user information
    const [logs] = await pool.query(
      `SELECT l.*, u.name as user_name, u.email as user_email 
       FROM Logs l 
       LEFT JOIN Users u ON l.by_user = u.id 
       ORDER BY l.created_at DESC 
       LIMIT 500`
    );

    res.json(logs);
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ message: 'Error fetching system logs' });
  }
});

// Get admin dashboard statistics - admin only
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    console.log('Admin stats endpoint accessed by user:', req.user.id, req.user.name);

    // Get count of all users
    const [userCount] = await pool.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN is_deleted = TRUE THEN 1 ELSE 0 END) as banned FROM Users'
    );

    // Get counts of items by status
    const [itemStats] = await pool.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost,
         SUM(CASE WHEN status = 'found' THEN 1 ELSE 0 END) as found,
         SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed,
         SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned,
         SUM(CASE WHEN status = 'requested' THEN 1 ELSE 0 END) as requested
       FROM Items WHERE is_deleted = FALSE`
    );

    // Get recent activity from logs
    const [recentActivity] = await pool.query(
      `SELECT l.*, u.name as user_name 
       FROM Logs l 
       LEFT JOIN Users u ON l.by_user = u.id 
       ORDER BY l.created_at DESC 
       LIMIT 10`
    );

    // Get user registration counts by month (last 6 months)
    const [userRegistrations] = await pool.query(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m') as month,
         COUNT(*) as count
       FROM Users
       WHERE created_at > DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month`
    );

    console.log('Admin stats generated successfully');
    
    res.json({
      users: userCount[0],
      items: itemStats[0],
      recentActivity,
      userRegistrations
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({ message: 'Error fetching admin statistics' });
  }
});

// Get user activity - admin only
app.get('/api/admin/user-activity', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { userId, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT ua.*, u.name as user_name, u.email as user_email
      FROM UserActivity ua
      LEFT JOIN Users u ON ua.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Filter by user if specified
    if (userId) {
      query += ' AND ua.user_id = ?';
      queryParams.push(userId);
    }
    
    // Add ordering and pagination
    query += ' ORDER BY ua.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [activities] = await pool.query(query, queryParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM UserActivity
      WHERE ${userId ? 'user_id = ?' : '1=1'}
    `;
    
    const countParams = userId ? [userId] : [];
    const [countResult] = await pool.query(countQuery, countParams);
    
    res.json({
      activities,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ message: 'Error fetching user activity' });
  }
});

// Unban a user - admin only
app.put('/api/admin/users/:userId/unban', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { userId } = req.params;
    
    console.log(`Attempting to unban user ${userId}`);

    // Check if user exists and is banned
    const [userCheck] = await pool.query(
      'SELECT * FROM Users WHERE id = ? AND is_deleted = TRUE',
      [userId]
    );
    
    if (userCheck.length === 0) {
      console.log(`User with ID ${userId} not found or not banned`);
      return res.status(404).json({ message: 'User not found or not banned' });
    }
    
    const user = userCheck[0];
    console.log(`Found banned user: ${user.name} (${user.email})`);
    
    // Unban the user (set is_deleted to FALSE)
    await pool.query(
      'UPDATE Users SET is_deleted = FALSE WHERE id = ?',
      [userId]
    );
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`User ${user.name} (ID: ${userId}) unbanned`, req.user.id]
    );

    // Send email notification to the unbanned user
    try {
      console.log('\n==== SENDING UNBAN EMAIL NOTIFICATION ====');
      console.log('User email:', user.email);
      console.log('User name:', user.name);
      
      const emailService = require('./server-email-nodemailer');
      const emailResult = await emailService.sendAccountUnblockedNotification(user.email, user.name);
      
      if (emailResult.success) {
        console.log('Unban notification email sent successfully!');
        console.log('Message ID:', emailResult.messageId);
      } else {
        console.error('Failed to send unban notification email:', emailResult.error);
      }
      console.log('==========================================\n');
    } catch (emailError) {
      console.error('Failed to send unban notification email:', emailError);
      // Continue with the unban process even if email fails
    }

    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ message: 'Error unbanning user', error: error.message });
  }
});

// Restore a deleted item - admin only
app.put('/api/admin/items/:itemId/restore', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    
    console.log(`Attempting to restore item ${itemId}`);

    // Check if item exists and is soft-deleted
    const [itemCheck] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = TRUE',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      console.log(`Item with ID ${itemId} not found or not deleted`);
      return res.status(404).json({ message: 'Item not found or not deleted' });
    }
    
    const item = itemCheck[0];
    console.log(`Found deleted item: ${item.title}`);
    
    // Restore the item (set is_deleted to FALSE)
    await pool.query(
      'UPDATE Items SET is_deleted = FALSE WHERE id = ?',
      [itemId]
    );
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Item "${item.title}" (ID: ${itemId}) restored`, req.user.id]
    );

    res.json({ message: 'Item restored successfully' });
  } catch (error) {
    console.error('Error restoring item:', error);
    res.status(500).json({ message: 'Error restoring item', error: error.message });
  }
});

// Get old items (older than the provided date) - admin only
app.get('/api/admin/old-items', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Get date parameter with fallback to 1 year ago
    const date = req.query.date || (() => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return oneYearAgo.toISOString().split('T')[0];
    })();
    
    console.log(`Fetching items older than ${date}`);

    // Get old items that are not donated
    const [items] = await pool.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email 
       FROM Items i 
       LEFT JOIN Users u ON i.user_id = u.id
       WHERE i.created_at < ? AND i.is_donated = FALSE
       ORDER BY i.created_at ASC`,
      [date]
    );

    res.json(items);
  } catch (error) {
    console.error('Error fetching old items:', error);
    res.status(500).json({ message: 'Error fetching old items' });
  }
});

// Get donated items - admin only
app.get('/api/admin/donated-items', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    console.log('Fetching donated items');

    // Get donated items
    const [items] = await pool.query(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email 
       FROM Items i 
       LEFT JOIN Users u ON i.user_id = u.id
       WHERE i.is_donated = TRUE
       ORDER BY i.updated_at DESC`
    );

    console.log(`Found ${items.length} donated items`);
    res.json(items);
  } catch (error) {
    console.error('Error fetching donated items:', error);
    res.status(500).json({ message: 'Error fetching donated items' });
  }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    console.log(`Admin login attempt for email: ${email}`);
    
    // Find user by email
    const [users] = await pool.query(
      'SELECT * FROM Users WHERE email = ? AND is_deleted = FALSE',
      [email]
    );
    
    if (users.length === 0) {
      console.log(`No user found with email: ${email}`);
      return res.status(401).json({ message: 'No account found with this email address' });
    }
    
    const user = users[0];
    
    // Check if user is an admin
    if (user.role !== 'admin') {
      console.log(`User ${email} is not an admin (role: ${user.role})`);
      return res.status(403).json({ message: 'Unauthorized. Admin access only.' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log(`Invalid password for admin user: ${email}`);
      return res.status(401).json({ message: 'Wrong password. Please try again' });
    }
    
    // Create token
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      }, 
      process.env.JWT_SECRET || 'your-secret-key', 
      { expiresIn: '24h' }
    );
    
    // Log the successful login
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Admin login: ${user.name}`, user.id]
    );
    
    // Return user info and token
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Soft delete an item - admin only
app.put('/api/admin/items/:itemId/soft-delete', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    const reason = req.body.reason || 'No reason provided';
    
    console.log(`Attempting to soft delete item ${itemId} with reason: ${reason}`);

    // Check if item exists and is not already deleted
    const [itemCheck] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = FALSE',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      console.log(`Item with ID ${itemId} not found or already deleted`);
      return res.status(404).json({ message: 'Item not found or already deleted' });
    }
    
    const item = itemCheck[0];
    console.log(`Found item: ${item.title}`);
    
    // Soft delete the item (set is_deleted to TRUE)
    await pool.query(
      'UPDATE Items SET is_deleted = TRUE WHERE id = ?',
      [itemId]
    );
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Item "${item.title}" (ID: ${itemId}) soft deleted: ${reason}`, req.user.id]
    );

    // Create notification for item owner if applicable and not banned
    if (item.user_id) {
      try {
        // Check if user is banned
        const [userStatus] = await pool.query(
          'SELECT is_deleted FROM Users WHERE id = ?',
          [item.user_id]
        );
        
        if (userStatus.length > 0 && !userStatus[0].is_deleted) {
          await pool.query(
            'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
            [
              item.user_id,
              `Your item "${item.title}" has been removed by an administrator: ${reason}`,
              'system',
              itemId
            ]
          );
          console.log('Notification created for item owner');
        } else {
          console.log('Skipping notification for item owner - user is banned');
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue even if notification creation fails
      }
    }

    res.json({ message: 'Item soft deleted successfully' });
  } catch (error) {
    console.error('Error soft deleting item:', error);
    res.status(500).json({ message: 'Error soft deleting item', error: error.message });
  }
});

// Soft delete an item - security staff
app.put('/api/security/items/:itemId/soft-delete', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    const reason = req.body.reason || 'No reason provided';
    
    console.log(`Attempting to soft delete item ${itemId} by security with reason: ${reason}`);

    // Check if item exists and is not already deleted
    const [itemCheck] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = FALSE',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      console.log(`Item with ID ${itemId} not found or already deleted`);
      return res.status(404).json({ message: 'Item not found or already deleted' });
    }
    
    const item = itemCheck[0];
    console.log(`Found item: ${item.title || item.name}`);
    
    // Soft delete the item (set is_deleted to TRUE)
    await pool.query(
      'UPDATE Items SET is_deleted = TRUE WHERE id = ?',
      [itemId]
    );
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Item "${item.title || item.name}" (ID: ${itemId}) soft deleted by security: ${reason}`, req.user.id]
    );

    // Create notification for item owner if applicable
    if (item.user_id) {
      try {
        await pool.query(
          'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
          [
            item.user_id,
            `Your item "${item.title || item.name}" has been removed by security staff: ${reason}`,
            'system',
            itemId
          ]
        );
        console.log('Notification created for item owner');
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue even if notification creation fails
      }
    }

    res.json({ message: 'Item soft deleted successfully' });
  } catch (error) {
    console.error('Error soft deleting item:', error);
    res.status(500).json({ message: 'Error soft deleting item', error: error.message });
  }
});

// Debug endpoint to check users table
app.get('/api/debug/users', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM Users');
    res.json({
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching users for debug:', error);
    res.status(500).json({ message: 'Error fetching users for debug' });
  }
});

// Debug endpoint to create an admin user if none exists
app.get('/api/debug/create-admin', async (req, res) => {
  try {
    // Check if admin user exists
    const [admins] = await pool.query('SELECT * FROM Users WHERE role = ?', ['admin']);
    
    if (admins.length > 0) {
      return res.json({
        message: 'Admin user already exists',
        admin: {
          id: admins[0].id,
          name: admins[0].name,
          email: admins[0].email,
          role: admins[0].role
        }
      });
    }
    
    // Create admin user if none exists
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    
    const [result] = await pool.query(
      'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Admin', 'admin@example.com', hashedPassword, 'admin']
    );
    
    res.json({
      message: 'Admin user created successfully',
      admin: {
        id: result.insertId,
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin'
      },
      note: 'Default password is admin123'
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

// Debug endpoint to create a security user if none exists
app.get('/api/debug/create-security', async (req, res) => {
  try {
    // Check if security user exists
    const [securityUsers] = await pool.query('SELECT * FROM Users WHERE role = ?', ['security']);
    
    if (securityUsers.length > 0) {
      return res.json({
        message: 'Security user already exists',
        security: {
          id: securityUsers[0].id,
          name: securityUsers[0].name,
          email: securityUsers[0].email,
          role: securityUsers[0].role
        }
      });
    }
    
    // Create security user if none exists
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('Security@123', saltRounds);
    
    const [result] = await pool.query(
      'INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Security Officer', 'security@example.com', hashedPassword, 'security']
    );
    
    res.json({
      message: 'Security user created successfully',
      security: {
        id: result.insertId,
        name: 'Security Officer',
        email: 'security@example.com',
        role: 'security'
      },
      note: 'Default password is Security@123'
    });
  } catch (error) {
    console.error('Error creating security user:', error);
    res.status(500).json({ message: 'Error creating security user' });
  }
});

// Debug endpoint to set a user's role to security
app.get('/api/debug/set-security/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Update user role to security
    const [result] = await pool.query(
      'UPDATE Users SET role = ? WHERE id = ?',
      ['security', userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get updated user info
    const [users] = await pool.query(
      'SELECT id, name, email, role FROM Users WHERE id = ?',
      [userId]
    );
    
    res.json({
      message: 'User role updated to security successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Security API - Get dashboard statistics
app.get('/api/security/statistics', authenticateToken, async (req, res) => {
  // Check if user has security role
  if (req.user.role !== 'security' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Insufficient permissions' });
  }
  
  try {
    // Get counts for various item statuses
    const [lostItemsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM Items WHERE status = "lost" AND is_deleted = 0'
    );
    
    const [foundItemsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM Items WHERE status = "found" AND is_deleted = 0'
    );
    
    const [requestedItemsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM Items WHERE status = "requested" AND is_deleted = 0'
    );
    
    const [receivedItemsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM Items WHERE status = "received" AND is_deleted = 0'
    );
    
    const [returnedItemsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM Items WHERE status = "returned" AND is_deleted = 0'
    );
    
    const [pendingItemsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM Items WHERE is_approved = 0 AND is_deleted = 0'
    );
    
    const [pendingClaimsCount] = await pool.query(
      'SELECT COUNT(*) as count FROM Claims WHERE status = "pending" AND is_deleted = 0'
    );
    
    const [usersCount] = await pool.query(
      'SELECT COUNT(*) as count FROM Users WHERE is_deleted = 0'
    );
    
    // Get monthly statistics for the last 6 months
    const [monthlyStats] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'found' THEN 1 ELSE 0 END) as found,
        SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN status = 'requested' THEN 1 ELSE 0 END) as requested,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned
      FROM Items
      WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `);
    
    // Get category distribution
    const [categoryDistribution] = await pool.query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM Items
      WHERE is_deleted = 0
      GROUP BY category
      ORDER BY count DESC
    `);
    
    // Return all statistics
    res.status(200).json({
      itemCounts: {
        lost: lostItemsCount[0].count,
        found: foundItemsCount[0].count,
        requested: requestedItemsCount[0].count,
        received: receivedItemsCount[0].count,
        returned: returnedItemsCount[0].count,
        pending: pendingItemsCount[0].count,
      },
      claimCounts: {
        pending: pendingClaimsCount[0].count
      },
      userCounts: {
        total: usersCount[0].count
      },
      monthlyStats,
      categoryDistribution
    });
  } catch (error) {
    console.error('Error fetching security statistics:', error);
    res.status(500).json({ message: 'Error fetching security statistics' });
  }
});

// Security API - Get security activity logs
app.get('/api/security/activity-logs', authenticateToken, async (req, res) => {
  // Check if user has security role
  if (req.user.role !== 'security' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Insufficient permissions' });
  }
  
  try {
    // Get logs related to security activities
    const [logs] = await pool.query(`
      SELECT l.*, u.name as user_name
      FROM Logs l
      LEFT JOIN Users u ON l.by_user = u.id
      WHERE l.action LIKE '%security%' OR l.action LIKE '%approve%' OR l.action LIKE '%reject%'
      ORDER BY l.created_at DESC
      LIMIT 100
    `);
    
    res.status(200).json({ logs });
  } catch (error) {
    console.error('Error fetching security activity logs:', error);
    res.status(500).json({ message: 'Error fetching security activity logs' });
  }
});

// Security API - Advanced item search
app.get('/api/security/search-items', authenticateToken, async (req, res) => {
  // Check if user has security role
  if (req.user.role !== 'security' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Insufficient permissions' });
  }
  
  try {
    const { query, status, category, dateFrom, dateTo } = req.query;
    
    // Build the SQL query with filters
    let sql = `
      SELECT i.*, u.name as reporter_name
      FROM Items i
      LEFT JOIN Users u ON i.user_id = u.id
      WHERE i.is_deleted = 0
    `;
    
    const params = [];
    
    // Add search query filter
    if (query) {
      sql += ` AND (i.title LIKE ? OR i.description LIKE ? OR i.location LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    
    // Add status filter
    if (status) {
      sql += ` AND i.status = ?`;
      params.push(status);
    }
    
    // Add category filter
    if (category) {
      sql += ` AND i.category = ?`;
      params.push(category);
    }
    
    // Add date range filter
    if (dateFrom) {
      sql += ` AND i.date >= ?`;
      params.push(dateFrom);
    }
    
    if (dateTo) {
      sql += ` AND i.date <= ?`;
      params.push(dateTo);
    }
    
    // Add ordering
    sql += ` ORDER BY i.created_at DESC`;
    
    // Execute the query
    const [items] = await pool.query(sql, params);
    
    res.status(200).json({ items });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ message: 'Error searching items' });
  }
});

// Generic delete endpoint for items
app.put('/api/items/:itemId/delete', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    const reason = req.body.reason || 'No reason provided';
    
    console.log(`Generic delete endpoint: Attempting to delete item ${itemId} with reason: ${reason}`);

    // Check if item exists and is not already deleted
    const [itemCheck] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = FALSE',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      console.log(`Item with ID ${itemId} not found or already deleted`);
      return res.status(404).json({ message: 'Item not found or already deleted' });
    }
    
    const item = itemCheck[0];
    console.log(`Found item: ${item.title || item.name || 'Unknown'}`);
    
    // Soft delete the item (set is_deleted to TRUE)
    await pool.query(
      'UPDATE Items SET is_deleted = TRUE WHERE id = ?',
      [itemId]
    );
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`Item "${item.title || item.name || 'Unknown'}" (ID: ${itemId}) deleted: ${reason}`, req.user.id]
    );

    // Create notification for item owner if applicable
    if (item.user_id) {
      try {
        await pool.query(
          'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
          [
            item.user_id,
            `Your item "${item.title || item.name || 'Unknown'}" has been removed: ${reason}`,
            'system',
            itemId
          ]
        );
        console.log('Notification created for item owner');
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue even if notification creation fails
      }
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
});

// Security soft-delete item endpoint
app.put('/api/security/items/:itemId/soft-delete', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      console.log(`Unauthorized access attempt by ${req.user.role} user to soft-delete endpoint`);
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;
    const reason = req.body.reason || 'No reason provided';
    
    console.log(`Security soft-delete: Attempting to delete item ${itemId} with reason: ${reason}`);

    // Check if item exists and is not already deleted
    const [itemCheck] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = FALSE',
      [itemId]
    );
    
    if (itemCheck.length === 0) {
      console.log(`Item with ID ${itemId} not found or already deleted`);
      return res.status(404).json({ message: 'Item not found or already deleted' });
    }

    // Perform soft delete
    await pool.query(
      'UPDATE Items SET is_deleted = TRUE, deleted_reason = ?, deleted_by = ?, deleted_at = NOW() WHERE id = ?',
      [reason, req.user.id, itemId]
    );

    console.log(`Item ${itemId} soft-deleted successfully by user ${req.user.id}`);
    
    // Log the action
    await logSystemAction(`Item ${itemId} soft-deleted`, { itemId, reason }, req.user.id);

    return res.status(200).json({ 
      message: 'Item soft-deleted successfully',
      itemId
    });
  } catch (error) {
    console.error('Error soft-deleting item:', error);
    return res.status(500).json({ 
      message: 'Error soft-deleting item',
      error: error.message 
    });
  }
});

// Matching route
app.post('/match-items', async (req, res) => {
  try {
    const { item } = req.body;
    
    if (!item || !item.id || !item.status) {
      return res.status(400).json({ message: 'Invalid item data provided' });
    }
    
    console.log(`Manual match request for ${item.status} item ${item.id}`);
    
    // Run matching algorithm
    const matches = await matchItems(item);
    
    return res.status(200).json({
      message: `Found ${matches.length} potential matches`,
      matches: matches.map(match => ({
        itemId: match.item.id,
        title: match.item.title,
        score: match.score,
        category: match.item.category,
        location: match.item.location
      }))
    });
  } catch (error) {
    console.error('Error in match-items endpoint:', error);
    return res.status(500).json({ message: 'Error matching items', error: error.message });
  }
});

// Add this after the /match-items route

// Get matches for a specific item
app.get('/api/items/:itemId/matches', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Get item details
    const [items] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = FALSE',
      [itemId]
    );
    
    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const item = items[0];
    
    // Get matches based on item status
    let matches = [];
    if (item.status === 'lost') {
      // Get matches where this is the lost item
      const [matchResults] = await pool.query(`
        SELECT m.*, 
               i.title as found_item_title, 
               i.category as found_item_category,
               i.location as found_item_location,
               i.date as found_item_date,
               i.image as found_item_image
        FROM ItemMatches m
        JOIN Items i ON m.found_item_id = i.id
        WHERE m.lost_item_id = ?
        ORDER BY m.match_score DESC
      `, [itemId]);
      
      matches = matchResults.map(match => ({
        id: match.id,
        matchScore: match.match_score,
        status: match.status,
        createdAt: match.created_at,
        matchedItem: {
          id: match.found_item_id,
          title: match.found_item_title,
          category: match.found_item_category,
          location: match.found_item_location,
          date: match.found_item_date,
          image: match.found_item_image
        }
      }));
    } else if (item.status === 'found') {
      // Get matches where this is the found item
      const [matchResults] = await pool.query(`
        SELECT m.*, 
               i.title as lost_item_title, 
               i.category as lost_item_category,
               i.location as lost_item_location,
               i.date as lost_item_date
        FROM ItemMatches m
        JOIN Items i ON m.lost_item_id = i.id
        WHERE m.found_item_id = ?
        ORDER BY m.match_score DESC
      `, [itemId]);
      
      matches = matchResults.map(match => ({
        id: match.id,
        matchScore: match.match_score,
        status: match.status,
        createdAt: match.created_at,
        matchedItem: {
          id: match.lost_item_id,
          title: match.lost_item_title,
          category: match.lost_item_category,
          location: match.lost_item_location,
          date: match.lost_item_date
        }
      }));
    }
    
    return res.json({ 
      itemId: parseInt(itemId),
      matches 
    });
  } catch (error) {
    console.error('Error fetching item matches:', error);
    return res.status(500).json({ message: 'Error fetching matches', error: error.message });
  }
});

// Add this after the /api/items/:itemId/matches route

// Test route for match testing
app.post('/test-match', async (req, res) => {
  try {
    console.log('[TEST-MATCH] Received test match request:', req.body);
    const { item } = req.body;
    const { sendMail } = req.query;
    
    if (!item || !item.status) {
      return res.status(400).json({ 
        message: 'Invalid test item data. Must include status (lost/found).' 
      });
    }
    
    // Add test identifier to item
    const testItem = {
      ...item,
      id: item.id || 999999, // Use provided ID or default test ID
      is_test: true
    };
    
    console.log(`[TEST-MATCH] Testing ${testItem.status} item: "${testItem.title}"`);
    console.log('[TEST-MATCH] Location:', testItem.location);
    console.log('[TEST-MATCH] Category:', testItem.category);
    console.log('[TEST-MATCH] Description:', testItem.description);
    
    // Get the opposite status items from database for testing
    const oppositeStatus = testItem.status === 'lost' ? 'found' : 'lost';
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    console.log(`[TEST-MATCH] Fetching ${oppositeStatus} items from past 5 days`);
    
    const [items] = await pool.query(`
      SELECT i.*, u.name, u.email 
      FROM Items i
      JOIN Users u ON i.user_id = u.id
      WHERE i.status = ?
      AND i.is_approved = TRUE
      AND i.is_deleted = FALSE
      AND i.created_at >= ?
    `, [oppositeStatus, fiveDaysAgo.toISOString().slice(0, 10)]);
    
    console.log(`[TEST-MATCH] Found ${items.length} ${oppositeStatus} items to test against`);
    
    // Match threshold
    const MATCH_THRESHOLD = 0.7; // 70%
    
    // Import the matchItems function
    const { calculateMatchScore } = require('./services/matching.service');
    
    // Calculate match scores for testing
    const matches = [];
    let emailResults = [];
    
    for (const dbItem of items) {
      // Calculate match score
      const score = testItem.status === 'lost'
        ? calculateMatchScore(testItem, dbItem)
        : calculateMatchScore(dbItem, testItem);
      
      console.log(`[TEST-MATCH] Score for "${dbItem.title}": ${score} (${Math.round(score * 100)}%)`);
      
      // If score is above threshold, add to matches
      if (score >= MATCH_THRESHOLD) {
        console.log(`[TEST-MATCH] Match found with score ${score} between test ${testItem.status} item and ${oppositeStatus} item ${dbItem.id}`);
        
        // If sendMail is true, send test email
        if (sendMail === 'true' && dbItem.email) {
          try {
            console.log(`[TEST-MATCH] Sending test email to ${dbItem.email}`);
            
            // Import the email sending function
            const { sendMatchNotificationEmail } = require('./services/matching.service');
            
            // Send test email
            const lostItem = testItem.status === 'lost' ? testItem : dbItem;
            const foundItem = testItem.status === 'lost' ? dbItem : testItem;
            
            const emailResult = await sendMatchNotificationEmail(
              {
                name: dbItem.name,
                email: dbItem.email
              },
              lostItem,
              foundItem,
              score
            );
            
            console.log(`[TEST-MATCH] Email result:`, emailResult);
            emailResults.push({
              to: dbItem.email,
              result: emailResult,
              success: emailResult.success
            });
          } catch (emailError) {
            console.error('[TEST-MATCH] Error sending test email:', emailError);
            emailResults.push({
              to: dbItem.email,
              error: emailError.message,
              success: false
            });
          }
        }
        
        matches.push({
          item: dbItem,
          score
        });
      }
    }
    
    console.log(`[TEST-MATCH] Found ${matches.length} potential matches above ${MATCH_THRESHOLD * 100}% threshold`);
    
    return res.status(200).json({
      message: `Found ${matches.length} potential matches`,
      testItem: testItem,
      totalItemsChecked: items.length,
      threshold: MATCH_THRESHOLD,
      matches: matches.map(match => ({
        id: match.item.id,
        title: match.item.title,
        category: match.item.category,
        location: match.item.location,
        description: match.item.description?.substring(0, 100) + (match.item.description?.length > 100 ? '...' : ''),
        score: match.score,
        scorePercentage: `${Math.round(match.score * 100)}%`,
        userName: match.item.name,
        userEmail: sendMail === 'true' ? match.item.email : '[Email hidden]'
      })),
      emailResults: sendMail === 'true' ? emailResults : 'Email sending disabled'
    });
  } catch (error) {
    console.error('[TEST-MATCH] Error in test-match endpoint:', error);
    return res.status(500).json({ 
      message: 'Error testing match functionality', 
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});



// Unban a user (admin or security)
app.put('/api/security/users/:userId/unban', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or security
    if (req.user.role !== 'admin' && req.user.role !== 'security') {
      return res.status(403).json({ message: 'Unauthorized access: Only admins or security can unban users' });
    }

    const { userId } = req.params;
    
    console.log(`Attempting to unban user ${userId}`);

    // Check if user exists and is banned
    const [userCheck] = await pool.query(
      'SELECT * FROM Users WHERE id = ? AND is_deleted = TRUE',
      [userId]
    );
    
    if (userCheck.length === 0) {
      console.log(`User with ID ${userId} not found or not banned`);
      return res.status(404).json({ message: 'User not found or not banned' });
    }
    
    const user = userCheck[0];
    console.log(`Found banned user: ${user.name} (${user.email})`);
    
    // Unban the user (set is_deleted to FALSE)
    await pool.query(
      'UPDATE Users SET is_deleted = FALSE, ban_reason = NULL WHERE id = ?',
      [userId]
    );
    
    // Log the action
    await pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`User ${user.name} (ID: ${userId}) unbanned`, req.user.id]
    );

    // Send email notification to the unbanned user
    try {
      console.log('\n==== SENDING UNBAN EMAIL NOTIFICATION ====');
      console.log('User email:', user.email);
      console.log('User name:', user.name);
      
      const emailService = require('./server-email-nodemailer');
      const emailResult = await emailService.sendAccountUnblockedNotification(user.email, user.name);
      
      if (emailResult.success) {
        console.log('Unban notification email sent successfully!');
        console.log('Message ID:', emailResult.messageId);
      } else {
        console.error('Failed to send unban notification email:', emailResult.error);
      }
      console.log('==========================================\n');
    } catch (emailError) {
      console.error('Failed to send unban notification email:', emailError);
      // Continue with the unban process even if email fails
    }

    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ message: 'Error unbanning user', error: error.message });
  }
});

// Admin API endpoints
// ... existing code ...

// Test route to create a notification
app.post('/api/test/notification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, linkUrl } = req.body;
    
    // Create notification
    const notification = await createNotification(
      userId,
      message || "This is a test notification",
      linkUrl || "/dashboard"
    );
    
    if (notification) {
      res.json({ 
        success: true, 
        message: 'Test notification created successfully',
        notification
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create test notification' 
      });
    }
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating test notification',
      error: error.message
    });
  }
});

// API endpoint for requesting items (matches the path used in the frontend)
app.post('/api/items/:itemId/request', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;
    
    console.log(`API request endpoint called for item ${itemId} by user ${userId}`);
    
    // Check if item exists and is available
    const [items] = await pool.query(
      'SELECT * FROM Items WHERE id = ? AND is_deleted = 0',
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = items[0];
    
    // Only allow requesting items with 'found' status
    if (item.status !== 'found') {
      return res.status(400).json({ 
        message: `Item cannot be requested because its status is '${item.status}' not 'found'` 
      });
    }
    
    // Update item status to 'requested' with pending approval
    try {
      // Add request_status column if it doesn't exist
      try {
        await pool.query(`
          ALTER TABLE Items 
          ADD COLUMN IF NOT EXISTS request_status VARCHAR(20) DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS request_user_id INT DEFAULT NULL
        `);
      } catch (alterError) {
        console.error('Error altering Items table:', alterError);
        // Continue anyway, column might already exist
      }
      
      // Update with pending approval status
      await pool.query(
        'UPDATE Items SET status = "requested", request_status = "pending", request_user_id = ?, updated_at = NOW() WHERE id = ?',
        [userId, itemId]
      );
      console.log(`Successfully updated item ${itemId} to 'requested' status with pending approval`);
      
      // Get item details for better notification
      const [itemDetails] = await pool.query(
        'SELECT title FROM Items WHERE id = ?',
        [itemId]
      );
      
      const itemTitle = itemDetails.length > 0 ? itemDetails[0].title : `Item #${itemId}`;
      
      // Use the notifySecurityStaff function for more reliable notification
      const { notifySecurityStaff } = require('./services/notificationService');
      await notifySecurityStaff(
        `New item request for "${itemTitle}" needs your approval`,
        `/security-dashboard`
      );
      
      console.log('Security staff notifications created via notifySecurityStaff');
      
      // Return the updated item
      res.json({ 
        message: 'Item requested successfully. Your request is pending approval by security staff.',
        item: {
          ...item,
          status: 'requested',
          request_status: 'pending'
        }
      });
    } catch (statusUpdateError) {
      console.error('Error updating item status:', statusUpdateError);
      return res.status(500).json({ 
        message: 'Error updating item status', 
        error: statusUpdateError.message 
      });
    }
  } catch (error) {
    console.error('Error requesting item:', error);
    res.status(500).json({ message: 'Error requesting item', error: error.message });
  }
});

// Debug endpoint to test security notifications
app.post('/api/debug/notify-security', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'security') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const { message } = req.body;
    console.log('Sending test notification to security staff:', message);
    
    // Use the notifySecurityStaff function
    const { notifySecurityStaff } = require('./services/notificationService');
    const notifications = await notifySecurityStaff(
      message || 'This is a test security notification',
      '/security-dashboard'
    );
    
    res.json({ 
      success: true, 
      message: 'Test notification sent to security staff',
      notificationsCreated: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending test notification',
      error: error.message
    });
  }
});

// Debug endpoint to test notifications
app.post('/api/debug/notification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, linkUrl } = req.body;
    
    console.log('=== DEBUG NOTIFICATION TEST ===');
    console.log(`Creating test notification for user ${userId}`);
    console.log(`Message: ${message || 'Test notification'}`);
    console.log(`Link URL: ${linkUrl || '/dashboard'}`);
    
    // Create notification using the service
    const notification = await createNotification(
      userId,
      message || 'This is a test notification',
      linkUrl || '/dashboard'
    );
    
    if (notification) {
      console.log('✓ Test notification created successfully:', notification);
      res.json({ 
        success: true, 
        message: 'Test notification created successfully',
        notification 
      });
    } else {
      console.error('✗ Failed to create test notification');
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create test notification' 
      });
    }
    console.log('=== END DEBUG TEST ===');
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating test notification',
      error: error.message 
    });
  }
});

// Debug endpoint to test security notifications
app.post('/api/debug/security-notification', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'security') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    
    const { message, linkUrl } = req.body;
    
    console.log('=== DEBUG SECURITY NOTIFICATION TEST ===');
    console.log(`Message: ${message || 'Test security notification'}`);
    console.log(`Link URL: ${linkUrl || '/security-dashboard'}`);
    
    // Use the notifySecurityStaff function
    const notifications = await notifySecurityStaff(
      message || 'This is a test security notification',
      linkUrl || '/security-dashboard'
    );
    
    console.log(`Created ${notifications.length} security notifications`);
    
    res.json({ 
      success: true, 
      message: 'Test security notification sent',
      notifications 
    });
    console.log('=== END DEBUG SECURITY TEST ===');
  } catch (error) {
    console.error('Error sending test security notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending test security notification',
      error: error.message 
    });
  }
});