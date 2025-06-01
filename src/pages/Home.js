import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ProfileDropdown from '../components/ProfileDropdown';
import '../index.css';
import '../styles/Navbar.css';
import '../styles/Home.css';
import axios from 'axios';

// Create a base API URL that can be easily changed
const API_BASE_URL = 'http://localhost:5000';

function Home() {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    fetchRecentItems();
  }, []);

  const fetchRecentItems = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/items`, {
        timeout: 10000 // 10 seconds timeout
      });
      // Filter to only show approved found items
      const foundItems = response.data.filter(item => 
        item.status === 'found' && item.is_approved === true
      );
      // Get most recent 6 items
      setRecentItems(foundItems.slice(0, 6));
    } catch (error) {
      console.error('Error fetching recent items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Navigate to items page with search parameters
    navigate(`/items?search=${searchTerm}&category=${selectedCategory}`);
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
            <button className="nav-btn" onClick={() => navigate('/lost')}>
              Submit Lost Item
            </button>
            <button className="nav-btn" onClick={() => navigate('/found')}>
              Submit Found Item
            </button>
            <button className="nav-btn" onClick={() => navigate('/items')}>
              View All Items
            </button>
          </div>
          
          {/* Authentication components */}
          {!currentUser ? (
            <div className="auth-section">
              <Link to="/login" className="nav-btn">Log In</Link>
              <Link to="/register" className="nav-btn">Register</Link>
            </div>
          ) : (
            <div className="auth-section">
              <ProfileDropdown user={currentUser} logout={logout} />
            </div>
          )}
        </div>
      </nav>

      <main className="main-content">
        <div className="hero-section">
          <h2>University Lost & Found Service</h2>
          <p>Find what you've lost or help others find their belongings</p>
        </div>

        <section className="search-section">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search lost or found items..." 
              className="search-input" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <select 
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Books">Books</option>
              <option value="Bags">Bags</option>
              <option value="Documents">Documents</option>
              <option value="Bottle">Bottle</option>
              <option value="Other">Other</option>
            </select>
            <button className="search-btn" onClick={handleSearch}>Search</button>
          </div>
        </section>

        <section className="features-section">
          <div className="feature">
            <div className="feature-icon">📝</div>
            <h3>Report Lost Items</h3>
            <p>Submit details about items you've lost on campus</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔍</div>
            <h3>Report Found Items</h3>
            <p>Help others by reporting items you've found</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔔</div>
            <h3>Get Notified</h3>
            <p>Receive alerts when potential matches are found</p>
          </div>
        </section>

        <section className="recent-items-section">
          <h2>Recently Found Items</h2>
          {loading ? (
            <div className="loading">Loading recent items...</div>
          ) : recentItems.length === 0 ? (
            <p className="no-items">No items to display at the moment</p>
          ) : (
            <div className="items-grid">
              {recentItems.map(item => (
                <div key={item.id} className="item-card" onClick={() => navigate(`/items/${item.id}`)}>
                  <div className="item-image">
                    {item.image ? (
                      <img 
                        src={`${API_BASE_URL}/uploads/${item.image}`} 
                        alt={item.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder-image.png';
                        }}
                      />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </div>
                  <div className="item-details">
                    <h3>{item.title}</h3>
                    <p className="item-category">{item.category}</p>
                    <p className="item-date">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="view-all-link">
            <Link to="/items">View All Found Items</Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Lost@Campus</h3>
            <p>A platform to help university students and staff find their lost belongings.</p>
          </div>
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/help">Help Center</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Contact</h3>
            <p>Email: support@lostcampus.edu</p>
            <p>Phone: (123) 456-7890</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Lost@Campus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
