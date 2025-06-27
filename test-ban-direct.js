// Test script for ban function
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

// Get security token
async function getSecurityToken() {
  try {
    console.log('Getting security token...');
    
    const email = await askQuestion('Enter security email: ');
    const password = await askQuestion('Enter security password: ');
    
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email,
      password
    });
    
    if (response.data && response.data.token) {
      console.log('Security token obtained successfully!');
      return response.data.token;
    } else {
      console.error('Failed to get security token:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error getting security token:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Ban user
async function banUser(token, userId, reason) {
  try {
    console.log(`Banning user ${userId} with reason: ${reason}`);
    
    const response = await axios.post(
      `http://localhost:5001/api/users/${userId}/ban`,
      { reason },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log('Ban response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error banning user:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Main function
async function main() {
  try {
    console.log('=== Ban Function Test ===');
    
    // Get security token
    const token = await getSecurityToken();
    if (!token) {
      console.error('Failed to get security token. Exiting...');
      return;
    }
    
    // Get user ID and reason
    const userId = await askQuestion('Enter user ID to ban: ');
    const reason = await askQuestion('Enter ban reason: ');
    
    // Ban user
    const result = await banUser(token, userId, reason);
    
    if (result && result.success) {
      console.log('\nUser banned successfully!');
    } else {
      console.error('\nFailed to ban user.');
    }
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    rl.close();
  }
}

// Run the test
main(); 