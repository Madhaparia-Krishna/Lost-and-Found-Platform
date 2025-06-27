const fs = require('fs');

// Create the updated .env content
const envContent = `EMAIL_SERVICE=gmail
EMAIL_USER=madhapariakrishna@gmail.com
EMAIL_PASS=nahejahqilhuhmez
FRONTEND_URL=http://localhost:3000
SEND_MATCH_EMAILS=true`;

// Write to the .env file
fs.writeFileSync('.env', envContent);

console.log('.env file updated successfully!'); 