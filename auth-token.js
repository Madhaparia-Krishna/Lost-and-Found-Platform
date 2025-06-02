// This script helps extract the security user token from localStorage
// Run this in your browser console when logged in as a security user

(function() {
  try {
    const userData = localStorage.getItem('user');
    if (!userData) {
      console.log('No user data found in localStorage. Please log in as a security user.');
      return;
    }
    
    const user = JSON.parse(userData);
    if (!user.token) {
      console.log('No token found in user data. Please log out and log in again.');
      return;
    }
    
    console.log('Your security user token:');
    console.log(user.token);
    console.log('\nCopy this token and paste it in auth-token.json');
    
    // Create a text element to make copying easier
    const textArea = document.createElement('textarea');
    textArea.value = user.token;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    console.log('Token copied to clipboard!');
  } catch (error) {
    console.error('Error extracting token:', error);
  }
})(); 