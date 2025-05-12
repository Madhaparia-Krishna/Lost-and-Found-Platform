import React, { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ProfileDropdown from '../components/ProfileDropdown';
import '../index.css';
import '../styles/Navbar.css';

function Home() {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Debug the auth state
  useEffect(() => {
    console.log('Home component - Current user:', currentUser);
  }, [currentUser]);

  const handleLogout = () => {
    console.log('Logging out...');
    logout();
    navigate('/login');
  };

  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="nav-left">
          <h1>Lost@Campus</h1>
          <p className="subheading">Your go-to place when things go missing</p>
        </div>
        
        {/* Hamburger menu for mobile */}
        <div className="menu-toggle d-md-none" onClick={toggleMobileMenu}>
          ☰
        </div>
        
        <div className={`nav-right ${mobileMenuOpen ? 'active' : ''}`}>
          <div className="action-buttons">
            <button className="nav-btn">Submit Lost Item</button>
            <button className="nav-btn">Submit Found Item</button>
            <button className="nav-btn">View Recent Posts</button>
          </div>
          
          {/* Authentication components */}
          <div className="auth-section">
            {!currentUser ? (
              <>
                <Link to="/login" className="nav-btn">Log In</Link>
                <Link to="/register" className="nav-btn">Register</Link>
              </>
            ) : (
              <>
                <span className="welcome-text">Welcome, {currentUser.name}!</span>
                <div className="user-controls">
                  <Link to="/profile" className="nav-btn profile-btn">My Profile</Link>
                  
                  {/* Role-specific navigation links */}
                  {(currentUser.role === 'admin' || currentUser.role === 'security') && (
                    <div className="admin-controls">
                      {currentUser.role === 'admin' && (
                        <Link to="/admin" className="nav-btn admin-btn">Admin Panel</Link>
                      )}
                      <Link to="/security" className="nav-btn security-btn">Security Panel</Link>
                    </div>
                  )}
                  
                  <div className="user-avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <section className="search-section">
          <div className="search-container">
            <input type="text" placeholder="Search..." className="search-input" />
            <select className="category-select">
              <option value="">Category</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="books">Books</option>
            </select>
          </div>
        </section>
      </main>

      <div className="content-section">
        <section className="rating">
          <div className="rating-container">
            <p>⭐⭐⭐⭐⭐ Rate us!</p>
          </div>
        </section>

        <section className="recent-items">
          <h2>Some Recent Lost & Found Items</h2>
          <div className="item-grid">
            <div className="item-card">Item 1</div>
            <div className="item-card">Item 2</div>
            <div className="item-card">Item 3</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
