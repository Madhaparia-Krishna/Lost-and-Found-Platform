import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar modern-navbar">
      <div className="navbar-logo styled-logo">
        <span className="logo-blue">Lost</span><span className="logo-dark">@Campus</span>
      </div>
      <div className="navbar-actions">
        <Link to="/" className="navbar-link">Home</Link>
        <Link to="/dashboard/found-items" className="navbar-link">View Items</Link>
        
        {/* Security Panel Link - Only visible to security staff */}
        {currentUser && currentUser.role === 'security' && (
          <Link to="/security-dashboard" className="navbar-link security-link">
            <i className="fas fa-shield-alt"></i> Security Panel
          </Link>
        )}
        
        {/* Admin Panel Link - Only visible to admins */}
        {currentUser && currentUser.role === 'admin' && (
          <Link to="/admin" className="navbar-link admin-link">
            <i className="fas fa-user-shield"></i> Admin Panel
          </Link>
        )}
        
        {currentUser ? (
          <>
            <button className="navbar-btn navbar-btn-blue" onClick={logout}>Logout</button>
            <div className="navbar-profile-dropdown-wrapper">
              <div
                className="navbar-profile-icon"
                tabIndex={0}
                onClick={() => setProfileMenuOpen((open) => !open)}
                onBlur={() => setTimeout(() => setProfileMenuOpen(false), 150)}
              >
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              {profileMenuOpen && (
                <div className="navbar-profile-dropdown">
                  <a href="/profile" className="navbar-profile-dropdown-item">Profile</a>
                  {currentUser.role === 'admin' && (
                    <a href="/admin" className="navbar-profile-dropdown-item">Admin Dashboard</a>
                  )}
                  {currentUser.role === 'security' && (
                    <a href="/security-dashboard" className="navbar-profile-dropdown-item">Security Dashboard</a>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-btn navbar-btn-blue">Login</Link>
            <Link to="/register" className="navbar-btn navbar-btn-gray">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 