// Server-side email utility for sending test emails
require('dotenv').config();
const axios = require('axios');

// Email configuration 
const emailConfig = {
  serviceId: "service_1b8c1on", // EmailJS service ID
  publicKey: "pDF979lgKSH6M7p8y", // EmailJS public key
  templates: {
    matchNotification: "template_cnjtyil", // Match notification template
    passwordReset: "template_fqz7o43"     // Password reset template
  }
};

// Send a match notification email using EmailJS REST API
const sendMatchNotification = async (userEmail, userName, itemTitle, matchId, additionalData = {}) => {
  try {
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Build parameters for template_cnjtyil
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: `We've found an item that matches your lost report: ${itemTitle}`,
      item_title: itemTitle,
      category: additionalData.category || 'Not specified',
      date: additionalData.date ? new Date(additionalData.date).toLocaleDateString() : now.toLocaleDateString(),
      match_link: `http://localhost:3000/matches/${matchId}`
    };

    console.log('Sending match notification with params:', templateParams);

    // Make direct API call to EmailJS
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
    
    console.log('Match notification email sent!', response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error('Error sending match notification:', error.response ? error.response.data : error.message);
    return { 
      success: false, 
      error: error.response ? error.response.data : error.message 
    };
  }
};

module.exports = {
  sendMatchNotification,
  emailConfig
}; 