import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/AuthForms.css';

const AuthForms = ({ initialForm = 'login' }) => {
  const [activeForm, setActiveForm] = useState(initialForm);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Set initial form visibility based on the initialForm prop
  useEffect(() => {
    setActiveForm(initialForm);
  }, [initialForm]);

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData({
      ...loginData,
      [name]: value
    });
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData({
      ...registerData,
      [name]: value
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userData = await login(loginData.email, loginData.password);
      
      // Redirect based on user role
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'security') {
        navigate('/security');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Show specific message for invalid credentials
      if (err.message && (
          err.message.includes('Invalid email or password') || 
          err.message.includes('credentials') ||
          err.message.includes('Authentication failed')
        )) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(err.message || 'Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!registerData.name || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (registerData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      await register(registerData.name, registerData.email, registerData.password);
      // Navigation will happen automatically when currentUser changes
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchForm = (form) => {
    if (form === activeForm || isAnimating) return;
    
    // Start animation
    setIsAnimating(true);
    
    // Set a timeout to match the animation duration
    setTimeout(() => {
      setActiveForm(form);
      setIsAnimating(false);
    }, 600); // 600ms to match the CSS transition
  };

  return (
    <div className="auth-container">
      <div className={`auth-form-side login`}>
        <div className="auth-header">
          <h1>Sign In</h1>
        </div>
        {error && activeForm === 'login' && <div className="auth-error">{error}</div>}
        <form onSubmit={handleLoginSubmit} style={{width: '100%'}}>
          <div className="form-group">
            <input
              type="email"
              id="email"
              name="email"
              value={loginData.email}
              onChange={handleLoginChange}
              required
              placeholder="E-mail"
              className="login-input"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              value={loginData.password}
              onChange={handleLoginChange}
              required
              placeholder="Password"
              className="login-input"
            />
          </div>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <Link to="/forgot-password" className="login-forgot-link">Forgot Password ?</Link>
          </div>
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="button-spinner"></span> Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
          <div className="signup-prompt">
            Don't have an account? <Link to="/register" className="signup-link">Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthForms;