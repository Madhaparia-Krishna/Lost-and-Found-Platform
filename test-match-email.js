/**
 * Test script to directly send a match notification email
 * Usage: node test-match-email.js <recipient-email>
 */

const { sendMatchNotificationEmail } = require('./services/matching.service');

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.error('Usage: node test-match-email.js <recipient-email>');
  process.exit(1);
}

// Test data
const userDetails = {
  name: 'Test User',
  email: email
};

const lostItem = {
  id: 47,
  title: 'Watch',
  category: 'Accessories',
  description: 'Silver watch lost in library',
  location: 'Library',
  status: 'lost',
  date: new Date()
};

const foundItem = {
  id: 35,
  title: 'Watch',
  category: 'Accessories',
  description: 'Silver colored watch',
  location: 'Library',
  status: 'found',
  date: new Date()
};

// Match score (70% minimum)
const matchScore = 0.85; // 85% match

console.log(`Testing match notification email to ${email}...`);

// Send email
(async () => {
  try {
    const result = await sendMatchNotificationEmail(
      userDetails,
      lostItem, 
      foundItem,
      matchScore
    );
    
    console.log('Email send result:', result);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Failed to send email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
})(); 