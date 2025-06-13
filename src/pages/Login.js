import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userData = await login(formData.email, formData.password);
      
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

  return (
    <div className="auth-container">
      {/* Left side - Form */}
      <div className="auth-form-side">
        <div className="auth-header">
          <h1>Sign In</h1>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="login-template-container">
          <form className="login-card" onSubmit={handleSubmit}>
            <h1 className="login-title">Sign In</h1>
            <div className="login-input-group">
              <input
                type="email"
                id="email"
                name="email"
                className="login-input"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="login-input-group">
              <input
                type="password"
                id="password"
                name="password"
                className="login-input"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="login-forgot-row">
              <Link to="/forgot-password" className="login-forgot-link">Forgot Password ?</Link>
            </div>
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? <span className="button-spinner"></span> : 'Sign In'}
            </button>
            <div className="login-or">Or Sign in with</div>
            <div className="login-social-row">
              <button type="button" className="login-social-btn"><i className="fab fa-google"></i></button>
              <button type="button" className="login-social-btn"><i className="fab fa-apple"></i></button>
              <button type="button" className="login-social-btn"><i className="fab fa-x-twitter"></i></button>
            </div>
            <Link to="#" className="login-agreement">Learn user licence agreement</Link>
          </form>
        </div>
      </div>

      {/* Right side - Info panel */}
      <div className="auth-info-side">
        <h2 className="info-title">New here?</h2>
        <p className="info-text">Sign up and discover</p>
        <Link to="/register" className="signup-button">
          SIGN UP
        </Link>
      </div>
    </div>
  );
};

export default Login;