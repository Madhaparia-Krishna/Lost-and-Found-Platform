// This is a diagnostic script that you can run to check if localStorage is working properly
// Use with caution: this is for development testing only

function checkAuth() {
  console.log('Checking auth state...');
  
  // Test if localStorage is accessible
  try {
    localStorage.setItem('test-key', 'test-value');
    console.log('✅ localStorage write test: PASSED');
    
    const value = localStorage.getItem('test-key');
    if (value === 'test-value') {
      console.log('✅ localStorage read test: PASSED');
    } else {
      console.error('❌ localStorage read test: FAILED - wrong value returned');
    }
    
    localStorage.removeItem('test-key');
    console.log('✅ localStorage remove test: PASSED');
  } catch (error) {
    console.error('❌ localStorage test: FAILED with error:', error);
  }
  
  // Check current user data
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      console.log('🔍 Current user in localStorage:', JSON.parse(userData));
    } else {
      console.log('ℹ️ No user data in localStorage');
    }
  } catch (error) {
    console.error('❌ Error reading user data:', error);
  }
  
  // Test a sample login
  try {
    const testUser = {
      id: 'test-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    };
    
    console.log('Setting test user...');
    localStorage.setItem('user', JSON.stringify(testUser));
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.id === testUser.id) {
        console.log('✅ User storage test: PASSED');
      } else {
        console.error('❌ User storage test: FAILED - wrong data returned');
      }
    } else {
      console.error('❌ User storage test: FAILED - no data returned');
    }
    
    // Clean up test
    localStorage.removeItem('user');
    console.log('✅ Test cleanup complete');
  } catch (error) {
    console.error('❌ User storage test: FAILED with error:', error);
  }
}

// Run the test
checkAuth();

// How to use this script:
// 1. Open your browser's developer console
// 2. Copy and paste this entire script
// 3. Watch the output to diagnose any localStorage issues 