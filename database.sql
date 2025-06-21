-- Drop and Create Database
DROP DATABASE IF EXISTS lost_and_found_system;
CREATE DATABASE lost_and_found_system;
USE lost_and_found_system;

-- USERS TABLE
DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    admission_number VARCHAR(50),
    faculty_school VARCHAR(100),
    year_of_study VARCHAR(50),
    phone_number VARCHAR(20),
    role ENUM('admin', 'user', 'security') NOT NULL,
    reset_token VARCHAR(255),
    reset_expires DATETIME,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ITEMS TABLE
DROP TABLE IF EXISTS Items;
CREATE TABLE Items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    subcategory VARCHAR(50),
    description TEXT,
    location VARCHAR(100),
    status ENUM('lost', 'found', 'requested', 'received', 'returned') NOT NULL,
    image VARCHAR(255),
    date DATE,
    user_id INT,
    is_approved BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_donated BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- CLAIMS TABLE
DROP TABLE IF EXISTS Claims;
CREATE TABLE Claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT,
    claimer_id INT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    claim_description TEXT,
    contact_info TEXT,
    date DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES Items(id) ON DELETE CASCADE,
    FOREIGN KEY (claimer_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- NOTIFICATIONS TABLE
DROP TABLE IF EXISTS Notifications;
CREATE TABLE Notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message TEXT NOT NULL,
    user_id INT,
    type ENUM('match', 'request', 'approval', 'request_approved', 'request_rejected', 'item_received', 'item_returned', 'system') DEFAULT 'system',
    status ENUM('unread', 'read') DEFAULT 'unread',
    related_item_id INT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_item_id) REFERENCES Items(id) ON DELETE CASCADE
);

-- LOGS TABLE
DROP TABLE IF EXISTS Logs;
CREATE TABLE Logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    action TEXT NOT NULL,
    details TEXT,
    by_user INT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (by_user) REFERENCES Users(id) ON DELETE CASCADE
);

-- SYSTEM LOGS TABLE
DROP TABLE IF EXISTS SystemLogs;
CREATE TABLE SystemLogs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    user_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- USER ACTIVITY TABLE
DROP TABLE IF EXISTS UserActivity;
CREATE TABLE UserActivity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ITEM MATCHES TABLE
DROP TABLE IF EXISTS ItemMatches;
CREATE TABLE ItemMatches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lost_item_id INT,
    found_item_id INT,
    match_score FLOAT,
    status ENUM('pending', 'notified', 'claimed', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES Items(id) ON DELETE CASCADE,
    FOREIGN KEY (found_item_id) REFERENCES Items(id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT INTO Users (name, email, password, role)
VALUES ('Admin', 'admin@example.com', '$2b$10$1Xp0MQ4XzDg9XGKVUzvhCOK9W5FZC6xvg/zDqMeYS5sm7X5NWAqGq', 'admin');
-- Default password: admin123
