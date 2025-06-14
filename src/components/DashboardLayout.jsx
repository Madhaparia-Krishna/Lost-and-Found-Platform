import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/DashboardLayout.css';

const DashboardLayout = ({ children, title, actionStatus }) => {
  const { currentUser, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine which navigation link is active
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-brand">
          <Link to="/" className="brand-link">Lost@Campus</Link>
        </div>
        
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <i className={mobileMenuOpen ? "fas fa-times" : "fas fa-bars"}></i>
        </button>
        
        <nav className={`dashboard-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="nav-section main-nav">
            <Link to="/dashboard/found" className={isActive('/dashboard/found')}>
              <i className="fas fa-search"></i> Found Items
            </Link>
            <Link to="/dashboard/lost" className={isActive('/dashboard/lost')}>
              <i className="fas fa-question-circle"></i> Lost Items
            </Link>
            <Link to="/dashboard/requests" className={isActive('/dashboard/requests')}>
              <i className="fas fa-hand-paper"></i> My Requests
            </Link>
            <Link to="/dashboard/returned" className={isActive('/dashboard/returned')}>
              <i className="fas fa-undo"></i> Returned Items
            </Link>
          </div>
          
          <div className="nav-section actions-nav">
            <Link to="/found" className="action-btn">
              <i className="fas fa-plus-circle"></i> Report Found
            </Link>
            <Link to="/lost" className="action-btn">
              <i className="fas fa-plus-circle"></i> Report Lost
            </Link>
          </div>
          
          <div className="nav-section user-nav">
            {(currentUser.role === 'security' || currentUser.role === 'admin') && (
              <Link to="/security" className={`admin-link ${isActive('/security')}`}>
                <i className="fas fa-shield-alt"></i>
                <span className="link-text">Security</span>
              </Link>
            )}
            {currentUser.role === 'admin' && (
              <Link to="/admin" className={`admin-link ${isActive('/admin')}`}>
                <i className="fas fa-cog"></i>
                <span className="link-text">Admin</span>
              </Link>
            )}
            <div className="user-dropdown">
              <div className="user-info">
                <div className="avatar">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="username">{currentUser.name || currentUser.email}</span>
                <i className="fas fa-chevron-down"></i>
              </div>
              <div className="dropdown-menu">
                <Link to="/profile" className="dropdown-item">
                  <i className="fas fa-user"></i> Profile
                </Link>
                <button onClick={handleLogout} className="dropdown-item">
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>
      
      <main className="dashboard-main">
        <div className="page-header">
          <h1>{title}</h1>
          <button className="refresh-btn" onClick={() => window.location.reload()}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
        
        {actionStatus && (
          <div className={`action-status ${actionStatus.type}`}>
            {actionStatus.message}
          </div>
        )}
        
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout; 