import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/AuthForms.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Monitor authentication state changes
  useEffect(() => {
    if (currentUser) {
      // Redirect to homepage if already logged in
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // Use our AuthContext register function directly
      await register(name, email, password);
      // Redirect to homepage after successful registration
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-template-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">Sign Up</h1>
        {error && <div className="login-error">{error}</div>}
        <div className="login-input-group">
          <input
            type="text"
            id="name"
            className="login-input"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
            minLength={8}
          />
        </div>
        <div className="login-input-group">
          <input
            type="password"
            id="confirmPassword"
            className="login-input"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-btn" disabled={isLoading}>
          {isLoading ? <span className="button-spinner"></span> : 'Sign Up'}
        </button>
        <p className="signup-prompt">
          Already have an account? <Link to="/login" className="login-link">Sign In</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;