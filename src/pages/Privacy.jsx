import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Privacy = () => {
  return (
    <div className="page-container auth-bg">
      <div className="content-wrapper">
        <div className="page-header">
          <h1>Privacy Policy</h1>
        </div>
        
        <div className="page-content">
          <section className="policy-section">
            <p>Last Updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Information We Collect</h2>
            <p>
              When you use Lost@Campus, we collect certain information to provide and improve our services:
            </p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, student ID, and contact details.</li>
              <li><strong>Lost/Found Item Details:</strong> Descriptions, images, location data, and dates related to lost or found items.</li>
              <li><strong>Usage Information:</strong> How you interact with our platform, including pages visited and features used.</li>
              <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers.</li>
            </ul>
            
            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul>
              <li>To provide and maintain our lost and found services</li>
              <li>To match lost items with found items</li>
              <li>To facilitate communication between users for item recovery</li>
              <li>To verify identity during the claim process</li>
              <li>To improve and optimize our platform</li>
              <li>To send notifications about potential matches or updates</li>
            </ul>
            
            <h2>3. Information Sharing</h2>
            <p>
              We do not sell your personal information to third parties. We may share limited information in the following circumstances:
            </p>
            <ul>
              <li>With campus security or administration when necessary for item recovery</li>
              <li>With other users only as needed to facilitate the return of items</li>
              <li>With service providers who assist in operating our platform</li>
              <li>When required by law or to protect our rights</li>
            </ul>
            
            <h2>4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
            
            <h2>5. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal information. You may also request
              a copy of your data or restrict certain processing. To exercise these rights, please contact us
              through our support channels.
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

export default Privacy; 