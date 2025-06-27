import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [submitted, setSubmitted] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    console.log('Form submitted:', formData);
    // Show success message
    setSubmitted(true);
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };
  
  return (
    <div className="page-container auth-bg">
      <div className="content-wrapper">
        <div className="page-header">
          <h1>Contact Us</h1>
        </div>
        
        <div className="page-content">
          <section className="contact-section">
            <div className="contact-info">
              <h2>Get in Touch</h2>
              <p>
                Have questions, suggestions, or need assistance with the Lost@Campus platform?
                We're here to help! Feel free to reach out to our team using the contact form
                or through any of the methods below.
              </p>
              
              <div className="contact-methods">
                <div className="contact-method">
                  <i className="fas fa-envelope"></i>
                  <p>support@lostcampus.edu</p>
                </div>
                <div className="contact-method">
                  <i className="fas fa-phone"></i>
                  <p>+1 (555) 123-4567</p>
                </div>
                <div className="contact-method">
                  <i className="fas fa-map-marker-alt"></i>
                  <p>Student Union Building, Room 101<br />University Campus</p>
                </div>
                <div className="contact-method">
                  <i className="fas fa-clock"></i>
                  <p>Monday-Friday: 9am-5pm<br />Saturday: 10am-2pm</p>
                </div>
              </div>
            </div>
            
            <div className="contact-form-container">
              {submitted ? (
                <div className="success-message">
                  <i className="fas fa-check-circle"></i>
                  <h3>Thank You!</h3>
                  <p>Your message has been sent successfully. We'll get back to you as soon as possible.</p>
                  <button 
                    className="primary-button"
                    onClick={() => setSubmitted(false)}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Your Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="subject">Subject</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="message">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      rows="5"
                      value={formData.message}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>
                  
                  <button type="submit" className="primary-button">
                    <i className="fas fa-paper-plane"></i> Send Message
                  </button>
                </form>
              )}
            </div>
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

export default Contact; 