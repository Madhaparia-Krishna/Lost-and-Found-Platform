// Script to add more detailed logging for email notifications in server.js
const fs = require('fs');
const path = require('path');

console.log('Adding detailed email logging to server.js...');

// Read the server.js file
const serverFilePath = path.join(__dirname, 'server.js');
let serverContent = fs.readFileSync(serverFilePath, 'utf8');

// Add more detailed logging for ban notification emails
const banEmailPattern = /\/\/ Send email notification to the banned user\s+try\s+\{\s+const emailService = require\(['"]\.\/server-email-nodemailer['"]\);\s+await emailService\.sendAccountBlockedNotification\(user\.email, user\.name, reason\);\s+console\.log\(`Ban notification email sent to \${user\.email}`\);/g;

const banEmailReplacement = `// Send email notification to the banned user
    try {
      console.log('\\n==== SENDING BAN EMAIL NOTIFICATION ====');
      console.log('User email:', user.email);
      console.log('User name:', user.name);
      console.log('Ban reason:', reason);
      
      const emailService = require('./server-email-nodemailer');
      const emailResult = await emailService.sendAccountBlockedNotification(user.email, user.name, reason);
      
      if (emailResult.success) {
        console.log('Ban notification email sent successfully!');
        console.log('Message ID:', emailResult.messageId);
      } else {
        console.error('Failed to send ban notification email:', emailResult.error);
      }
      console.log('========================================\\n');`;

// Add more detailed logging for unban notification emails
const unbanEmailPattern = /\/\/ Send email notification to the unbanned user\s+try\s+\{\s+const emailService = require\(['"]\.\/server-email-nodemailer['"]\);\s+await emailService\.sendAccountUnblockedNotification\(user\.email, user\.name\);\s+console\.log\(`Unban notification email sent to \${user\.email}`\);/g;

const unbanEmailReplacement = `// Send email notification to the unbanned user
    try {
      console.log('\\n==== SENDING UNBAN EMAIL NOTIFICATION ====');
      console.log('User email:', user.email);
      console.log('User name:', user.name);
      
      const emailService = require('./server-email-nodemailer');
      const emailResult = await emailService.sendAccountUnblockedNotification(user.email, user.name);
      
      if (emailResult.success) {
        console.log('Unban notification email sent successfully!');
        console.log('Message ID:', emailResult.messageId);
      } else {
        console.error('Failed to send unban notification email:', emailResult.error);
      }
      console.log('==========================================\\n');`;

// Replace the patterns
serverContent = serverContent.replace(banEmailPattern, banEmailReplacement);
serverContent = serverContent.replace(unbanEmailPattern, unbanEmailReplacement);

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, serverContent);

console.log('Added detailed email logging to server.js successfully!');
console.log('Restart the server to apply the changes.'); 