// Server-side email utility for sending test emails
require('dotenv').config();
const axios = require('axios');

// Email configuration 
const emailConfig = {
  serviceId: "service_1b8c1on", // EmailJS service ID
  publicKey: "pDF979lgKSH6M7p8y", // EmailJS public key
  templates: {
    matchNotification: "template_cnjtyil", // Match notification template
    passwordReset: "template_fqz7o43",    // Password reset template
    accountBlocked: "template_cnjtyil",   // Account blocked template (using match template for now)
    itemReturned: "template_cnjtyil",     // Item returned template (using match template for now)
    requestApproved: "template_cnjtyil"   // Request approved template (using match template for now)
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

// Send password reset email
const sendPasswordReset = async (userEmail, userName, resetToken, resetLink) => {
  try {
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Build parameters for template
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: "You requested a password reset for your account.",
      reset_link: resetLink,
      token: resetToken,
      expiry: "24 hours"
    };

    console.log('Sending password reset with params:', templateParams);

    // Make direct API call to EmailJS
    const response = await axios({
      method: 'post',
      url: 'https://api.emailjs.com/api/v1.0/email/send',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templates.passwordReset,
        user_id: emailConfig.publicKey,
        template_params: templateParams
      })
    });
    
    console.log('Password reset email sent!', response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error('Error sending password reset:', error.response ? error.response.data : error.message);
    return { 
      success: false, 
      error: error.response ? error.response.data : error.message 
    };
  }
};

// Send account blocked notification
const sendAccountBlockedNotification = async (userEmail, userName, reason) => {
  try {
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Build parameters for template
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: `Your account has been blocked.`,
      item_title: "Account Status Update",
      category: "Account",
      date: now.toLocaleDateString(),
      match_link: `mailto:support@university.edu?subject=Account%20Block%20Appeal`
    };

    console.log('Sending account blocked notification with params:', templateParams);

    // Make direct API call to EmailJS
    const response = await axios({
      method: 'post',
      url: 'https://api.emailjs.com/api/v1.0/email/send',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templates.accountBlocked,
        user_id: emailConfig.publicKey,
        template_params: templateParams
      })
    });
    
    console.log('Account blocked notification email sent!', response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error('Error sending account blocked notification:', error.response ? error.response.data : error.message);
    return { 
      success: false, 
      error: error.response ? error.response.data : error.message 
    };
  }
};

// Send account unblocked notification
const sendAccountUnblockedNotification = async (userEmail, userName) => {
  try {
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Build parameters for template
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: `Your account has been unblocked. You can now log in and use the system again.`,
      item_title: "Account Status Update",
      category: "Account",
      date: now.toLocaleDateString(),
      match_link: `http://localhost:3000/login`
    };

    console.log('Sending account unblocked notification with params:', templateParams);

    // Make direct API call to EmailJS
    const response = await axios({
      method: 'post',
      url: 'https://api.emailjs.com/api/v1.0/email/send',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templates.accountBlocked, // Reusing the same template
        user_id: emailConfig.publicKey,
        template_params: templateParams
      })
    });
    
    console.log('Account unblocked notification email sent!', response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error('Error sending account unblocked notification:', error.response ? error.response.data : error.message);
    return { 
      success: false, 
      error: error.response ? error.response.data : error.message 
    };
  }
};

// Send item returned notification
const sendItemReturnedNotification = async (userEmail, userName, itemTitle, itemId) => {
  try {
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Build parameters for template
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: `Your item "${itemTitle}" has been returned to its owner.`,
      item_title: itemTitle,
      category: "Returned Items",
      date: now.toLocaleDateString(),
      match_link: `http://localhost:3000/items/${itemId}`
    };

    console.log('Sending item returned notification with params:', templateParams);

    // Make direct API call to EmailJS
    const response = await axios({
      method: 'post',
      url: 'https://api.emailjs.com/api/v1.0/email/send',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templates.itemReturned,
        user_id: emailConfig.publicKey,
        template_params: templateParams
      })
    });
    
    console.log('Item returned notification email sent!', response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error('Error sending item returned notification:', error.response ? error.response.data : error.message);
    return { 
      success: false, 
      error: error.response ? error.response.data : error.message 
    };
  }
};

// Send request approved notification
const sendRequestApprovedNotification = async (userEmail, userName, itemTitle, itemId) => {
  try {
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Build parameters for template
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: `Your request for item "${itemTitle}" has been approved. Please visit the security office to claim it.`,
      item_title: itemTitle,
      category: "Approved Requests",
      date: now.toLocaleDateString(),
      match_link: `http://localhost:3000/items/${itemId}`
    };

    console.log('Sending request approved notification with params:', templateParams);

    // Make direct API call to EmailJS
    const response = await axios({
      method: 'post',
      url: 'https://api.emailjs.com/api/v1.0/email/send',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templates.requestApproved,
        user_id: emailConfig.publicKey,
        template_params: templateParams
      })
    });
    
    console.log('Request approved notification email sent!', response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error('Error sending request approved notification:', error.response ? error.response.data : error.message);
    return { 
      success: false, 
      error: error.response ? error.response.data : error.message 
    };
  }
};

module.exports = {
  sendMatchNotification,
  sendPasswordReset,
  sendAccountBlockedNotification,
  sendAccountUnblockedNotification,
  sendItemReturnedNotification,
  sendRequestApprovedNotification,
  emailConfig
}; 