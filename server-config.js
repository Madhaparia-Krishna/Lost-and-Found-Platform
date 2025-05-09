// Database configuration
exports.dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lost_and_found_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// JWT configuration
exports.jwtConfig = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_replace_in_production',
  expiresIn: '24h'
};

// Server configuration
exports.serverConfig = {
  port: process.env.PORT || 5000,
  corsOptions: {
    origin: '*', // In production, specify your frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
}; 