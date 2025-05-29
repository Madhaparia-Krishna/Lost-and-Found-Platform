import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Profile.css';

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
        const response = await fetch('/api/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch profile');
        }
        
        const data = await response.json();
        setProfile(data.profile);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message);
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
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: profile.name,
          admission_number: profile.admission_number,
          faculty_school: profile.faculty_school,
          year_of_study: profile.year_of_study,
          phone_number: profile.phone_number
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update profile');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      setSuccess('Profile updated successfully');
      setError(null);
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message);
      setSuccess(null);
      setLoading(false);
    }
  };
  
  if (loading && !profile.name) {
    return <div className="profile-container">Loading...</div>;
  }
  
  return (
    <div className="profile-container">
      <h1>Your Profile</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={profile.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={profile.email}
            disabled
            className="disabled-input"
          />
          <small>Email cannot be changed</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="admission_number">Admission Number</label>
          <input
            type="text"
            id="admission_number"
            name="admission_number"
            value={profile.admission_number || ''}
            onChange={handleChange}
            placeholder="e.g., S12345"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="faculty_school">Faculty/School</label>
          <input
            type="text"
            id="faculty_school"
            name="faculty_school"
            value={profile.faculty_school || ''}
            onChange={handleChange}
            placeholder="e.g., School of Computing"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="year_of_study">Year of Study</label>
          <select
            id="year_of_study"
            name="year_of_study"
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
        
        <div className="form-group">
          <label htmlFor="phone_number">Phone Number</label>
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            value={profile.phone_number || ''}
            onChange={handleChange}
            placeholder="e.g., +1234567890"
          />
        </div>
        
        <button type="submit" className="update-button" disabled={loading}>
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
      
      <div className="profile-actions">
        <button 
          className="back-button" 
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
        <a href="/forgot-password" className="password-link">Reset Password</a>
      </div>
    </div>
  );
}

export default Profile; 