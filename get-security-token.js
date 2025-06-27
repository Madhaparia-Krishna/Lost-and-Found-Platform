// Helper script to get a security token for testing
require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get user input
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getSecurityToken() {
  try {
    console.log('=== Security Token Generator ===');
    
    // Get login credentials
    const email = await askQuestion('Enter security user email: ');
    const password = await askQuestion('Enter security user password: ');
    
    if (!email || !password) {
      console.error('Email and password are required');
      return null;
    }
    
    console.log('\nAttempting to log in...');
    
    // Make the login request
    const response = await axios({
      method: 'post',
      url: 'http://localhost:5000/api/auth/login',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        email,
        password
      }
    });
    
    if (response.data && response.data.token) {
      console.log('\nLogin successful!');
      console.log('User role:', response.data.role);
      console.log('User name:', response.data.name);
      
      // Check if the user is a security user
      if (response.data.role !== 'security' && response.data.role !== 'admin') {
        console.error('\nWarning: The user is not a security or admin user. Token may not work for security operations.');
      }
      
      console.log('\n=== TOKEN ===');
      console.log(response.data.token);
      console.log('============');
      
      console.log('\nYou can use this token for testing security operations.');
      console.log('Example: node test-ban-direct.js YOUR_TOKEN_HERE');
      
      return response.data.token;
    } else {
      console.error('\nLogin failed: No token received');
      return null;
    }
  } catch (error) {
    console.error('\nError getting security token:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Error message:', error.message);
    }
    
    return null;
  } finally {
    rl.close();
  }
}

// Run the function
getSecurityToken()
  .then(token => {
    if (!token) {
      console.error('\nFailed to get security token');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 