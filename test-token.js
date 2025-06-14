const fs = require('fs');
const axios = require('axios');

async function testToken() {
  try {
    // Read the token from auth-token.json
    const authTokenData = JSON.parse(fs.readFileSync('./auth-token.json', 'utf8'));
    const token = authTokenData.token;
    
    console.log('Using token:', token);
    
    // Test the token with a protected endpoint
    const response = await axios.get('http://localhost:5000/api/verify-token', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Token verification successful:');
    console.log(response.data);
  } catch (error) {
    console.error('Error testing token:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the function
testToken(); 