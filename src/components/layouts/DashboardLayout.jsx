import React, { useState, useContext } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/Dashboard.css';

const DashboardLayout = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/" className="logo">
            <i className="fas fa-box-open"></i>
            <span>Lost & Found</span>
          </Link>
          <button className="mobile-toggle" onClick={toggleMobileMenu}>
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>
        
        <nav className={`dashboard-nav ${isMobileMenuOpen ? 'active' : ''}`}>
          <Link 
            to="/dashboard/found-items" 
            className={`nav-item ${isActive('/dashboard/found-items') ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <i className="fas fa-search"></i> Found Items
          </Link>
          <Link 
            to="/dashboard/lost-items" 
            className={`nav-item ${isActive('/dashboard/lost-items') ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <i className="fas fa-question-circle"></i> Lost Items
          </Link>
          <Link 
            to="/dashboard/requested-items" 
            className={`nav-item ${isActive('/dashboard/requested-items') ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <i className="fas fa-hand-paper"></i> Requested Items
          </Link>
          <Link 
            to="/dashboard/returned-items" 
            className={`nav-item ${isActive('/dashboard/returned-items') ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <i className="fas fa-check-circle"></i> Returned Items
          </Link>
        </nav>
        
        <div className="header-right">
          <div className="user-actions">
            <Link to="/report-lost" className="action-button lost-btn">
              <i className="fas fa-exclamation-circle"></i> Report Lost
            </Link>
            <Link to="/report-found" className="action-button found-btn">
              <i className="fas fa-hand-holding"></i> Report Found
            </Link>
          </div>
          
          <div className="user-profile">
            <div className="user-info">
              <span>{currentUser?.name || 'User'}</span>
              <button onClick={handleLogout} className="logout-btn">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout; 