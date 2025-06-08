import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar as BootstrapNavbar, Nav, Container, NavDropdown, Badge } from 'react-bootstrap';
import ProfileDropdown from './ProfileDropdown';
import Notification from './Notification';
import '../styles/Navbar.css';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  // Handle navbar toggle for mobile
  const toggleNavbar = () => setExpanded(!expanded);
  const closeNavbar = () => setExpanded(false);

  // Check if the link is active
  const isActive = (path) => location.pathname === path;

  return (
    <BootstrapNavbar 
      bg="white" 
      expand="lg" 
      fixed="top" 
      className="shadow-sm py-2" 
      expanded={expanded}
    >
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/" className="fw-bold">
          <i className="fas fa-search me-2"></i>
          Lost & Found
        </BootstrapNavbar.Brand>
        
        <BootstrapNavbar.Toggle 
          aria-controls="navbar-nav" 
          onClick={toggleNavbar} 
        />
        
        <BootstrapNavbar.Collapse id="navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/" 
              active={isActive('/')}
              onClick={closeNavbar}
            >
              Home
            </Nav.Link>
            
            <Nav.Link 
              as={Link} 
              to="/items" 
              active={isActive('/items')}
              onClick={closeNavbar}
            >
              Browse Items
            </Nav.Link>
            
            {currentUser && (
              <>
                <Nav.Link 
                  as={Link} 
                  to="/found" 
                  active={isActive('/found')}
                  onClick={closeNavbar}
                >
                  Report Found
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/lost" 
                  active={isActive('/lost')}
                  onClick={closeNavbar}
                >
                  Report Lost
                </Nav.Link>
              </>
            )}
          </Nav>
          
          <Nav>
            {/* Role-specific links */}
            {currentUser && currentUser.role === 'admin' && (
              <Nav.Link 
                as={Link} 
                to="/admin" 
                className="text-danger me-2"
                onClick={closeNavbar}
              >
                <i className="fas fa-shield-alt me-1"></i>
                Admin
              </Nav.Link>
            )}
            
            {currentUser && currentUser.role === 'security' && (
              <Nav.Link 
                as={Link} 
                to="/security" 
                className="text-warning me-2"
                onClick={closeNavbar}
              >
                <i className="fas fa-user-shield me-1"></i>
                Security
              </Nav.Link>
            )}
            
            {/* Authentication links */}
            {currentUser ? (
              <NavDropdown 
                title={
                  <span>
                    <i className="fas fa-user-circle me-1"></i>
                    {currentUser.name || currentUser.email}
                    <Badge 
                      bg={currentUser.role === 'admin' ? 'danger' : 
                          currentUser.role === 'security' ? 'warning' : 'info'}
                      className="ms-2"
                    >
                      {currentUser.role}
                    </Badge>
                  </span>
                } 
                id="user-dropdown"
                align="end"
              >
                <NavDropdown.Item as={Link} to="/profile" onClick={closeNavbar}>
                  <i className="fas fa-id-card me-2"></i>
                  Profile
                </NavDropdown.Item>
                
                <NavDropdown.Item as={Link} to="/dashboard" onClick={closeNavbar}>
                  <i className="fas fa-tachometer-alt me-2"></i>
                  Dashboard
                </NavDropdown.Item>
                
                <NavDropdown.Divider />
                
                <NavDropdown.Item onClick={() => { logout(); closeNavbar(); }}>
                  <i className="fas fa-sign-out-alt me-2"></i>
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link 
                  as={Link} 
                  to="/login" 
                  className="me-2"
                  onClick={closeNavbar}
                >
                  Login
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/register" 
                  className="btn btn-primary text-white"
                  onClick={closeNavbar}
                >
                  Register
                </Nav.Link>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
};

export default Navbar; 