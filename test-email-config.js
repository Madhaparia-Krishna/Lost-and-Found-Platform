// Test script for email configuration
require('dotenv').config();
const nodemailer = require('nodemailer');

// Print current email configuration
console.log('Current email configuration:');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'Not set');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '*****' : 'Not set');
console.log('\n');

// Create a test transporter
async function testEmailConfig() {
  console.log('Testing email configuration...');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('ERROR: Email configuration is missing. Please set EMAIL_USER and EMAIL_PASS in your .env file.');
    console.log('\nExample .env configuration:');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_PASS=your-app-password');
    return false;
  }
  
  try {
    // Create test transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: true // Enable debug output
    });
    
    console.log('Verifying transporter configuration...');
    
    // Verify connection configuration
    try {
      await transporter.verify();
      console.log('Transporter verification successful!');
    } catch (verifyError) {
      console.error('Transporter verification failed:', verifyError);
      console.log('\nPossible issues:');
      console.log('1. Incorrect email or password');
      console.log('2. Less secure app access is disabled');
      console.log('3. For Gmail, you need to use an App Password if 2FA is enabled');
      return false;
    }
    
    // Ask for test email recipient
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const recipient = await new Promise(resolve => {
      readline.question('Enter email address to send test email to: ', resolve);
    });
    
    if (!recipient) {
      console.log('No recipient provided. Skipping test email.');
      readline.close();
      return false;
    }
    
    console.log(`Sending test email to ${recipient}...`);
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"Lost & Found System" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: 'Test Email - Lost & Found System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4285f4;">Email Configuration Test</h2>
          <p>This is a test email from the Lost & Found System.</p>
          <p>If you received this email, your email configuration is working correctly.</p>
          <p>You should now receive ban/unban notifications.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">This is an automated message, please do not reply directly to this email.</p>
        </div>
      `
    });
    
    console.log('Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    readline.close();
    return true;
  } catch (error) {
    console.error('Error testing email configuration:', error);
    
    console.log('\nTroubleshooting steps:');
    console.log('1. Check your EMAIL_USER and EMAIL_PASS in the .env file');
    console.log('2. For Gmail, make sure you\'re using an App Password');
    console.log('3. Check your email provider\'s security settings');
    
    return false;
  }
}

// Run the test
testEmailConfig()
  .then(success => {
    if (success) {
      console.log('\nEmail configuration test completed successfully!');
    } else {
      console.log('\nEmail configuration test failed. Please fix the issues and try again.');
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  }); 