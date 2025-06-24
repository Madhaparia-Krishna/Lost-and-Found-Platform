import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Home.css';

const Home = () => {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleReportLost = () => {
    navigate('/report-lost');
  };

  const handleReportFound = () => {
    navigate('/report-found');
  };

  const handleViewItems = () => {
    navigate('/dashboard/found-items');
  };

  return (
    <div className="home-container auth-bg">
      <header className="home-header">
        <div className="hero-section">
          <div className="hero-content">
            <h1>Lost Something on Campus?</h1>
            <p>A simple and effective platform to report lost items and find what you're looking for on campus. We help connect students with their lost belongings.</p>
            
            <div className="hero-buttons">
              {currentUser ? (
                <>
                  <button className="hero-button primary" onClick={handleReportLost}>
                    <i className="fas fa-exclamation-circle"></i> Report Lost Item
                  </button>
                  <button className="hero-button secondary" onClick={handleReportFound}>
                    <i className="fas fa-hand-holding"></i> Report Found Item
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hero-button primary">
                    <i className="fas fa-sign-in-alt"></i> Login
                  </Link>
                  <Link to="/register" className="hero-button secondary">
                    <i className="fas fa-user-plus"></i> Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="features-section">
        <h2>How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <h3>Report Lost Items</h3>
            <p>Quickly submit details about items you've lost and get notified when similar items are found.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-hand-holding"></i>
            </div>
            <h3>Submit Found Items</h3>
            <p>Help others by reporting items you've found and facilitate their return to the rightful owners.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-search"></i>
            </div>
            <h3>Search the Database</h3>
            <p>Browse our collection of found items or search for specific items using advanced filters.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <h3>Get Items Back</h3>
            <p>Verify your identity and arrange to collect your items once they've been found.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-bell"></i>
            </div>
            <h3>Receive Notifications</h3>
            <p>Get instant alerts when potential matches for your lost items are found or when someone claims your found item.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-user-shield"></i>
            </div>
            <h3>Secure Verification</h3>
            <p>Our verification process ensures items are returned to their rightful owners with identity confirmation.</p>
          </div>
        </div>
        <div className="view-all-button">
          <button className="primary-button" onClick={handleViewItems}>
            <i className="fas fa-list"></i> View All Found Items
          </button>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} Lost@Campus</p>
          <div className="footer-links">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
