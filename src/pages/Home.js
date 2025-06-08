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
    <div className="home-container">
      <header className="home-header">
        <div className="home-navbar">
          <div className="home-logo">
            <i className="fas fa-box-open"></i>
            <span>Lost & Found</span>
          </div>
          <nav className="home-nav">
            {currentUser ? (
              <Link to="/dashboard" className="home-nav-link dashboard-link">
                <i className="fas fa-columns"></i> Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="home-nav-link">Login</Link>
                <Link to="/register" className="home-nav-link signup-link">Register</Link>
              </>
            )}
          </nav>
        </div>

        <div className="hero-section">
          <div className="hero-content">
            <h1>Campus Lost & Found System</h1>
            <p>A simple and effective way to report lost items and find what you're looking for on campus.</p>
            
            <div className="hero-buttons">
              {currentUser ? (
                <>
                  <button className="hero-button primary" onClick={handleReportLost}>
                    <i className="fas fa-exclamation-circle"></i> Report Lost Item
                  </button>
                  <button className="hero-button secondary" onClick={handleReportFound}>
                    <i className="fas fa-search"></i> Report Found Item
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hero-button primary">
                    <i className="fas fa-sign-in-alt"></i> Login to Report
                  </Link>
                  <Link to="/register" className="hero-button secondary">
                    <i className="fas fa-user-plus"></i> Register Now
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hero-image">
            <img src="/images/lost-and-found.svg" alt="Lost and Found Illustration" />
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
            <p>Quickly submit details about items you've lost on campus.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-hand-holding"></i>
            </div>
            <h3>Submit Found Items</h3>
            <p>Help others by reporting items you've found around campus.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-search"></i>
            </div>
            <h3>Search the Database</h3>
            <p>Browse the collection of found items to locate what you've lost.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <h3>Get Items Back</h3>
            <p>Arrange to collect your items once they've been found.</p>
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
          <p>&copy; {new Date().getFullYear()} Campus Lost & Found System</p>
          <div className="footer-links">
            <a href="#about">About</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
