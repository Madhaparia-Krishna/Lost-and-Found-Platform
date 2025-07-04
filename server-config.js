// Database configuration
exports.dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lost_and_found_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Add these options for better error handling
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  debug: true
};

// JWT configuration
exports.jwtConfig = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_replace_in_production',
  expiresIn: '24h'
};

// Server configuration
exports.serverConfig = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  corsOptions: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Explicitly include the frontend domains
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};

// Helper function to get actual server URL (for use in logs or responses)
exports.getServerUrl = (port) => {
  const actualPort = port || exports.serverConfig.port;
  return `http://localhost:${actualPort}`;
}; 