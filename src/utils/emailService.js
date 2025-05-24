import emailjs from '@emailjs/browser';

// Initialize EmailJS with your service ID
emailjs.init({
  publicKey: "pDF979lgKSH6M7p8y",
  limitRate: true // Enable rate limiting
});

// Your EmailJS service ID from the dashboard
const SERVICE_ID = "service_1b8c1on";

// Email templates - Replace these with your actual template IDs from EmailJS dashboard
export const EMAIL_TEMPLATES = {
  PASSWORD_RESET: "template_fqz7o43", // Replace with your actual template ID
  ITEM_CLAIMED: "template_item_claimed",
  CLAIM_APPROVED: "template_claim_approved",
  CLAIM_REJECTED: "template_claim_rejected"
};

// Function to send emails
export const sendEmail = async (templateId, templateParams) => {
  try {
    console.log('Sending email with params:', {
      serviceId: SERVICE_ID,
      templateId,
      templateParams
    });

    // Ensure required parameters are present
    if (!templateParams.email) {
      throw new Error('Recipient email address is required');
    }

    const response = await emailjs.send(
      SERVICE_ID,
      templateId,
      templateParams
    );
    
    console.log('Email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('EmailJS error details:', {
      status: error.status,
      text: error.text,
      serviceId: SERVICE_ID,
      templateId,
      templateParams
    });
    return { success: false, error };
  }
};

// Email template parameters builder
export const buildEmailParams = {
  passwordReset: (userName, resetLink, userEmail) => ({
    name: userName || 'User',
    reset_link: resetLink,
    email: userEmail
  }),
  
  itemClaimed: (itemTitle, claimerName, itemDetails, userEmail) => ({
    name: '', // Will be set by EmailJS template
    item_title: itemTitle,
    claimer_name: claimerName,
    item_details: itemDetails,
    email: userEmail
  }),
  
  claimApproved: (userName, itemTitle, userEmail) => ({
    name: userName,
    item_title: itemTitle,
    email: userEmail
  }),
  
  claimRejected: (userName, itemTitle, userEmail) => ({
    name: userName,
    item_title: itemTitle,
    email: userEmail
  })
};