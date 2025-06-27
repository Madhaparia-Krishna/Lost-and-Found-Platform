/**
 * Server-side email service using Nodemailer
 */
require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email configuration
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
};

// Log email configuration (without password)
console.log('Email Service Configuration:');
console.log('- Service:', emailConfig.service);
console.log('- User:', emailConfig.auth.user);
console.log('- Password:', emailConfig.auth.pass ? '[CONFIGURED]' : '[NOT CONFIGURED]');

// Create transporter
const createTransporter = () => {
  console.log('Creating email transporter...');
  
  try {
    const transporter = nodemailer.createTransport({
      service: emailConfig.service,
      auth: emailConfig.auth
    });
    
    console.log('Email transporter created successfully');
    return transporter;
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

// Send account blocked notification
const sendAccountBlockedNotification = async (userEmail, userName, reason = 'Policy violation') => {
  try {
    console.log(`Sending account blocked notification to ${userEmail}`);
    
    // Create email content with theme colors - removing reason from template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #EAE7DC; border-radius: 5px;">
        <div style="background-color: #8E8D8A; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="color: white; margin: 0;">Lost@Campus</h1>
          <p style="color: white; margin: 5px 0 0;">Lost and Found System</p>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 5px 5px; border-left: 1px solid #D8C3A5; border-right: 1px solid #D8C3A5; border-bottom: 1px solid #D8C3A5;">
          <h2 style="color: #E85A4F; margin-top: 0;">Account Blocked</h2>
          <p style="color: #4D4C4A;">Hello ${userName},</p>
          <p style="color: #4D4C4A;">Your account on the Lost & Found System has been blocked.</p>
          <p style="color: #4D4C4A;">If you believe this is a mistake or would like to appeal this decision, please contact our support team.</p>
          <p style="color: #4D4C4A;">Thank you for your understanding.</p>      
          <p style="font-size: 12px; color: #8E8D8A;">This is an automated message, please do not reply directly to this email.</p>
          <p style="font-size: 12px; color: #8E8D8A;">&copy; ${new Date().getFullYear()} Lost@Campus - All rights reserved</p>
        </div>
      </div>
    `;
    
    // Create transporter
    const transporter = createTransporter();
    
    // Send mail
    console.log('Sending ban notification email...');
    const info = await transporter.sendMail({
      from: `"Lost@Campus" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: 'Your Account Has Been Blocked - Lost@Campus',
      html: htmlContent
    });
    
    console.log(`Account blocked notification sent to ${userEmail}, message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending account blocked notification:', error);
    return { success: false, error: error.message };
  }
};

// Send account unblocked notification
const sendAccountUnblockedNotification = async (userEmail, userName) => {
  try {
    console.log(`Sending account unblocked notification to ${userEmail}`);
    
    // Create email content with theme colors
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #EAE7DC; border-radius: 5px;">
        <div style="background-color: #8E8D8A; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="color: white; margin: 0;">Lost@Campus</h1>
          <p style="color: white; margin: 5px 0 0;">Lost and Found System</p>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 5px 5px; border-left: 1px solid #D8C3A5; border-right: 1px solid #D8C3A5; border-bottom: 1px solid #D8C3A5;">
          <h2 style="color: #E98074; margin-top: 0;">Account Unblocked</h2>
          <p style="color: #4D4C4A;">Hello ${userName},</p>
          <p style="color: #4D4C4A;">Good news! Your account on the Lost & Found System has been unblocked.</p>
          <p style="color: #4D4C4A;">You can now log in and use the system again.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/login" style="display: inline-block; padding: 12px 25px; background-color: #E98074; color: white; text-decoration: none; border-radius: 3px; font-weight: bold;">Login to Your Account</a>
          </div>
          
          <p style="color: #4D4C4A;">If you have any questions, please contact our support team.</p>
          <p style="color: #4D4C4A;">Thank you for your patience.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #D8C3A5; text-align: center;">
            <p style="font-size: 12px; color: #8E8D8A;">This is an automated message, please do not reply directly to this email.</p>
            <p style="font-size: 12px; color: #8E8D8A;">&copy; ${new Date().getFullYear()} Lost@Campus - All rights reserved</p>
          </div>
        </div>
      </div>
    `;
    
    // Create transporter
    const transporter = createTransporter();
    
    // Send mail
    console.log('Sending unban notification email...');
    const info = await transporter.sendMail({
      from: `"Lost@Campus" <${emailConfig.auth.user}>`,
      to: userEmail,
      subject: 'Your Account Has Been Unblocked - Lost@Campus',
      html: htmlContent
    });
    
    console.log(`Account unblocked notification sent to ${userEmail}, message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending account unblocked notification:', error);
    return { success: false, error: error.message };
  }
};

// Verify email configuration on module load
(async () => {
  try {
    console.log('Verifying email configuration...');
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration verified successfully!');
  } catch (error) {
    console.error('Email configuration verification failed:', error);
    console.error('Email notifications will not work until this is fixed.');
  }
})();

// Export functions
module.exports = {
  sendAccountBlockedNotification,
  sendAccountUnblockedNotification
}; 