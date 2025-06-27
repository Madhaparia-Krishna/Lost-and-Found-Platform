// Test script for ban notification email
require('dotenv').config();
const emailService = require('./server-email-nodemailer');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get user input
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function testBanEmail() {
  try {
    console.log('=== Ban Email Notification Test ===');
    
    // Get test email details
    const email = await askQuestion('Enter recipient email address: ');
    const name = await askQuestion('Enter recipient name: ');
    const reason = await askQuestion('Enter ban reason: ');
    
    if (!email || !name) {
      console.error('Email and name are required');
      return false;
    }
    
    console.log('\nSending ban notification email...');
    console.log('Recipient:', email);
    console.log('Name:', name);
    console.log('Reason:', reason || 'No reason provided');
    
    // Send ban notification email
    const result = await emailService.sendAccountBlockedNotification(email, name, reason);
    
    if (result.success) {
      console.log('\nBan notification email sent successfully!');
      console.log('Message ID:', result.messageId);
      return true;
    } else {
      console.error('\nFailed to send ban notification email:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error sending ban notification email:', error);
    return false;
  } finally {
    rl.close();
  }
}

// Run the test
testBanEmail()
  .then(success => {
    if (success) {
      console.log('\nBan email test completed successfully!');
    } else {
      console.log('\nBan email test failed. Please check the error messages above.');
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  }); 