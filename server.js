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
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');

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

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeDatabase();
});