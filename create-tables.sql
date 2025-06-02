-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS lost_and_found_system;
USE lost_and_found_system;

-- Users table
CREATE TABLE Users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'security', 'admin') DEFAULT 'user',
    admission_number VARCHAR(50),
    faculty_school VARCHAR(100),
    year_of_study VARCHAR(20),
    phone_number VARCHAR(20),
    reset_token VARCHAR(255),
    reset_expires DATETIME,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE Items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    description TEXT NOT NULL,
    location VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    status ENUM('lost', 'found', 'requested', 'received', 'returned') NOT NULL,
    image VARCHAR(255),
    user_id INT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Claims table (for item requests)
CREATE TABLE Claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    claimer_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    claim_description TEXT,
    contact_info TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES Items(id),
    FOREIGN KEY (claimer_id) REFERENCES Users(id)
);

-- Notifications table
CREATE TABLE Notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type ENUM('match', 'request', 'approval', 'request_approved', 'request_rejected', 'item_received', 'item_returned', 'system') NOT NULL,
    status ENUM('unread', 'read') DEFAULT 'unread',
    related_item_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (related_item_id) REFERENCES Items(id)
);

-- Item Matches table
CREATE TABLE ItemMatches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lost_item_id INT NOT NULL,
    found_item_id INT NOT NULL,
    match_score FLOAT NOT NULL,
    status ENUM('pending', 'notified', 'claimed', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES Items(id),
    FOREIGN KEY (found_item_id) REFERENCES Items(id)
);

-- System Logs table
CREATE TABLE SystemLogs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- Chat rooms table
CREATE TABLE IF NOT EXISTS ChatRooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES Users(id)
);

-- Chat room participants
CREATE TABLE IF NOT EXISTS ChatRoomParticipants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES ChatRooms(id),
  FOREIGN KEY (user_id) REFERENCES Users(id),
  UNIQUE (room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS ChatMessages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  sender_name VARCHAR(100),
  sender_role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES ChatRooms(id),
  FOREIGN KEY (sender_id) REFERENCES Users(id)
);

-- General activity logs
CREATE TABLE IF NOT EXISTS Logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  by_user INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (by_user) REFERENCES Users(id)
);

-- Insert default admin user if doesn't exist
INSERT INTO Users (name, email, password, role)
SELECT 'Admin', 'admin@example.com', '$2b$10$1Xp0MQ4XzDg9XGKVUzvhCOK9W5FZC6xvg/zDqMeYS5sm7X5NWAqGq', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE email = 'admin@example.com');
-- Default password: admin123 