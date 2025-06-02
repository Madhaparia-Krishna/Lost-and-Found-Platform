// Script to check the current user's authentication status and role
// This script should be run in the browser console when logged in

(function checkAuth() {
  try {
    // Check if there's a user in localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      console.log('No user data found in localStorage. Please log in first.');
      return;
    }
    
    // Parse user data
    const user = JSON.parse(userData);
    console.log('Current user:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    
    // Check if the user has the security role
    if (user.role === 'security' || user.role === 'admin') {
      console.log('✅ User has security permissions. Should be able to see the Security Dashboard.');
    } else {
      console.log('❌ User does NOT have security permissions. Cannot access Security Dashboard.');
      console.log('Current role:', user.role);
      console.log('Required roles: security or admin');
    }
    
    // Check if token exists
    if (user.token) {
      console.log('✅ Authentication token exists');
      
      // Check token expiration
      try {
        const tokenParts = user.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expTime = new Date(payload.exp * 1000);
          const now = new Date();
          
          if (expTime > now) {
            console.log(`✅ Token is valid until: ${expTime.toLocaleString()}`);
          } else {
            console.log(`❌ Token expired at: ${expTime.toLocaleString()}`);
          }
        }
      } catch (e) {
        console.log('Could not decode token expiration');
      }
    } else {
      console.log('❌ No authentication token found');
    }
    
    console.log('\nInstructions:');
    console.log('1. If you don\'t have security permissions, log out and log in as a security user');
    console.log('2. If your token is expired, log out and log back in');
    console.log('3. After logging in, refresh the Security Dashboard page');
    
  } catch (error) {
    console.error('Error checking authentication:', error);
  }
})(); 