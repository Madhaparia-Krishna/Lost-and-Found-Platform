/**
 * Item matching service
 * Compares lost items against found items and vice versa to find potential matches
 */

const stringSimilarity = require('string-similarity');
const dayjs = require('dayjs');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Email configuration
const emailConfig = {
  // SMTP configuration
  service: process.env.EMAIL_SERVICE || 'gmail', // Default to gmail but can be changed in .env
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com', // Set your email in .env file
    pass: process.env.EMAIL_PASS || 'your-app-password'     // Set your app password in .env file
  },
  // Email template paths
  templates: {
    matchNotification: path.join(__dirname, '../public/match-template.html')
  }
};

// Database configuration
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lost_and_found_system', // Correct database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Calculate similarity between two strings
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} - Similarity score between 0 and 1
 */
const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  return stringSimilarity.compareTwoStrings(str1, str2);
};

/**
 * Calculate match score between a lost and found item
 * @param {Object} lostItem - Lost item object
 * @param {Object} foundItem - Found item object
 * @returns {number} - Match score between 0 and 1
 */
const calculateMatchScore = (lostItem, foundItem) => {
  let score = 0;
  let weights = {
    location: 0.3,    // 30%
    category: 0.2,    // 20%
    subcategory: 0.15, // 15%
    description: 0.35  // 35%
  };

  // Location comparison - calculate similarity instead of requiring exact match
  const locationSimilarity = calculateStringSimilarity(
    lostItem.location || '',
    foundItem.location || ''
  );
  score += weights.location * locationSimilarity;

  // Category comparison
  const categorySimilarity = calculateStringSimilarity(
    lostItem.category || '',
    foundItem.category || ''
  );
  score += weights.category * categorySimilarity;

  // Subcategory comparison
  const subcategorySimilarity = calculateStringSimilarity(
    lostItem.subcategory || '',
    foundItem.subcategory || ''
  );
  score += weights.subcategory * subcategorySimilarity;

  // Description comparison
  const descriptionSimilarity = calculateStringSimilarity(
    lostItem.description || '',
    foundItem.description || ''
  );
  score += weights.description * descriptionSimilarity;

  // Round to 2 decimal places
  return Math.round(score * 100) / 100;
};

/**
 * Send match notification email
 * @param {Object} userDetails - User to notify
 * @param {Object} itemDetails - Item user reported
 * @param {Object} matchedItem - Matched item
 * @param {number} matchScore - Match score
 * @returns {Promise<Object>} - Response from Nodemailer
 */
