# Lost and Found Platform

A web application for managing lost and found items on a campus with role-based access control.

## Features

- User registration and login
- Role-based access control (Admin, Security, User)
- Admin panel for user management and system logs
- Security panel for handling claims and item management
- User dashboard for submitting lost/found items and making claims

## Tech Stack

- Frontend: React, React Router
- Backend: Node.js, Express.js
- Database: MySQL
- Authentication: JWT (JSON Web Tokens)

## Prerequisites

- Node.js (v14+)
- MySQL (v5.7+)

## Setup Instructions

### 1. Clone the repository

```
git clone <repository-url>
cd lost-and-found-platform
```

### 2. Install dependencies

```
npm install
```

### 3. Set up MySQL database

Make sure MySQL is running on your system. Then check the database.sql file for the schema.

You can configure your database connection in server-config.js:

```javascript
// Database configuration
exports.dbConfig = {
  host: 'localhost',  // Change if your MySQL server is on a different host
  user: 'root',       // Your MySQL username
  password: '',       // Your MySQL password
  database: 'lost_and_found_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
```

### 4. Run the database setup script

This will create the database, tables, and initial admin and security users:

```
npm run setup-db
```

### 5. Start the application

For development (runs both frontend and backend servers concurrently):

```
npm run dev
```

For production:

```
npm run build
npm run server
```

## Default Users

After setting up the database, the following users are created:

1. **Admin User**
   - Email: admin@example.com
   - Password: admin12345
   - Role: admin

2. **Security User**
   - Email: security@example.com
   - Password: security12345
   - Role: security

## Password Requirements

All passwords must be at least 8 characters long. This requirement is enforced on both the client and server side.

## API Endpoints

### Authentication

- `POST /api/register` - Register a new user
- `POST /api/login` - Login
- `GET /api/verify-token` - Verify JWT token
- `POST /api/logout` - Logout

### Items (To be implemented)

- `POST /api/items` - Add a new item
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get a specific item
- `PUT /api/items/:id` - Update an item
- `DELETE /api/items/:id` - Delete an item

### Claims (To be implemented)

- `POST /api/claims` - Add a new claim
- `GET /api/claims` - Get all claims
- `GET /api/claims/:id` - Get a specific claim
- `PUT /api/claims/:id` - Update a claim
- `DELETE /api/claims/:id` - Delete a claim

## License

[MIT](LICENSE)
