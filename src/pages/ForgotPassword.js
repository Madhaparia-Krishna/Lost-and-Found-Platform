import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { sendEmail, buildEmailParams, EMAIL_TEMPLATES } from '../utils/emailService';
import '../styles/AuthForms.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const resetToken = searchParams.get('token');
  const isResetPage = Boolean(resetToken);

  useEffect(() => {
    if (resetToken) {
      setLoading(true);
      // Verify token validity
      fetch('http://localhost:5000/api/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: resetToken })
      })
      .then(response => response.json())
      .then(data => {
        if (!data.valid) {
          setError('Invalid or expired reset token. Please request a new password reset.');
        }
      })
      .catch(err => {
        setError('Error verifying reset token. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
    }
  }, [resetToken]);
  
  // Handle email submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Requesting password reset for email:', email);
      
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error requesting password reset');
      }

      console.log('Password reset data received:', data);

      // Send email using EmailJS
      const emailParams = {
        name: data.userName || 'User',
        reset_link: data.resetUrl,
        email: email
      };
      
      console.log('Sending email with params:', emailParams);
      
      const emailResult = await sendEmail(
        EMAIL_TEMPLATES.PASSWORD_RESET,
        emailParams
      );

      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error);
        throw new Error('Failed to send reset email. Please try again later.');
      }
      
      console.log('Email sent successfully');
      setSuccess('Password reset instructions have been sent to your email. Please check your inbox.');
      setEmail('');
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword) {
      setError('New password is required');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5000/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: resetToken,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error resetting password');
      }
      
      setSuccess('Password has been reset successfully. You can now log in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h1>{isResetPage ? 'Reset Password' : 'Forgot Password'}</h1>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {!isResetPage ? (
          <form onSubmit={handleEmailSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
            
            <div className="auth-links">
              <Link to="/login">Back to Login</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength="8"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <div className="auth-links">
              <Link to="/login">Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword; 