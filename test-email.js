/**
 * Test script for EmailJS integration
 */

const axios = require('axios');
require('dotenv').config();

// Email configuration (same as in matching.service.js)
const emailConfig = {
  serviceId: "service_1b8c1on", // EmailJS service ID
  publicKey: "pDF979lgKSH6M7p8y", // EmailJS public key
  templates: {
    matchNotification: "template_cnjtyil" // Match notification template
  }
};

async function testEmail(recipientEmail) {
  try {
    console.log(`Attempting to send test email to ${recipientEmail}...`);

    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Prepare template parameters
    const templateParams = {
      to_email: recipientEmail,
      name: "Lost & Found System",
      user_name: "Test User",
      time: formattedTime,
      message: "This is a test email to verify the matching notification system.",
      item_title: "Test Item (Watch)",
      category: "Accessories",
      location: "University Library",
      date: now.toLocaleDateString(),
      match_link: "http://localhost:3000/items/1",
      match_score: "85%"
    };

    console.log("Email template parameters:", JSON.stringify(templateParams, null, 2));
    
    // Make API call to EmailJS
    const response = await axios({
      method: 'post',
      url: 'https://api.emailjs.com/api/v1.0/email/send',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templates.matchNotification,
        user_id: emailConfig.publicKey,
        template_params: templateParams
      })
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Response:', response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error('❌ Error sending test email:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received. Network issue?');
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Full error:', error);
    return { 
      success: false, 
      error: error.response ? error.response.data : error.message 
    };
  }
}

// Get email from command line argument
const email = process.argv[2] || 'test@example.com';

// Run test
testEmail(email)
  .then(() => {
    console.log('Test completed.');
  })
  .catch(err => {
    console.error('Unhandled error:', err);
  }); 