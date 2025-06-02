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
const multer = require('multer');
const { calculateMatchScore } = require('./server-utils');
const emailService = require('./server-email');
const fs = require('fs');

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

// Middleware
app.use(cors(config.serverConfig.corsOptions));
app.use(bodyParser.json());

// Ensure uploads directory is properly served with absolute path
app.use('/uploads', (req, res, next) => {
  console.log(`Uploads request: ${req.url}`);
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
    const [notifications] = await pool.query(
      `SELECT * FROM Notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

app.put('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await pool.query(
      'UPDATE Notifications SET status = ? WHERE id = ? AND user_id = ?',
      ['read', notificationId, req.user.id]
    );
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
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

// Get all items (public view - hide sensitive info)
app.get('/items', async (req, res) => {
  try {
    console.log('Fetching items from database for public view...');
    
    // First, check if we can connect to the database
    const connection = await pool.getConnection();
    console.log('Connected to database for items fetch');
    connection.release();
    
    try {
      // Try the original query with JOIN
      const [items] = await pool.query(`
        SELECT 
          i.id,
          i.title,
          i.category,
          i.description,
          i.status,
          i.image,
          i.created_at,
          i.is_approved,
          u.name as reporter_name
        FROM Items i
        JOIN Users u ON i.user_id = u.id
        WHERE i.is_deleted = FALSE 
        AND i.is_approved = TRUE
        AND (i.status = 'found' OR i.status = 'requested' OR i.status = 'received')
        ORDER BY i.created_at DESC
      `);
      
      console.log(`Found ${items.length} approved items for public view`);
      
      // Double check that all items are approved (belt and suspenders approach)
      const verifiedItems = items.filter(item => item.is_approved === 1 || item.is_approved === true);
      console.log(`After verification: ${verifiedItems.length} items confirmed as approved`);
      
      res.json(verifiedItems);
    } catch (joinError) {
      console.error('Error with JOIN query:', joinError);
      
      // If the JOIN fails, try a simpler query without the JOIN
      const [items] = await pool.query(`
        SELECT 
          id,
          title,
          category,
          description,
          status,
          image,
          created_at,
          is_approved,
          user_id
        FROM Items
        WHERE is_deleted = FALSE 
        AND is_approved = TRUE
        AND (status = 'found' OR status = 'requested' OR status = 'received')
        ORDER BY created_at DESC
      `);
      
      // Verify approval status again
      const verifiedItems = items.filter(item => item.is_approved === 1 || item.is_approved === true);
      console.log(`Found ${verifiedItems.length} approved items (fallback query)`);
      
      // Add a placeholder for reporter_name
      const itemsWithReporter = verifiedItems.map(item => ({
        ...item,
        reporter_name: 'Anonymous'
      }));
      
      res.json(itemsWithReporter);
    }
  } catch (error) {
    console.error('Error fetching items:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Error fetching items',
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
    const { title, category, subcategory, description, location, date, status, image } = req.body;
    
    // User ID from token
    const userId = req.user.id;
    console.log('User ID from token:', userId);
    
    if (!title) {
      console.error('Title is required but not provided');
      return res.status(400).json({ message: 'Title is required' });
    }

    console.log('Inserting lost item into database with JSON data');
    
    try {
      const [result] = await pool.query(`
        INSERT INTO Items 
          (title, category, subcategory, description, location, status, date, user_id, image) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [title, category, subcategory, description, location, status, date, userId, image || null]);

      console.log('Item inserted successfully with ID:', result.insertId);
      
      // Notify security staff about new lost item
      const message = `New lost item "${title}" has been reported.`;
      try {
        await notifySecurityStaff(message);
      } catch (notifyError) {
        console.error('Error notifying security staff:', notifyError);
        // Continue anyway
      }

      return res.status(201).json({ 
        message: 'Lost item submitted successfully', 
        itemId: result.insertId 
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
      const [result] = await pool.query(`
        INSERT INTO Items 
          (title, category, subcategory, description, location, status, date, user_id, image, is_approved) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
      `, [title, category, subcategory, description, location, status, date, userId, image || null]);

      console.log('Item inserted successfully with ID:', result.insertId);
      console.log('Item approval status set to FALSE - requires security approval');
      
      // Notify security staff about new found item
      const message = `New found item "${title}" has been reported.`;
      try {
        await notifySecurityStaff(message);
      } catch (notifyError) {
        console.error('Error notifying security staff:', notifyError);
        // Continue anyway
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
async function notifySecurityStaff(message) {
  try {
    // Get all security and admin users
    const [securityUsers] = await pool.query(
      'SELECT id FROM Users WHERE role IN ("security", "admin") AND is_deleted = FALSE'
    );

    // Create notifications for each security staff member
    for (const user of securityUsers) {
      await pool.query(
        'INSERT INTO Notifications (user_id, message, type) VALUES (?, ?, "item_report")',
        [user.id, message]
      );
    }
  } catch (error) {
    console.error('Error notifying security staff:', error);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

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
  // Only allow admins to access this endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin permission required' });
  }
  
  try {
    const [logs] = await pool.query(
      `SELECT l.*, u.name as user_name 
       FROM SystemLogs l 
       LEFT JOIN Users u ON l.user_id = u.id 
       ORDER BY l.created_at DESC 
       LIMIT 1000`
    );
    
    // Format the logs for better readability
    const formattedLogs = logs.map(log => ({
      ...log,
      created_at: new Date(log.created_at).toLocaleString(),
      details: log.details || 'N/A'
    }));
    
    res.json({ logs: formattedLogs });
  } catch (error) {
    console.error('Error fetching logs:', error);
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

// Helper function to create notifications
async function createNotification(userId, message, type = 'info') {
  try {
    await pool.query(
      'INSERT INTO Notifications (user_id, message, type) VALUES (?, ?, ?)',
      [userId, message, type]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Helper function to notify security staff
async function notifySecurityStaff(message, type = 'new_item') {
  try {
    // Get all security staff
    const [securityStaff] = await pool.query(
      'SELECT id FROM Users WHERE role = ? AND is_deleted = FALSE',
      ['security']
    );
    
    // Create notifications for each security staff member
    for (const staff of securityStaff) {
      await createNotification(staff.id, message, type);
    }
  } catch (error) {
    console.error('Error notifying security staff:', error);
  }
}

// Add item endpoint (add this where you handle item creation)
app.post('/api/items', authenticateToken, async (req, res) => {
  try {
    const { title, description, type, location } = req.body;
    
    // Insert item into database
    const [result] = await pool.query(
      'INSERT INTO Items (title, description, type, location, user_id) VALUES (?, ?, ?, ?, ?)',
      [title, description, type, location, req.user.id]
    );
    
    // Notify security staff
    const message = `New ${type} item "${title}" has been reported. Location: ${location}`;
    await notifySecurityStaff(message, 'new_item');
    
    // Log the action
    await logSystemAction(
      'New item added',
      `Item "${title}" (${type}) added by user ${req.user.id}`,
      req.user.id
    );
    
    res.status(201).json({ message: 'Item added successfully', itemId: result.insertId });
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
      await createNotification(item.reported_by, message, 'status_update');
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
        await pool.query(
          `INSERT INTO Notifications 
           (user_id, message, type, related_item_id) 
           VALUES (?, ?, 'match', ?)`,
          [
            compareItem.user_id,
            `A potential match has been found for your ${isFoundItem ? 'lost' : 'found'} item "${compareItem.title}"`,
            compareItem.id
          ]
        );

        // We'll handle email notifications from the frontend
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
      'SELECT user_id, title FROM Items WHERE id = ?',
      [itemId]
    );

    if (items.length > 0) {
      const item = items[0];
      
      // Create notification for item owner
      await pool.query(
        'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
        [
          item.user_id,
          `Your found item "${item.title}" has been approved`,
          'approval',
          itemId
        ]
      );
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
      await pool.query(
        'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
        [
          item.user_id,
          `Your found item "${item.title}" has been rejected${reason ? `: ${reason}` : ''}`,
          'rejection',
          itemId
        ]
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
      await pool.query(
        'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
        [
          staff.id,
          `New item request for "${item.title}"`,
          'request',
          itemId
        ]
      );
    }

    res.status(201).json({ 
      message: 'Item request submitted successfully',
      claimId: claimResult.insertId
    });
  } catch (error) {
    console.error('Error submitting item request:', error);
    res.status(500).json({ message: 'Error submitting item request' });
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
      AND (
        (i.is_approved = FALSE AND i.status = 'found')
        OR 
        (i.status = 'lost')
      )
      ORDER BY i.created_at DESC
    `);

    res.json(items);
  } catch (error) {
    console.error('Error fetching pending items:', error);
    res.status(500).json({ message: 'Error fetching pending items' });
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
      await pool.query(
        'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
        [
          claim.claimer_id,
          'Your request has been approved',
          'request_approved',
          claim.item_id
        ]
      );
    } else {
      // Create notification for claimer
      await pool.query(
        'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
        [
          claim.claimer_id,
          'Your request has been rejected',
          'request_rejected',
          claim.item_id
        ]
      );
    }

    res.json({ message: `Request ${action}d successfully` });
  } catch (error) {
    console.error('Error processing claim:', error);
    res.status(500).json({ message: 'Error processing claim' });
  }
});

// TEST ROUTE: For testing email notifications
app.get('/api/test/email-match/:email', async (req, res) => {
  // Add CORS headers for this test endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    const { email } = req.params;
    const { name, itemTitle, category, location } = req.query;

    console.log(`Testing match notification email to: ${email}`);
    
    // Create a test item object
    const testItem = {
      id: 9999,
      title: itemTitle || 'Test Item',
      category: category || 'Electronics',
      subcategory: 'Mobile Phone',
      description: 'This is a test item for email notification testing',
      location: location || 'Library',
      status: 'found',
      date: new Date().toISOString().slice(0, 10), // Today's date in YYYY-MM-DD format
      user_id: 1,
      is_approved: true
    };
    
    // Create a test match
    const testMatch = {
      id: 8888,
      lost_item_id: 7777,
      found_item_id: 9999,
      match_score: 0.85,
      status: 'pending',
      created_at: new Date()
    };
    
    // Actually send the email notification
    const emailResult = await emailService.sendMatchNotification(
      email,
      name || 'Test User',
      testItem.title,
      testMatch.id,
      {
        category: testItem.category,
        date: testItem.date,
        description: testItem.description,
        location: testItem.location
      }
    );
    
    // Send a response with the email status
    res.json({
      success: emailResult.success,
      message: emailResult.success 
        ? `Test match notification sent to ${email}` 
        : `Failed to send test notification to ${email}`,
      emailResult,
      testItem,
      testMatch,
      emailParams: {
        userEmail: email,
        userName: name || 'Test User',
        itemTitle: testItem.title,
        matchId: testMatch.id
      }
    });
  } catch (error) {
    console.error('Error sending test match notification:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error sending test match notification',
      error: error.message,
      stack: error.stack
    });
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

// Test route to check uploads directory
app.get('/api/test-uploads', (req, res) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Uploads directory does not exist' 
      });
    }
    
    const files = fs.readdirSync(uploadsDir);
    res.json({ 
      success: true,
      directory: uploadsDir,
      files,
      count: files.length,
      message: 'Uploads directory is accessible'
    });
  } catch (error) {
    console.error('Error checking uploads directory:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error checking uploads directory'
    });
  }
});

// Test route to directly serve the test image
app.get('/api/test-image', (req, res) => {
  const testImagePath = path.join(__dirname, 'uploads', 'test-image.png');
  
  if (fs.existsSync(testImagePath)) {
    console.log(`Test image exists at: ${testImagePath}`);
    res.sendFile(testImagePath);
  } else {
    console.log(`Test image does not exist at: ${testImagePath}`);
    res.status(404).json({ message: 'Test image not found' });
  }
});

// Mark item as received by security
app.put('/api/security/items/:itemId/receive', authenticateToken, async (req, res) => {
  try {
    // Check if user is security or admin
    if (req.user.role !== 'security' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const { itemId } = req.params;

    // Update item status to received
    await pool.query(
      'UPDATE Items SET status = ? WHERE id = ?',
      ['received', itemId]
    );

    // Get item details for notification
    const [items] = await pool.query(
      'SELECT user_id, title FROM Items WHERE id = ?',
      [itemId]
    );

    if (items.length > 0) {
      const item = items[0];
      
      // Create notification for item owner
      await pool.query(
        'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
        [
          item.user_id,
          `Your requested item "${item.title}" has been received by security`,
          'item_received',
          itemId
        ]
      );
    }

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
      await pool.query(
        'INSERT INTO Notifications (user_id, message, type, related_item_id) VALUES (?, ?, ?, ?)',
        [
          item.user_id,
          `Your item "${item.title}" has been returned to its owner`,
          'item_returned',
          itemId
        ]
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