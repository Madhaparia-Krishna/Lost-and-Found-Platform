import React, { useState, useContext } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/Dashboard.css';

const DashboardLayout = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="dashboard-app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <i className="fas fa-box-open"></i>
            <span>Lost & Found</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          <Link 
            to="/dashboard/found-items" 
            className={`nav-item ${isActive('/dashboard/found-items') ? 'active' : ''}`}
          >
            <i className="fas fa-search"></i> Found Items
          </Link>
          <Link 
            to="/dashboard/lost-items" 
            className={`nav-item ${isActive('/dashboard/lost-items') ? 'active' : ''}`}
          >
            <i className="fas fa-question-circle"></i> Lost Items
          </Link>
          <Link 
            to="/dashboard/requested-items" 
            className={`nav-item ${isActive('/dashboard/requested-items') ? 'active' : ''}`}
          >
            <i className="fas fa-hand-paper"></i> Requested Items
          </Link>
          <Link 
            to="/dashboard/returned-items" 
            className={`nav-item ${isActive('/dashboard/returned-items') ? 'active' : ''}`}
          >
            <i className="fas fa-check-circle"></i> Returned Items
          </Link>
          {currentUser.role === 'admin' && (
            <Link to="/admin" className={`nav-item ${isActive('/admin') ? 'active' : ''}`}>
              <i className="fas fa-cog"></i> Admin Panel
            </Link>
          )}
          {(currentUser.role === 'security' || currentUser.role === 'admin') && (
            <Link to="/security" className={`nav-item ${isActive('/security') ? 'active' : ''}`}>
              <i className="fas fa-user-shield"></i> Security Panel
            </Link>
          )}
          <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
            <i className="fas fa-user"></i> My Profile
          </Link>
        </nav>
      </aside>
      
      <div className="main-content-wrapper">
        <header className="dashboard-header">
          <div className="header-left">
            {/* You can add a page title or dynamic breadcrumbs here if needed */}
            <span className="page-title">Dashboard</span>
          </div>
          <div className="header-right">
            <Link to="/report-lost" className="header-action-button lost-btn">
              <i className="fas fa-exclamation-circle"></i> Report Lost
            </Link>
            <Link to="/report-found" className="header-action-button found-btn">
              <i className="fas fa-hand-holding"></i> Report Found
            </Link>
            <div className="user-profile-widget">
              <div className="user-avatar">
                {getInitials(currentUser?.name)}
              </div>
              <span className="user-name-display">{currentUser?.name || currentUser?.email}</span>
              <button onClick={handleLogout} className="logout-button">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>
        </header>
        
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 