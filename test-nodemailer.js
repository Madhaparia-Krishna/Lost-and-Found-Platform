/**
 * Test script for Nodemailer integration
 */
require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Get email address from command line arguments
const emailAddress = process.argv[2];
if (!emailAddress) {
  console.error('Please provide an email address as a command line argument');
  console.error('Example: node test-nodemailer.js your-email@example.com');
  process.exit(1);
}

// Configuration 
const emailConfig = {
  // Get values from .env file
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password' 
  },
  template: path.join(__dirname, 'public/match-template.html')
};

async function testEmail() {
  try {
    console.log('Testing email functionality with Nodemailer');
    console.log(`Attempting to send email to: ${emailAddress}`);
    
    if (!emailConfig.auth.user || emailConfig.auth.user === 'your-email@gmail.com') {
      console.error('\n❌ EMAIL_USER not set in .env file');
      console.error('Please set EMAIL_USER and EMAIL_PASS in your .env file');
      console.error('For Gmail, you need to create an App Password: https://myaccount.google.com/apppasswords');
      return;
    }
    
    console.log(`Sender email: ${emailConfig.auth.user}`);
    
    // Load template
    let template;
    try {
      template = fs.readFileSync(emailConfig.template, 'utf8');
      console.log('Email template loaded successfully');
    } catch (err) {
      console.error('Error reading email template:', err);
      template = `
        <h1>Test Email</h1>
        <p>Hello {{user_name}},</p>
        <p>This is a test email to verify the matching system.</p>
        <p>Match Score: 80%</p>
        <p>Item: Test Watch</p>
        <p>If you received this email, the email system is working correctly.</p>
      `;
      console.log('Using fallback template');
    }
    
    // Replace template variables
    const replacements = {
      '{{user_name}}': 'Test User',
      '{{message}}': 'This is a test email to verify the matching system.',
      '{{item_title}}': 'Test Watch',
      '{{category}}': 'Accessories',
      '{{location}}': 'University Library',
      '{{date}}': new Date().toLocaleDateString(),
      '{{match_link}}': 'http://localhost:3000/items/1',
      '{{match_score}}': '80%',
      '{{time}}': new Date().toLocaleString()
    };
    
    Object.keys(replacements).forEach(key => {
      template = template.replace(new RegExp(key, 'g'), replacements[key]);
    });
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: emailConfig.service,
      auth: emailConfig.auth
    });
    
    // Send mail
    const info = await transporter.sendMail({
      from: `"Lost & Found System" <${emailConfig.auth.user}>`,
      to: emailAddress,
      subject: 'Test Email - Lost & Found Match System',
      html: template
    });
    
    console.log('\n✅ Email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    console.error('\n❌ Error sending email:');
    console.error(error);
  }
}

// Run the test
testEmail()
  .then(() => console.log('\nEmail test completed.'))
  .catch(err => console.error('Unhandled error:', err)); 