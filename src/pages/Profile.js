import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import '../styles/AuthForms.css';
import axios from 'axios';

function Profile() {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    admission_number: '',
    faculty_school: '',
    year_of_study: '',
    phone_number: ''
  });
  
  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        console.log('Fetching profile with token:', currentUser.token);
        
        const response = await axios.get(`${API_BASE_URL}/api/profile`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Profile response:', response.data);
        setProfile(response.data.profile);
        setError(null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [currentUser, navigate]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare profile data with proper types
      const profileData = {
        name: profile.name || '',
        admission_number: profile.admission_number || '',
        faculty_school: profile.faculty_school || '',
        year_of_study: profile.year_of_study || '',
        phone_number: profile.phone_number || ''
      };
      
      console.log('Updating profile with data:', profileData);
      
      const response = await axios.put(`${API_BASE_URL}/api/profile`, profileData, {
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Profile update response:', response.data);
      
      setProfile(response.data.profile);
      setSuccess('Profile updated successfully');
      
      // Update the user's name in localStorage
      if (response.data.profile && response.data.profile.name) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userData.name = response.data.profile.name;
          localStorage.setItem('user', JSON.stringify(userData));
        }
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !profile.name) {
    return (
      <div className="login-template-container">
        <div className="login-card">
          <h1 className="login-title">Your Profile</h1>
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="login-template-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">Your Profile</h1>
        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}
        
        {/* Admin access panel only */}
        {currentUser && currentUser.role === 'admin' && (
          <div className="role-panels">
            <div className="admin-panel-access">
              <h3>Admin Access</h3>
              <p>You have administrator privileges.</p>
              <Link to="/admin" className="panel-access-btn admin-btn">
                Go to Admin Panel
              </Link>
            </div>
          </div>
        )}
        
        {/* Security access panel only */}
        {currentUser && currentUser.role === 'security' && (
          <div className="role-panels">
            <div className="security-panel-access">
              <h3>Security Access</h3>
              <p>You have security staff privileges.</p>
              <Link to="/security" className="panel-access-btn security-btn">
                Go to Security Panel
              </Link>
            </div>
          </div>
        )}
        
        <div className="login-input-group">
          <input
            type="text"
            id="name"
            name="name"
            className="login-input"
            placeholder="Full Name"
            value={profile.name || ''}
            onChange={handleChange}
            required
          />
        </div>
        <div className="login-input-group">
          <input
            type="email"
            id="email"
            name="email"
            className="login-input"
            value={profile.email || ''}
            disabled
          />
          <small style={{ color: '#888', marginTop: '5px', display: 'block' }}>Email cannot be changed</small>
        </div>
        <div className="login-input-group">
          <input
            type="text"
            id="admission_number"
            name="admission_number"
            className="login-input"
            placeholder="Admission Number"
            value={profile.admission_number || ''}
            onChange={handleChange}
          />
        </div>
        <div className="login-input-group">
          <input
            type="text"
            id="faculty_school"
            name="faculty_school"
            className="login-input"
            placeholder="Faculty/School"
            value={profile.faculty_school || ''}
            onChange={handleChange}
          />
        </div>
        <div className="login-input-group">
          <select
            id="year_of_study"
            name="year_of_study"
            className="login-input"
            value={profile.year_of_study || ''}
            onChange={handleChange}
          >
            <option value="">Select Year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
            <option value="5">5th Year</option>
            <option value="Masters">Masters</option>
            <option value="PhD">PhD</option>
            <option value="Staff">Staff</option>
          </select>
        </div>
        <div className="login-input-group">
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            className="login-input"
            placeholder="Phone Number"
            value={profile.phone_number || ''}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? <span className="button-spinner"></span> : 'Update Profile'}
        </button>
        <div style={{ width: '100%', textAlign: 'center', marginTop: '10px' }}>
          <Link to="/forgot-password" className="login-forgot-link">Reset Password</Link>
        </div>
        <div style={{ marginTop: '10px', width: '100%' }}>
          <button 
            type="button" 
            className="login-btn btn-secondary" 
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile; 