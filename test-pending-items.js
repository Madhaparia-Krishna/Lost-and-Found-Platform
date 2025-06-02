const axios = require('axios');
const fs = require('fs');

async function testPendingItemsAPI() {
  try {
    // Try to read token from auth-token.json
    let token = null;
    try {
      if (fs.existsSync('./auth-token.json')) {
        const tokenData = JSON.parse(fs.readFileSync('./auth-token.json', 'utf8'));
        token = tokenData.token;
        console.log('Found token in auth-token.json');
      }
    } catch (err) {
      console.error('Error reading token file:', err);
    }
    
    // If no token found, use a placeholder
    if (!token) {
      console.log('No token found. Using placeholder - this will likely fail');
      token = 'YOUR_SECURITY_USER_TOKEN_HERE';
    }
    
    console.log('Testing /api/security/pending-items endpoint...');
    
    try {
      const response = await axios.get('http://localhost:5000/api/security/pending-items', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('API Response Status:', response.status);
      console.log('API Response Data:', response.data);
      
      // Check if there are any pending found items
      const pendingFoundItems = Array.isArray(response.data) ? 
        response.data.filter(item => item.status === 'found' && (item.is_approved === false || item.is_approved === 0)) :
        [];
      
      console.log(`\nFound ${pendingFoundItems.length} pending found items:`);
      pendingFoundItems.forEach(item => {
        console.log(`ID: ${item.id}, Title: ${item.title}, Status: ${item.status}, Approved: ${item.is_approved}`);
      });
      
      // Check for data structure issues
      console.log('\nAPI Response Analysis:');
      if (!Array.isArray(response.data)) {
        console.error('❌ API response is not an array! Actual type:', typeof response.data);
        if (typeof response.data === 'object') {
          console.log('Response object keys:', Object.keys(response.data));
        }
      } else {
        console.log('✅ API response is an array with', response.data.length, 'items');
        
        // Check first item structure if available
        if (response.data.length > 0) {
          const firstItem = response.data[0];
          console.log('Sample item structure:', Object.keys(firstItem).join(', '));
          console.log('Sample item is_approved:', firstItem.is_approved, '(type:', typeof firstItem.is_approved, ')');
        }
      }
      
    } catch (apiError) {
      console.error('API request failed:', apiError.message);
      if (apiError.response) {
        console.error('Response status:', apiError.response.status);
        console.error('Response data:', apiError.response.data);
      }
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

testPendingItemsAPI(); 