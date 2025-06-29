/**
 * Test script to directly send a match notification email
 * Usage: node test-match-email.js <recipient-email>
 */

const { sendMatchNotificationEmail } = require('./services/matching.service');
const config = require('./server-config');

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.error('Usage: node test-match-email.js <recipient-email>');
  process.exit(1);
}

// Print configuration
console.log('=== Match Email Test Configuration ===');
console.log('Email Service:', config.emailConfig?.service || 'Not configured');
console.log('Email User:', config.emailConfig?.auth?.user || 'Not configured');
console.log('Send Match Emails:', config.emailConfig?.sendMatchEmails ? 'Enabled' : 'Disabled');
console.log('=======================================');

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
console.log('Lost item:', lostItem.title);
console.log('Found item:', foundItem.title);
console.log('Match score:', `${Math.round(matchScore * 100)}%`);

// Temporarily force enable match emails for testing
if (config.emailConfig) {
  console.log('Forcing sendMatchEmails to true for testing');
  config.emailConfig.sendMatchEmails = true;
}

// Send email
(async () => {
  try {
    console.log('\nSending test match notification email...');
    const result = await sendMatchNotificationEmail(
      userDetails,
      lostItem, 
      foundItem,
      matchScore
    );
    
    console.log('\nEmail send result:', result);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', result.messageId);
    } else if (result.skipped) {
      console.log('⚠️ Email skipped:', result.reason);
    } else {
      console.log('❌ Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
})(); 