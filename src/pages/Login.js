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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">EMAIL ADDRESS</label>
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
            <label htmlFor="password">PASSWORD</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="button-spinner"></span> SIGNING IN...
              </>
            ) : (
              'SIGN IN'
            )}
          </button>
        </form>
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