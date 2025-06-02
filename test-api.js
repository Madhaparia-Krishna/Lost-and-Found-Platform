const axios = require('axios');
const fs = require('fs');

// Function to get auth token from localStorage or a file
async function getAuthToken() {
  try {
    // Try to read from a token file if it exists
    if (fs.existsSync('./auth-token.json')) {
      const tokenData = JSON.parse(fs.readFileSync('./auth-token.json', 'utf8'));
      return tokenData.token;
    }
    
    console.log('No auth token found. Please create auth-token.json with your security user token.');
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Test the pending items API
async function testPendingItemsAPI() {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('Please create a file named auth-token.json with content: { "token": "YOUR_SECURITY_USER_TOKEN" }');
      return;
    }
    
    console.log('Testing /api/security/pending-items endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/security/pending-items', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Check if there are any pending found items
    const pendingFoundItems = response.data.filter(item => 
      item.status === 'found' && item.is_approved === 0
    );
    
    console.log(`\nFound ${pendingFoundItems.length} pending found items:`);
    pendingFoundItems.forEach(item => {
      console.log(`ID: ${item.id}, Title: ${item.title}, Status: ${item.status}, Approved: ${item.is_approved}`);
    });
    
  } catch (error) {
    console.error('Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testPendingItemsAPI(); 