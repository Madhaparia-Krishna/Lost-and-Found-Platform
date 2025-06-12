import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <i className="fas fa-map-marker-alt"></i>
        Lost@Campus
      </Link>
      
      <div className="navbar-search">
        <i className="fas fa-search"></i>
      </div>
      
      <button 
        className="navbar-toggle" 
        onClick={toggleMenu}
        aria-label="Toggle navigation"
      >
        <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>
      
      <div className={`navbar-collapse ${isMenuOpen ? 'show' : ''}`}>
        <ul className="navbar-nav">
          {currentUser && (
            <>
              <li className="nav-item">
                <Link 
                  to="/report-lost" 
                  className={`nav-link ${location.pathname === '/report-lost' ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Report Lost
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  to="/report-found" 
                  className={`nav-link ${location.pathname === '/report-found' ? 'active' : ''}`}
                  onClick={closeMenu}
                >
                  Report Found
                </Link>
              </li>
            </>
          )}
          <li className="nav-item">
            <Link 
              to="/dashboard/found-items" 
              className={`nav-link ${location.pathname.includes('/dashboard') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              View Items
            </Link>
          </li>
        </ul>
        
        <div className="nav-right">
          {currentUser ? (
            <div className="user-menu">
              <button className="user-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <div className="user-avatar">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-name">{currentUser.name || currentUser.email}</span>
                {currentUser.role && (
                  <span className={`user-role role-${currentUser.role}`}>
                    {currentUser.role}
                  </span>
                )}
              </button>
              
              <div className={`dropdown-menu ${isMenuOpen ? 'active' : ''}`}>
                <Link to="/profile" className="dropdown-item" onClick={closeMenu}>
                  <i className="fas fa-user"></i> Profile
                </Link>
                <Link to="/dashboard" className="dropdown-item" onClick={closeMenu}>
                  <i className="fas fa-columns"></i> Dashboard
                </Link>
                
                {currentUser.role === 'admin' && (
                  <Link to="/admin" className="dropdown-item" onClick={closeMenu}>
                    <i className="fas fa-shield-alt"></i> Admin Panel
                  </Link>
                )}
                
                {currentUser.role === 'security' && (
                  <Link to="/security" className="dropdown-item" onClick={closeMenu}>
                    <i className="fas fa-user-shield"></i> Security Panel
                  </Link>
                )}
                
                <div className="dropdown-divider"></div>
                
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="login-button" onClick={closeMenu}>
                Login
              </Link>
              <Link to="/register" className="signup-button" onClick={closeMenu}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 