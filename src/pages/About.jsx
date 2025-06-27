import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const About = () => {
  return (
    <div className="page-container auth-bg">
      <div className="content-wrapper">
        <div className="page-header">
          <h1>About Lost@Campus</h1>
        </div>
        
        <div className="page-content">
          <section className="about-section">
            <h2>Our Mission</h2>
            <p>
              Lost@Campus is dedicated to simplifying the process of reuniting students with their lost 
              belongings on campus. We understand how disruptive losing personal items can be to 
              student life and academic success, and we're here to help.
            </p>
            
            <h2>Who We Are</h2>
            <p>
              Founded by a group of students who experienced the frustration of losing items on campus,
              Lost@Campus was built to create a centralized, efficient system for managing lost and found
              items at educational institutions. Our platform connects those who have lost items with 
              those who have found them, streamlining the entire process.
            </p>
            
            <h2>Our Approach</h2>
            <p>
              We use a combination of detailed item descriptions, image recognition, and location data
              to match lost items with found items. Our secure verification process ensures that items
              are returned only to their rightful owners, maintaining trust and security throughout
              the process.
            </p>
            
            <h2>Campus Partnerships</h2>
            <p>
              We work closely with campus security departments, administrative offices, and student
              organizations to create a comprehensive lost and found network that covers the entire
              campus community. By bringing together all stakeholders, we maximize the chances of
              successful item recovery.
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

export default About; 