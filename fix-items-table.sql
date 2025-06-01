-- Fix the Items table schema to ensure it has all necessary columns
USE lost_and_found_system;

-- Check if the 'status' enum includes 'lost' and 'found'
ALTER TABLE Items MODIFY COLUMN status ENUM('lost', 'found', 'claimed', 'returned') NOT NULL;

-- Check if 'subcategory' column exists, add if it doesn't
ALTER TABLE Items ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50) AFTER category;

-- Check if 'is_approved' column exists, add if it doesn't
ALTER TABLE Items ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- Ensure 'image' column exists
ALTER TABLE Items MODIFY COLUMN image VARCHAR(255);

-- Check current table structure
DESCRIBE Items;

-- Show a sample of the data
SELECT id, title, category, subcategory, status, image, is_approved FROM Items LIMIT 5; 