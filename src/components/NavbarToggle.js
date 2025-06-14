import React, { useState, useEffect } from 'react';

const NavbarToggle = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Close the navbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navbar = document.querySelector('.navbar');
      const navbarCollapse = document.querySelector('.navbar-collapse');
      
      if (navbar && navbarCollapse && isOpen) {
        if (!navbar.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    // Close navbar when window is resized to desktop size
    const handleResize = () => {
      if (window.innerWidth >= 992 && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Toggle navbar visibility
  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button 
        className="navbar-toggle" 
        onClick={toggleNavbar} 
        aria-label="Toggle navigation"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>
      
      <div className={`navbar-collapse ${isOpen ? 'show' : ''}`}>
        {/* This is just a wrapper component - the actual navbar content will be rendered as children */}
        {/* from the parent component */}
      </div>
    </>
  );
};

export default NavbarToggle; 