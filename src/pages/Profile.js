import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/AuthForms.css';

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
        
        <div className="login-input-group">
          <input
            type="text"
            id="name"
            name="name"
            className="login-input"
            placeholder="Full Name"
            value={profile.name}
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
            value={profile.email}
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