import emailjs from '@emailjs/browser';
import { emailConfig } from '../config';

// Initialize EmailJS with your public key
const initEmailJS = () => {
  try {
    emailjs.init(emailConfig.publicKey);
    console.log('EmailJS initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing EmailJS:', error);
    return false;
  }
};

// Send a match notification email
export const sendMatchNotification = async (userEmail, userName, itemTitle, matchId, additionalData = {}) => {
  try {
    // Make sure EmailJS is initialized
    initEmailJS();
    
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
      match_link: `${window.location.origin}/matches/${matchId}`
    };

    console.log('Sending match notification with params:', templateParams);

    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.matchNotification,
      templateParams
    );
    
    console.log('Match notification email sent!', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending match notification:', error);
    return { success: false, error };
  }
};

// Send a password reset notification
export const sendPasswordResetEmail = async (userEmail, userName, resetLink) => {
  try {
    // Make sure EmailJS is initialized
    initEmailJS();
    
    // Build parameters for template_fqz7o43
    const templateParams = {
      email: userEmail,  // This is what the template expects
      name: userName || 'User',
      reset_link: resetLink
    };

    console.log('Sending password reset email with params:', templateParams);

    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.passwordReset,
      templateParams
    );
    
    console.log('Password reset email sent!', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error };
  }
};

// Send a claim notification
export const sendClaimNotification = async (userEmail, userName, itemTitle, status, additionalData = {}) => {
  try {
    // Make sure EmailJS is initialized
    initEmailJS();
    
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Build parameters for template_cnjtyil (reusing match notification template)
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: `Your claim for item "${itemTitle}" has been ${status}.`,
      item_title: itemTitle,
      category: additionalData.category || 'Not specified',
      date: now.toLocaleDateString(),
      match_link: `${window.location.origin}/items`
    };

    console.log('Sending claim notification with params:', templateParams);

    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.matchNotification,
      templateParams
    );
    
    console.log('Claim notification email sent!', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending claim notification:', error);
    return { success: false, error };
  }
};

// Send account blocked notification
export const sendAccountBlockedNotification = async (userEmail, userName, reason) => {
  try {
    // Make sure EmailJS is initialized
    initEmailJS();
    
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Build parameters for template
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: `Your account has been blocked. Reason: ${reason || 'Policy violation'}`,
      item_title: "Account Status Update",
      category: "Account",
      date: now.toLocaleDateString(),
      match_link: `mailto:support@university.edu?subject=Account%20Block%20Appeal`
    };

    console.log('Sending account blocked notification with params:', templateParams);

    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.matchNotification, // Reusing the match template
      templateParams
    );
    
    console.log('Account blocked notification email sent!', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending account blocked notification:', error);
    return { success: false, error };
  }
};

// Send item returned notification
export const sendItemReturnedNotification = async (userEmail, userName, itemTitle, itemId) => {
  try {
    // Make sure EmailJS is initialized
    initEmailJS();
    
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
      match_link: `${window.location.origin}/items/${itemId}`
    };

    console.log('Sending item returned notification with params:', templateParams);

    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.matchNotification, // Reusing the match template
      templateParams
    );
    
    console.log('Item returned notification email sent!', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending item returned notification:', error);
    return { success: false, error };
  }
};

// Send request approved notification
export const sendRequestApprovedNotification = async (userEmail, userName, itemTitle, itemId) => {
  try {
    // Make sure EmailJS is initialized
    initEmailJS();
    
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
      match_link: `${window.location.origin}/items/${itemId}`
    };

    console.log('Sending request approved notification with params:', templateParams);

    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.matchNotification, // Reusing the match template
      templateParams
    );
    
    console.log('Request approved notification email sent!', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending request approved notification:', error);
    return { success: false, error };
  }
};

// Send potential matches email notification
export const sendPotentialMatchesEmail = async (userEmail, userName, itemType, matches) => {
  try {
    // Make sure EmailJS is initialized
    initEmailJS();
    
    // Format current time
    const now = new Date();
    const formattedTime = now.toLocaleString();
    
    // Format matches for email
    const matchesText = matches.map((match, index) => 
      `${index + 1}. ${match.title} (${match.category}) - Found at ${match.location} on ${match.date}`
    ).join('\n');
    
    // Build parameters for template
    const templateParams = {
      to_email: userEmail,
      name: "Lost & Found System",
      user_name: userName,
      time: formattedTime,
      message: `We found ${matches.length} potential ${itemType === 'lost' ? 'found' : 'lost'} items that may match your ${itemType} item report based on your email.`,
      item_title: `${matches.length} Potential Matches Found`,
      category: "Email Matches",
      date: now.toLocaleDateString(),
      match_link: `${window.location.origin}/items`,
      additional_info: matchesText
    };

    console.log('Sending potential matches email with params:', templateParams);

    const response = await emailjs.send(
      emailConfig.serviceId,
      emailConfig.templates.matchNotification, // Reusing the match template
      templateParams
    );
    
    console.log('Potential matches email sent!', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending potential matches email:', error);
    return { success: false, error };
  }
};

export default {
  initEmailJS,
  sendMatchNotification,
  sendPasswordResetEmail,
  sendClaimNotification,
  sendAccountBlockedNotification,
  sendItemReturnedNotification,
  sendRequestApprovedNotification,
  sendPotentialMatchesEmail
};