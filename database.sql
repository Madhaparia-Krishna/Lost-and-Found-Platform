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
    description TEXT,
    location VARCHAR(100),
    status ENUM('claimed', 'returned') NOT NULL,
    image VARCHAR(255),
    date DATE,
    user_id INT,
    is_deleted BOOLEAN DEFAULT FALSE,
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
    status ENUM('unread', 'read') DEFAULT 'unread',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- LOGS TABLE
DROP TABLE IF EXISTS Logs;
CREATE TABLE Logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    action TEXT NOT NULL,
    by_user INT,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (by_user) REFERENCES Users(id) ON DELETE CASCADE
);
