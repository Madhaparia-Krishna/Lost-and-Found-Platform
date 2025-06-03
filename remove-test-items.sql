-- SQL script to remove test items from the database

-- Remove items with "Test" in the title
DELETE FROM Items WHERE title LIKE '%Test%' OR title LIKE '%test%';

-- Remove items with test descriptions
DELETE FROM Items WHERE description LIKE '%test item%' OR description LIKE '%Test item%';

-- Remove any test notifications
DELETE FROM Notifications WHERE message LIKE '%test%' OR message LIKE '%Test%';

-- Remove any test claims
DELETE FROM Claims WHERE 
    item_id IN (SELECT id FROM Items WHERE title LIKE '%Test%' OR title LIKE '%test%'); 