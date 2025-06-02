-- Update the Items table status enum to include 'requested' and 'received' instead of 'claimed'
ALTER TABLE Items MODIFY COLUMN status ENUM('lost', 'found', 'requested', 'received', 'returned') NOT NULL;

-- Update any existing 'claimed' status to 'requested'
UPDATE Items SET status = 'requested' WHERE status = 'claimed';

-- Update the Notifications table type enum to include the new notification types
ALTER TABLE Notifications MODIFY COLUMN type ENUM('match', 'request', 'approval', 'request_approved', 'request_rejected', 'item_received', 'item_returned', 'system') NOT NULL;

-- Update any existing 'claim' notification types to 'request'
UPDATE Notifications SET type = 'request' WHERE type = 'claim';
UPDATE Notifications SET type = 'request_approved' WHERE type = 'claim_approved';
UPDATE Notifications SET type = 'request_rejected' WHERE type = 'claim_rejected'; 