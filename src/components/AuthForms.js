import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setError(err.message || 'Failed to login. Please check your credentials.');
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
    <div className={`auth-container ${activeForm === 'login' ? 'login-active' : 'register-active'} ${isAnimating ? 'animating' : ''}`}>
      {/* Form Container */}
      <div className="auth-form-container">
        {/* Login Form */}
        <div className={`auth-form-side login ${activeForm === 'login' ? 'active' : ''}`}>
          <div className="auth-header">
            <h1>Sign In</h1>
          </div>
          
          {error && activeForm === 'login' && <div className="auth-error">{error}</div>}
          
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="email">EMAIL ADDRESS</label>
              <input
                type="email"
                id="email"
                name="email"
                value={loginData.email}
                onChange={handleLoginChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">PASSWORD</label>
              <input
                type="password"
                id="password"
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
              />
            </div>

            <button 
              type="submit" 
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading && activeForm === 'login' ? (
                <>
                  <span className="button-spinner"></span> SIGNING IN...
                </>
              ) : (
                'SIGN IN'
              )}
            </button>
          </form>
        </div>

        {/* Register Form */}
        <div className={`auth-form-side register ${activeForm === 'register' ? 'active' : ''}`}>
          <div className="auth-header">
            <h1>Sign Up</h1>
          </div>
          
          {error && activeForm === 'register' && <div className="auth-error">{error}</div>}
          
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label htmlFor="name">FULL NAME</label>
              <input
                type="text"
                id="name"
                name="name"
                value={registerData.name}
                onChange={handleRegisterChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="registerEmail">EMAIL ADDRESS</label>
              <input
                type="email"
                id="registerEmail"
                name="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="registerPassword">PASSWORD</label>
              <input
                type="password"
                id="registerPassword"
                name="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
                minLength={8}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading && activeForm === 'register' ? (
                <>
                  <span className="button-spinner"></span> SIGNING UP...
                </>
              ) : (
                'SIGN UP'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Info Panel */}
      <div className="auth-info-side">
        <div className="auth-info-content-container">
          {/* Login Info Content */}
          <div className={`auth-info-content login ${activeForm === 'login' ? 'active' : ''}`}>
            <h2 className="info-title">New here?</h2>
            <p className="info-text">Sign up and discover</p>
            <button 
              className="signup-button"
              onClick={() => switchForm('register')}
              disabled={isAnimating}
            >
              SIGN UP
            </button>
          </div>
          
          {/* Register Info Content */}
          <div className={`auth-info-content register ${activeForm === 'register' ? 'active' : ''}`}>
            <h2 className="info-title">One of us?</h2>
            <p className="info-text">Just sign in</p>
            <button 
              className="signup-button"
              onClick={() => switchForm('login')}
              disabled={isAnimating}
            >
              SIGN IN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForms;