import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/AuthForms.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animateError, setAnimateError] = useState(false);
  
  const { login, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Monitor authentication state changes
  useEffect(() => {
    if (currentUser) {
      // Redirect to homepage if already logged in
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Add effect to animate error message when it changes
  useEffect(() => {
    if (error) {
      console.log('Login component error state updated:', error);
      setAnimateError(true);
      const timer = setTimeout(() => {
        setAnimateError(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Email and password are required');
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      
      // Redirect to homepage after successful login
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific error types based on error message or code
      if (err.message) {
        // Check for wrong password errors
        if (err.message.includes('Wrong password') || 
            err.message.includes('Invalid password') ||
            err.message.includes('password is incorrect') ||
            err.message.includes('INVALID_PASSWORD')) {
          setError('Wrong password. Please try again.');
        }
        // Check for user not found errors
        else if (err.message.includes('User not found') || 
            err.message.includes('No account') ||
            err.message.includes('user does not exist') ||
            err.message.includes('account not found') ||
            err.message.includes('USER_NOT_FOUND')) {
          setError('No account found with this email address.');
        }
        // Check for general invalid credentials
        else if (err.message.includes('Invalid email or password') || 
                 err.message.includes('credentials') ||
                 err.message.includes('Authentication failed') ||
                 err.message.includes('401')) {
          setError('Invalid email or password. Please check your credentials.');
        }
        // Default error message
        else {
          setError(err.message || 'Failed to login. Please try again.');
        }
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-template-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">Sign In</h1>
        
        {/* Display error message with enhanced visibility */}
        {error && (
          <div className={`login-error ${animateError ? 'animate' : ''}`}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        
        <div className="login-input-group">
          <input
            type="email"
            id="email"
            className="login-input"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="login-input-group">
          <input
            type="password"
            id="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div style={{ width: '100%', textAlign: 'center' }}>
          <Link to="/forgot-password" className="login-forgot-link">Forgot Password ?</Link>
        </div>
        <button type="submit" className="login-btn" disabled={isLoading}>
          {isLoading ? <span className="button-spinner"></span> : ''} Sign In
        </button>
        <p className="signup-prompt">
          Don't have an account? <Link to="/register" className="signup-link">Sign up</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;