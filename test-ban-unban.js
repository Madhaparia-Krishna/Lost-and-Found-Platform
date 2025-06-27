// Comprehensive test script for ban and unban functionality
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

// Configuration
const config = {
  baseUrl: 'http://localhost:5001',
  token: null,
  userId: null,
  reason: null
};

// Get security token
async function getSecurityToken() {
  try {
    console.log('Getting security token...');
    
    const email = await askQuestion('Enter security email: ');
    const password = await askQuestion('Enter security password: ');
    
    const response = await axios.post(`${config.baseUrl}/api/auth/login`, {
      email,
      password
    });
    
    if (response.data && response.data.token) {
      console.log('Security token obtained successfully!');
      config.token = response.data.token;
      return true;
    } else {
      console.error('Failed to get security token:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error getting security token:', error.response ? error.response.data : error.message);
    return false;
  }
}

// Ban user
async function banUser() {
  try {
    console.log(`\nBanning user ${config.userId} with reason: ${config.reason}`);
    
    const response = await axios.post(
      `${config.baseUrl}/api/users/${config.userId}/ban`,
      { reason: config.reason },
      {
        headers: {
          Authorization: `Bearer ${config.token}`
        }
      }
    );
    
    console.log('Ban response:', response.data);
    return response.data.success === true;
  } catch (error) {
    console.error('Error banning user:', error.response ? error.response.data : error.message);
    return false;
  }
}

// Unban user
async function unbanUser() {
  try {
    console.log(`\nUnbanning user ${config.userId}`);
    
    const response = await axios.post(
      `${config.baseUrl}/api/users/${config.userId}/unban`,
      {},
      {
        headers: {
          Authorization: `Bearer ${config.token}`
        }
      }
    );
    
    console.log('Unban response:', response.data);
    return response.data.success === true;
  } catch (error) {
    console.error('Error unbanning user:', error.response ? error.response.data : error.message);
    return false;
  }
}

// Check user status
async function checkUserStatus() {
  try {
    console.log(`\nChecking status for user ${config.userId}`);
    
    const response = await axios.get(
      `${config.baseUrl}/api/users/${config.userId}`,
      {
        headers: {
          Authorization: `Bearer ${config.token}`
        }
      }
    );
    
    console.log('User status:', response.data);
    console.log('Is banned:', response.data.is_banned ? 'YES' : 'NO');
    console.log('Ban reason:', response.data.ban_reason || 'N/A');
    
    return response.data;
  } catch (error) {
    console.error('Error checking user status:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Main function
async function main() {
  try {
    console.log('=== Ban/Unban Functionality Test ===');
    
    // Get security token
    const tokenSuccess = await getSecurityToken();
    if (!tokenSuccess) {
      console.error('Failed to get security token. Exiting...');
      return;
    }
    
    // Get user ID and reason
    config.userId = await askQuestion('Enter user ID to test ban/unban: ');
    config.reason = await askQuestion('Enter ban reason: ');
    
    // Check initial user status
    console.log('\n--- Initial User Status ---');
    const initialStatus = await checkUserStatus();
    if (!initialStatus) {
      console.error('Failed to check user status. Exiting...');
      return;
    }
    
    // Ask what to do
    const action = await askQuestion('\nWhat would you like to do? (ban/unban): ');
    
    if (action.toLowerCase() === 'ban') {
      // Ban user
      const banSuccess = await banUser();
      
      if (banSuccess) {
        console.log('\n✅ User banned successfully!');
        
        // Check user status after ban
        console.log('\n--- User Status After Ban ---');
        await checkUserStatus();
      } else {
        console.error('\n❌ Failed to ban user.');
      }
    } else if (action.toLowerCase() === 'unban') {
      // Unban user
      const unbanSuccess = await unbanUser();
      
      if (unbanSuccess) {
        console.log('\n✅ User unbanned successfully!');
        
        // Check user status after unban
        console.log('\n--- User Status After Unban ---');
        await checkUserStatus();
      } else {
        console.error('\n❌ Failed to unban user.');
      }
    } else {
      console.error('\nInvalid action. Please enter "ban" or "unban".');
    }
    
    console.log('\nTest completed.');
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    rl.close();
  }
}

// Run the test
main(); 