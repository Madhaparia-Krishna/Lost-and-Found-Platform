import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileDropdown from './ProfileDropdown';
import Notification from './Notification';
import '../styles/Navbar.css';

const Navbar = () => {
  const { currentUser, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Lost and Found</Link>
      </div>

      <div className="navbar-menu">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/items" className="nav-link">Browse Items</Link>
      </div>

      <div className="navbar-end">
        {currentUser ? (
          <>
            <Notification />
            <ProfileDropdown user={currentUser} logout={logout} />
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 