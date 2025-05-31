// Email service configuration
const emailConfig = {
  serviceId: "service_1b8c1on", // EmailJS service ID
  publicKey: "pDF979lgKSH6M7p8y", // EmailJS public key
  templates: {
    matchNotification: "template_cnjtyil", // Match notification template
    passwordReset: "template_fqz7o43"     // Password reset template
  }
};

// API configuration
const apiConfig = {
  baseUrl: "http://localhost:5000",
};

export { emailConfig, apiConfig }; 