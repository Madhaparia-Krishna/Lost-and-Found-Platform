// Mobile Mockups - Shared JavaScript
// Navigation, State Management, and Interactivity

class MobileApp {
  constructor() {
    this.currentUser = null;
    this.isLoggedIn = false;
    this.currentPage = '';
    this.lostItems = [];
    this.foundItems = [];
    this.users = [];
    this.notifications = [];
    
    this.init();
  }

  init() {
    // Load saved state from localStorage
    this.loadState();
    
    // Set up navigation handlers
    this.setupNavigation();
    
    // Update current page based on URL
    this.updateCurrentPage();
    
    // Generate dummy data if needed
    this.generateDummyData();
  }

  // State Management
  loadState() {
    const savedUser = localStorage.getItem('mobile_current_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.isLoggedIn = true;
    }

    const savedLostItems = localStorage.getItem('mobile_lost_items');
    if (savedLostItems) {
      this.lostItems = JSON.parse(savedLostItems);
    }

    const savedFoundItems = localStorage.getItem('mobile_found_items');
    if (savedFoundItems) {
      this.foundItems = JSON.parse(savedFoundItems);
    }
  }

  saveState() {
    if (this.currentUser) {
      localStorage.setItem('mobile_current_user', JSON.stringify(this.currentUser));
    }
    localStorage.setItem('mobile_lost_items', JSON.stringify(this.lostItems));
    localStorage.setItem('mobile_found_items', JSON.stringify(this.foundItems));
  }

  // Navigation
  setupNavigation() {
    document.addEventListener('DOMContentLoaded', () => {
      // Handle all navigation links
      document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-navigate]');
        if (link) {
          e.preventDefault();
          const page = link.getAttribute('data-navigate');
          this.navigateTo(page);
        }

        // Handle back buttons
        const backBtn = e.target.closest('.app-bar-back');
        if (backBtn) {
          e.preventDefault();
          this.goBack();
        }
      });

