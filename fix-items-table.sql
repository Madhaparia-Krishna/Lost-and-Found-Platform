-- Fix the Items table status enum to include 'found' and 'lost'
USE lost_and_found_system;

-- Alter the Items table to modify the status field
ALTER TABLE Items 
MODIFY COLUMN status ENUM('lost', 'found', 'claimed', 'returned') NOT NULL; 