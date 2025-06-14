import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import emailService from '../utils/emailService';
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
      fetch('/api/verify-token', {
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

      if (!data.resetUrl) {
        throw new Error('Invalid server response: missing reset URL');
      }

      // Send email using our emailService
      const emailResult = await emailService.sendPasswordResetEmail(
        email,
        data.userName || 'User',
        data.resetUrl
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
      
      const response = await fetch('/api/reset-password', {
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
    <div className="login-template-container">
      <form className="login-card" onSubmit={isResetPage ? handleResetPassword : handleEmailSubmit}>
        <h1 className="login-title">{isResetPage ? 'Reset Password' : 'Forgot Password'}</h1>
        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}
        {!isResetPage ? (
          <>
            <div className="login-input-group">
              <input
                type="email"
                id="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="button-spinner"></span> : 'Send Reset Instructions'}
            </button>
            <p className="signup-prompt">
              <Link to="/login" className="login-link">Back to Login</Link>
            </p>
          </>
        ) : (
          <>
            <div className="login-input-group">
              <input
                type="password"
                id="newPassword"
                className="login-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength="8"
              />
            </div>
            <div className="login-input-group">
              <input
                type="password"
                id="confirmPassword"
                className="login-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="button-spinner"></span> : 'Reset Password'}
            </button>
            <p className="signup-prompt">
              <Link to="/login" className="login-link">Back to Login</Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}

export default ForgotPassword; 