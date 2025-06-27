import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Terms = () => {
  return (
    <div className="page-container auth-bg">
      <div className="content-wrapper">
        <div className="page-header">
          <h1>Terms of Service</h1>
        </div>
        
        <div className="page-content">
          <section className="terms-section">
            <p>Last Updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Lost@Campus platform, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
            
            <h2>2. Platform Description</h2>
            <p>
              Lost@Campus provides a platform for reporting lost items and found items on campus, facilitating 
              the return of items to their rightful owners. Our services include item matching, notification systems, 
              and secure verification processes.
            </p>
            
            <h2>3. User Accounts</h2>
            <p>
              To use certain features of our platform, you must create an account. You are responsible for 
              maintaining the confidentiality of your account credentials and for all activities that occur 
              under your account. You must provide accurate and complete information when creating your account.
            </p>
            
            <h2>4. User Conduct</h2>
            <p>
              When using Lost@Campus, you agree to:
            </p>
            <ul>
              <li>Provide accurate information about lost or found items</li>
              <li>Not claim items that do not belong to you</li>
              <li>Not use the platform for any illegal purposes</li>
              <li>Respect the privacy and rights of other users</li>
              <li>Not engage in any activity that may disrupt the functioning of the platform</li>
            </ul>
            
            <h2>5. Lost and Found Process</h2>
            <p>
              When reporting lost or found items, you agree to:
            </p>
            <ul>
              <li>Provide accurate descriptions and images of items</li>
              <li>Respond to communications regarding potential matches in a timely manner</li>
              <li>Follow the verification process when claiming items</li>
              <li>Make reasonable efforts to return found items to their rightful owners</li>
            </ul>
            
            <h2>6. Limitation of Liability</h2>
            <p>
              Lost@Campus is not responsible for:
            </p>
            <ul>
              <li>Items that are not recovered or returned</li>
              <li>Any damage to items while in the possession of users or campus staff</li>
              <li>Disputes between users regarding item ownership</li>
              <li>Any consequential, incidental, or special damages arising from the use of our platform</li>
            </ul>
            
            <h2>7. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account and access to our services at our 
              discretion, without notice, for conduct that we believe violates these Terms of Service or 
              is harmful to other users or us.
            </p>
          </section>
          
          <div className="return-home">
            <Link to="/" className="primary-button">
              <i className="fas fa-home"></i> Return to Home
            </Link>
          </div>
        </div>
      </div>
      
      <footer className="home-footer">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} Lost@Campus</p>
          <div className="footer-links">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Terms; 