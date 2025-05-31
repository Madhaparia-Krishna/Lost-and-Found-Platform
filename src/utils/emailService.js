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

export default {
  initEmailJS,
  sendMatchNotification,
  sendPasswordResetEmail,
  sendClaimNotification
};