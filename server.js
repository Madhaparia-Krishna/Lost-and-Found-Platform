const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const config = require('./server-config');

// Create Express app
const app = express();

// Middleware
app.use(cors(config.serverConfig.corsOptions));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

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

// Logout endpoint (server-side session management, if needed)
app.post('/api/logout', authenticateToken, (req, res) => {
  // In a real-world scenario, you might blacklist the token
  // Log the logout
  try {
    pool.query(
      'INSERT INTO Logs (action, by_user) VALUES (?, ?)',
      [`User logout`, req.user.id]
    );
  } catch (error) {
    console.error('Error logging logout:', error);
  }
  
  res.json({ message: 'Logged out successfully' });
});

// Catch-all route to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
const PORT = config.serverConfig.port;
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 