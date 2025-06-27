// Test script for security user ban function
require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get user input
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

// Main function
async function testSecurityBan() {
  try {
    console.log('===== SECURITY BAN FUNCTION TEST =====');
    
    // Get security token
    const token = await askQuestion('Enter security user token: ');
    if (!token || token.length < 10) {
      console.error('Invalid token provided. Please provide a valid JWT token.');
      return;
    }
    
    // Get user ID to ban
    const userId = await askQuestion('Enter user ID to ban: ');
    if (!userId) {
      console.error('Invalid user ID provided.');
      return;
    }
    
    // Get ban reason
    const reason = await askQuestion('Enter ban reason: ');
    if (!reason) {
      console.error('Ban reason is required.');
      return;
    }
    
    console.log('\nTesting ban function with security token...');
    console.log('User ID:', userId);
    console.log('Reason:', reason);
    
    // Make the API call to ban the user
    const banResponse = await axios({
      method: 'put',
      url: `http://localhost:5000/api/security/users/${userId}/ban`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        reason: reason
      }
    });
    
    console.log('\nBan Response:', banResponse.data);
    console.log('Ban function test: PASSED');
    
    // Ask if user wants to unban
    const shouldUnban = await askQuestion('\nDo you want to test unban function? (y/n): ');
    
    if (shouldUnban.toLowerCase() === 'y') {
      console.log('\nTesting unban function with security token...');
      
      // Make the API call to unban the user
      const unbanResponse = await axios({
        method: 'put',
        url: `http://localhost:5000/api/security/users/${userId}/unban`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Unban Response:', unbanResponse.data);
      console.log('Unban function test: PASSED');
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\nError during test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    console.log('Test failed.');
  } finally {
    rl.close();
  }
}

// Run the test
testSecurityBan().catch(err => {
  console.error('Unhandled error:', err);
  rl.close();
}); 