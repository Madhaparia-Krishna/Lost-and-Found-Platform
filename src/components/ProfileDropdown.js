import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ProfileDropdown.css';

const ProfileDropdown = ({ user, logout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const goToAdminPanel = () => {
    navigate('/admin');
    setIsOpen(false);
  };

  const goToSecurityPanel = () => {
    navigate('/security');
    setIsOpen(false);
  };

  const goToProfile = () => {
    // TODO: Create a profile page
    navigate('/profile');
    setIsOpen(false);
  };

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button className="profile-button" onClick={toggleDropdown}>
        <div className="avatar">
          {getInitials(user.name)}
        </div>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
            <span className={`user-role role-${user.role}`}>{user.role}</span>
          </div>
          <div className="dropdown-divider"></div>
          
          {user.role === 'admin' && (
            <button className="dropdown-item" onClick={goToAdminPanel}>
              Admin Panel
            </button>
          )}
          
          {(user.role === 'admin' || user.role === 'security') && (
            <button className="dropdown-item" onClick={goToSecurityPanel}>
              Security Panel
            </button>
          )}
          
          <button className="dropdown-item" onClick={goToProfile}>
            My Profile
          </button>
          
          <button className="dropdown-item logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown; 