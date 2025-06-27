// Test script for ban function
require('dotenv').config();
const axios = require('axios');

// Get auth token from command line or use default
const token = process.argv[2] || 'your-auth-token';

// Test user ID to ban/unban
const userId = process.argv[3] || '2';

async function testBanFunction() {
  try {
    console.log('Testing ban function...');
    console.log('Using token:', token.substring(0, 10) + '...');
    console.log('User ID to ban:', userId);
    
    const response = await axios({
      method: 'put',
      url: 'http://localhost:5000/api/security/users/' + userId + '/ban',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      data: {
        reason: 'Testing ban function'
      }
    });
    
    console.log('Ban response:', response.data);
    return true;
  } catch (error) {
    console.error('Error testing ban function:', error.response?.data || error.message);
    return false;
  }
}

async function testUnbanFunction() {
  try {
    console.log('\nTesting unban function...');
    console.log('Using token:', token.substring(0, 10) + '...');
    console.log('User ID to unban:', userId);
    
    const response = await axios({
      method: 'put',
      url: 'http://localhost:5000/api/security/users/' + userId + '/unban',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Unban response:', response.data);
    return true;
  } catch (error) {
    console.error('Error testing unban function:', error.response?.data || error.message);
    return false;
  }
}

// Run the tests
async function runTests() {
  console.log('Starting ban/unban function tests...');
  
  // Test ban function
  const banResult = await testBanFunction();
  console.log('Ban function test:', banResult ? 'PASSED' : 'FAILED');
  
  if (banResult) {
    // Wait 2 seconds before testing unban
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test unban function
    const unbanResult = await testUnbanFunction();
    console.log('Unban function test:', unbanResult ? 'PASSED' : 'FAILED');
  }
  
  console.log('\nTests completed.');
}

runTests().catch(err => {
  console.error('Test error:', err);
});