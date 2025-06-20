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
  
  const { login, currentUser, authError } = useContext(AuthContext);
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

  // Add effect to sync context error to local error
  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

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
      console.log('Login form submitting with email:', email);
      
      // Add more debugging
      console.log('About to call login function from AuthContext');
      const result = await login(email, password);
      console.log('Login function returned:', result);
      
      // Explicitly navigate to home on success
      console.log('Login successful, navigating to homepage');
      navigate('/');
    } catch (err) {
      console.error('Login error caught in component:', err);
      // Set the error message from the error or context
      setError(err?.message || authError || err || 'Failed to login. Please try again.');
      setPassword('');
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.focus();
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
            className={`login-input${error && error.toLowerCase().includes('email') ? ' login-input-error' : ''}`}
            placeholder="E-mail"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            required
          />
        </div>
        <div className="login-input-group">
          <input
            type="password"
            id="password"
            className={`login-input${error ? ' login-input-error' : ''}`}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
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