const sendMatchNotificationEmail = async (userDetails, itemDetails, matchedItem, matchScore) => {
  try {
    console.log(`Sending match notification email to ${userDetails.email} for match score ${matchScore}`);

    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Determine match link
    const matchLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/items/${matchedItem.id}`;
    
    // Load the email template
    let template;
    try {
      template = fs.readFileSync(emailConfig.templates.matchNotification, 'utf8');
    } catch (err) {
      console.error('Error reading email template:', err);
      // Fallback to a simple template
      template = `
        <h1>Match Found!</h1>
        <p>Hello {{user_name}},</p>
        <p>{{message}}</p>
        <p>Match Score: {{match_score}}</p>
        <p>Item: {{item_title}}</p>
        <p>Category: {{category}}</p>
        <p>Location: {{location}}</p>
        <p>Date: {{date}}</p>
        <p>View more details at: <a href="{{match_link}}">Check Match</a></p>
      `;
    }
    
    // Replace template variables
    const replacements = {
      '{{user_name}}': userDetails.name || 'User',
      '{{message}}': `We've found a potential match (${Math.round(matchScore * 100)}% similarity) for your ${itemDetails.status} item "${itemDetails.title}".`,
      '{{item_title}}': matchedItem.title,
      '{{category}}': matchedItem.category || 'Not specified',
      '{{location}}': matchedItem.location || 'Not specified',
      '{{date}}': matchedItem.date ? new Date(matchedItem.date).toLocaleDateString() : 'Not specified',
      '{{match_link}}': matchLink,
      '{{match_score}}': `${Math.round(matchScore * 100)}%`,
      '{{time}}': formattedTime
    };
    
    Object.keys(replacements).forEach(key => {
      template = template.replace(new RegExp(key, 'g'), replacements[key]);
    });
    
    // Create a transporter
    console.log(`Creating email transporter with service: ${emailConfig.service}, user: ${emailConfig.auth.user}`);
    const transporter = nodemailer.createTransport({
      service: emailConfig.service,
      auth: emailConfig.auth,
      debug: true // Enable debug logs
    });
    
    // Verify connection configuration
    try {
      await transporter.verify();
      console.log('Transporter verification successful');
    } catch (verifyError) {
      console.error('Transporter verification failed:', verifyError);
      return { 
        success: false, 
        error: `Email configuration error: ${verifyError.message}` 
      };
    }
    
    // Send the email
    const mailOptions = {
      from: `"Lost & Found System" <${emailConfig.auth.user}>`,
      to: userDetails.email,
      subject: `Potential Match Found for Your ${itemDetails.status} Item`,
      html: template
    };
    
    console.log(`Sending email to ${userDetails.email} about match for "${itemDetails.title}"`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Match notification email sent successfully:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending match notification email:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Record match in the database
 * @param {Object} lostItem - Lost item
 * @param {Object} foundItem - Found item
 * @param {number} matchScore - Match score
 * @returns {Promise<number>} - Match ID
 */
const recordMatch = async (lostItem, foundItem, matchScore) => {
  try {
    console.log(`🔍 Attempting to record match between lost item ${lostItem.id} (${lostItem.title}) and found item ${foundItem.id} (${foundItem.title})`);
    
    // Check if match already exists
    const [existingMatches] = await pool.query(
      'SELECT * FROM ItemMatches WHERE lost_item_id = ? AND found_item_id = ?',
      [lostItem.id, foundItem.id]
    );

    if (existingMatches.length > 0) {
      console.log(`Match already exists between lost item ${lostItem.id} and found item ${foundItem.id}`);
      return existingMatches[0].id;
    }

    // Insert new match
    const [result] = await pool.query(
      'INSERT INTO ItemMatches (lost_item_id, found_item_id, match_score, status) VALUES (?, ?, ?, ?)',
      [lostItem.id, foundItem.id, matchScore, 'pending']
    );

    console.log(`✅ MATCH CREATED: Match recorded with ID: ${result.insertId}`);
    console.log(`   Lost item: ${lostItem.id} (${lostItem.title})`);
    console.log(`   Found item: ${foundItem.id} (${foundItem.title})`);
    console.log(`   Match score: ${matchScore} (${Math.round(matchScore * 100)}%)`);
    
    return result.insertId;
  } catch (error) {
    console.error('Error recording match:', error);
    throw error;
  }
};

/**
 * Create notification for user
 * @param {number} userId - User ID to notify
 * @param {string} message - Notification message
 * @param {number} itemId - Related item ID
 * @param {string} type - Notification type ('match' or 'new_found_item')
 * @param {string} itemStatus - Status of the related item ('lost' or 'found')
 * @returns {Promise<void>}
 */
const createNotification = async (userId, message, itemId, type = 'match', itemStatus = null) => {
  try {
    await pool.query(
      'INSERT INTO Notifications (user_id, message, type, related_item_id, item_status) VALUES (?, ?, ?, ?, ?)',
      [userId, message, type, itemId, itemStatus]
    );
    console.log(`Notification created for user ${userId}`);
  } catch (error) {
    console.error('Error creating notification:', error);
    // Continue anyway
  }
};

/**
 * Find matches for a new item
 * @param {Object} newItem - Newly submitted item
 * @returns {Promise<Array>} - Array of match objects
 */
const matchItems = async (newItem) => {
  try {
    console.log(`Finding matches for ${newItem.status} item ${newItem.id}: "${newItem.title}"`);
    
    // Determine opposite status
    const oppositeStatus = newItem.status === 'lost' ? 'found' : 'lost';
    
    // Get items from the past 7 days with opposite status
    const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
    
    const query = `
      SELECT i.*, u.name, u.email 
      FROM Items i
      JOIN Users u ON i.user_id = u.id
      WHERE i.status = ?
      AND i.is_approved = TRUE
      AND i.is_deleted = FALSE
      AND i.created_at >= ?
      AND i.id != ?
    `;
    
    const [items] = await pool.query(query, [oppositeStatus, sevenDaysAgo, newItem.id]);
    console.log(`Found ${items.length} ${oppositeStatus} items from the past 7 days`);
    
    // Match threshold - only send notifications for 70% or higher matches
    const MATCH_THRESHOLD = 0.7; // 70%
    
    // Calculate match scores
    const matches = [];
    
    for (const item of items) {
      // Calculate match score
      const score = newItem.status === 'lost'
        ? calculateMatchScore(newItem, item)
        : calculateMatchScore(item, newItem);
      
      // Log all potential matches with their scores for debugging
      console.log(`Match score: ${score.toFixed(2)} (${Math.round(score * 100)}%) between ${newItem.status} item "${newItem.title}" and ${oppositeStatus} item "${item.title}"`);
      console.log(`  Location similarity: ${newItem.location} vs ${item.location}`);
      console.log(`  Category similarity: ${newItem.category} vs ${item.category}`);
      
      // If score is above threshold, add to matches
      if (score >= MATCH_THRESHOLD) {
        console.log(`✅ Match found with score ${score} between ${newItem.status} item ${newItem.id} and ${oppositeStatus} item ${item.id}`);
        matches.push({
          item,
          score
        });
      }
    }
    
    console.log(`Found ${matches.length} potential matches above ${MATCH_THRESHOLD * 100}% threshold`);
    
    // Process matches
    for (const match of matches) {
      try {
        // Get user details for the item that matches the new item
        const { item, score } = match;
        
        // Record match in database
        const lostItem = newItem.status === 'lost' ? newItem : item;
        const foundItem = newItem.status === 'lost' ? item : newItem;
        const matchId = await recordMatch(lostItem, foundItem, score);
        
        // Get user details for the lost item (the person to notify)
        const [lostItemUserDetails] = await pool.query(
          'SELECT u.* FROM Users u JOIN Items i ON u.id = i.user_id WHERE i.id = ?',
          [lostItem.id]
        );
        
        // Get user details for the found item
        const [foundItemUserDetails] = await pool.query(
          'SELECT u.* FROM Users u JOIN Items i ON u.id = i.user_id WHERE i.id = ?',
          [foundItem.id]
        );
        
        if (lostItemUserDetails.length === 0) {
          console.error(`User not found for lost item ${lostItem.id}`);
          continue;
        }
        
        const lostItemUser = lostItemUserDetails[0];
        
        // Create notification for lost item user
        const lostItemMessage = `A potential match (${Math.round(score * 100)}% similarity) has been found for your lost item "${lostItem.title}"`;
        await createNotification(lostItem.user_id, lostItemMessage, foundItem.id, 'match', 'lost');
        
        // Create notification for found item user if different from lost item user
        if (foundItemUserDetails.length > 0 && foundItem.user_id !== lostItem.user_id) {
          const foundItemUser = foundItemUserDetails[0];
          const foundItemMessage = `Your found item "${foundItem.title}" has been matched (${Math.round(score * 100)}% similarity) with a lost item`;
          await createNotification(foundItem.user_id, foundItemMessage, lostItem.id, 'match', 'found');
        }
        
        // Send email notification ONLY to the lost item user if enabled
        const sendEmails = process.env.SEND_MATCH_EMAILS === 'true';
        
        if (sendEmails) {
          try {
            console.log(`Attempting to send match notification email to ${lostItemUser.email}`);
            const emailResult = await sendMatchNotificationEmail(
              lostItemUser, 
              lostItem,
              foundItem,
              score
            );
            
            if (emailResult.success) {
              console.log(`✅ Match notification email sent successfully to ${lostItemUser.email}`);
              
              // Update match status to notified
              await pool.query(
                'UPDATE ItemMatches SET status = "notified" WHERE id = ?',
                [matchId]
              );
            } else {
              console.error(`⚠️ Failed to send email notification: ${emailResult.error}`);
            }
          } catch (emailError) {
            console.error('Error sending match notification email:', emailError);
            // Continue processing - the match is still recorded
          }
        } else {
          console.log(`Email notifications are disabled. Set SEND_MATCH_EMAILS=true in .env to enable.`);
        }
      } catch (matchError) {
        console.error('Error processing match:', matchError);
        // Continue to next match
      }
    }
    
    return matches;
  } catch (error) {
    console.error('Error matching items:', error);
    return [];
  }
};

module.exports = {
  matchItems,
  calculateMatchScore,
  sendMatchNotificationEmail,
  calculateStringSimilarity
}; 