      // Handle form submissions
      document.addEventListener('submit', (e) => {
        const form = e.target.closest('form');
        if (form) {
          e.preventDefault();
          this.handleFormSubmission(form);
        }
      });
    });
  }

  navigateTo(page) {
    // Check authentication requirements
    const protectedPages = ['dashboard', 'profile', 'lost-form', 'found-form', 'security-dashboard', 'admin-dashboard'];
    
    if (protectedPages.includes(page) && !this.isLoggedIn) {
      this.navigateTo('auth');
      return;
    }

    // Update URL and load page
    window.location.href = `${page}.html`;
  }

  goBack() {
    window.history.back();
  }

  updateCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '') || 'welcome';
    this.currentPage = page;
    
    // Update status bar time
    this.updateStatusBar();
  }

  updateStatusBar() {
    const timeElement = document.querySelector('.status-time');
    if (timeElement) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      timeElement.textContent = timeString;
    }
  }

  // Authentication
  login(email, password) {
    // Simple mock authentication
    if (email && password) {
      this.currentUser = {
        id: 1,
        name: email.split('@')[0].replace(/\d+/g, '').replace(/\./g, ' '),
        email: email,
        role: email.includes('admin') ? 'admin' : email.includes('security') ? 'security' : 'user',
        admission_number: 'ST/2021/001',
        faculty_school: 'School of Engineering',
        year_of_study: '3',
        phone_number: '+254 700 123 456'
      };
      this.isLoggedIn = true;
      this.saveState();
      
      // Navigate to dashboard
      this.navigateTo('dashboard');
      return true;
    }
    return false;
  }

  register(name, email, password, confirmPassword) {
    if (name && email && password && password === confirmPassword) {
      return this.login(email, password);
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    this.isLoggedIn = false;
    localStorage.removeItem('mobile_current_user');
    this.navigateTo('auth');
  }

  // Form Handling
  handleFormSubmission(form) {
    const formType = form.getAttribute('data-form-type');
    
    switch (formType) {
      case 'login':
        this.handleLoginForm(form);
        break;
      case 'register':
        this.handleRegisterForm(form);
        break;
      case 'lost-item':
        this.handleLostItemForm(form);
        break;
      case 'found-item':
        this.handleFoundItemForm(form);
        break;
      case 'profile':
        this.handleProfileForm(form);
        break;
      default:
        this.showMessage('Form submitted successfully!', 'success');
    }
  }

  handleLoginForm(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    
    if (this.login(email, password)) {
      this.showMessage('Login successful!', 'success');
    } else {
      this.showMessage('Invalid email or password', 'error');
    }
  }

  handleRegisterForm(form) {
    const formData = new FormData(form);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (this.register(name, email, password, confirmPassword)) {
      this.showMessage('Registration successful!', 'success');
    } else {
      this.showMessage('Registration failed. Please check your details.', 'error');
    }
  }

  handleLostItemForm(form) {
    const formData = new FormData(form);
    const item = {
      id: Date.now(),
      title: formData.get('title'),
      category: formData.get('category'),
      subcategory: formData.get('subcategory') || '',
      location: formData.get('location'),
      date: formData.get('date'),
      description: formData.get('description'),
      status: 'lost',
      userId: this.currentUser?.id,
      reporterName: this.currentUser?.name || 'Anonymous',
      createdAt: new Date().toISOString()
    };
    
    this.lostItems.push(item);
    this.saveState();
    
    // Show success message and redirect
    this.showMessage('Lost item reported successfully!', 'success');
    setTimeout(() => {
      this.navigateTo('dashboard');
    }, 2000);
  }

  handleFoundItemForm(form) {
    const formData = new FormData(form);
    const item = {
      id: Date.now(),
      title: formData.get('title'),
      category: formData.get('category'),
      subcategory: formData.get('subcategory') || '',
      location: formData.get('location'),
      date: formData.get('date'),
      description: formData.get('description'),
      status: 'found',
      userId: this.currentUser?.id,
      reporterName: this.currentUser?.name || 'Anonymous',
      isApproved: false,
      createdAt: new Date().toISOString()
    };
    
    this.foundItems.push(item);
    this.saveState();
    
    this.showMessage('Found item reported successfully! Awaiting approval.', 'success');
    setTimeout(() => {
      this.navigateTo('dashboard');
    }, 2000);
  }

  handleProfileForm(form) {
    const formData = new FormData(form);
    
    if (this.currentUser) {
      this.currentUser.name = formData.get('name') || this.currentUser.name;
      this.currentUser.admission_number = formData.get('admission_number') || this.currentUser.admission_number;
      this.currentUser.faculty_school = formData.get('faculty_school') || this.currentUser.faculty_school;
      this.currentUser.year_of_study = formData.get('year_of_study') || this.currentUser.year_of_study;
      this.currentUser.phone_number = formData.get('phone_number') || this.currentUser.phone_number;
      
      this.saveState();
      this.showMessage('Profile updated successfully!', 'success');
    }
  }

  // UI Helpers
  showMessage(message, type = 'info') {
    // Create or update message element
    let messageEl = document.querySelector('.app-message');
    
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.className = 'app-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 90%;
        text-align: center;
        animation: slideDown 0.3s ease-out;
      `;
      document.body.appendChild(messageEl);
    }
    
    // Set message and style based on type
    messageEl.textContent = message;
    messageEl.className = `app-message ${type}`;
    
    const colors = {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3'
    };
    
    messageEl.style.backgroundColor = colors[type] || colors.info;
    messageEl.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }

  showLoading(show = true) {
    let loader = document.querySelector('.app-loader');
    
    if (show && !loader) {
      loader = document.createElement('div');
      loader.className = 'app-loader';
      loader.innerHTML = `
        <div class="spinner"></div>
        <div>Loading...</div>
      `;
      loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 20000;
      `;
      document.body.appendChild(loader);
    } else if (!show && loader) {
      loader.remove();
    }
  }

  // Dummy Data Generation
  generateDummyData() {
    // Generate dummy lost items if none exist
    if (this.lostItems.length === 0) {
      this.lostItems = [
        {
          id: 1,
          title: 'Blue iPhone 13',
          category: 'Electronics',
          subcategory: 'Phones',
          location: 'Library',
          date: '2024-01-15',
          description: 'Blue iPhone 13 with cracked screen protector',
          status: 'lost',
          reporterName: 'John Doe'
        },
        {
          id: 2,
          title: 'Black Leather Wallet',
          category: 'Other',
          location: 'STC Building',
          date: '2024-01-14',
          description: 'Black leather wallet containing student ID and some cash',
          status: 'lost',
          reporterName: 'Jane Smith'
        },
        {
          id: 3,
          title: 'Red Water Bottle',
          category: 'Bottle',
          location: 'Central Building',
          date: '2024-01-13',
          description: 'Red stainless steel water bottle with university logo',
          status: 'lost',
          reporterName: 'Mike Johnson'
        },
        {
          id: 4,
          title: 'MacBook Pro Charger',
          category: 'Electronics',
          subcategory: 'Chargers',
          location: 'MSB',
          date: '2024-01-12',
          description: 'MacBook Pro charger 61W USB-C',
          status: 'lost',
          reporterName: 'Sarah Wilson'
        }
      ];
      this.saveState();
    }

    // Generate dummy found items if none exist
    if (this.foundItems.length === 0) {
      this.foundItems = [
        {
          id: 101,
          title: 'Keys with Blue Keychain',
          category: 'Other',
          location: 'STMB',
          date: '2024-01-16',
          description: 'Set of keys with blue university keychain',
          status: 'found',
          reporterName: 'Security Guard',
          isApproved: true
        },
        {
          id: 102,
          title: 'Black Backpack',
          category: 'Bags',
          location: 'Oval Building',
          date: '2024-01-15',
          description: 'Black Nike backpack containing textbooks',
          status: 'found',
          reporterName: 'Lisa Brown',
          isApproved: true
        },
        {
          id: 103,
          title: 'Student ID Card',
          category: 'Documents',
          location: 'Central Building',
          date: '2024-01-14',
          description: 'Student ID card found near cafeteria',
          status: 'found',
          reporterName: 'Admin Staff',
          isApproved: true
        },
        {
          id: 104,
          title: 'White Earbuds',
          category: 'Electronics',
          subcategory: 'Buds',
          location: 'Library',
          date: '2024-01-13',
          description: 'White Apple AirPods in charging case',
          status: 'found',
          reporterName: 'Tom Davis',
          isApproved: false
        }
      ];
      this.saveState();
    }
  }

  // Data Getters
  getCurrentUser() {
    return this.currentUser;
  }

  getLostItems() {
    return this.lostItems;
  }

  getFoundItems() {
    return this.foundItems.filter(item => item.isApproved);
  }

  getAllFoundItems() {
    return this.foundItems;
  }

  getUserItems() {
    if (!this.currentUser) return [];
    return [...this.lostItems, ...this.foundItems].filter(item => item.userId === this.currentUser.id);
  }

  // Toggle between login and register forms
  toggleAuthForm() {
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.querySelector('.register-form');
    const toggleBtn = document.querySelector('.auth-toggle-btn');
    
    if (loginForm && registerForm) {
      const isLoginVisible = !loginForm.classList.contains('d-none');
      
      if (isLoginVisible) {
        loginForm.classList.add('d-none');
        registerForm.classList.remove('d-none');
        if (toggleBtn) toggleBtn.textContent = 'Already have an account? Sign In';
      } else {
        registerForm.classList.add('d-none');
        loginForm.classList.remove('d-none');
        if (toggleBtn) toggleBtn.textContent = "Don't have an account? Sign Up";
      }
    }
  }

  // Update time every minute
  startTimeUpdater() {
    this.updateStatusBar();
    setInterval(() => {
      this.updateStatusBar();
    }, 60000);
  }
}

// Initialize the app
const mobileApp = new MobileApp();

// Start time updater
document.addEventListener('DOMContentLoaded', () => {
  mobileApp.startTimeUpdater();
});

// Add global navigation helper
window.navigateTo = (page) => mobileApp.navigateTo(page);
window.toggleAuthForm = () => mobileApp.toggleAuthForm();
window.logout = () => mobileApp.logout();

// Add CSS for message animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  .app-loader .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e0e0e0;
    border-top: 4px solid #E98074;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
`;
document.head.appendChild(style);