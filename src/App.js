import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SecurityPanel from './pages/SecurityPanel';
import AdminPanel from './pages/AdminPanel';
import Unauthorized from './pages/Unauthorized';
import FAQ from './pages/FAQ';
import About from './pages/About';
import HelpCenter from './pages/HelpCenter';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected routes */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute 
                element={<Profile />} 
                allowedRoles={['user', 'admin', 'security']} 
              />
            } 
          />
          <Route 
            path="/security" 
            element={
              <ProtectedRoute 
                element={<SecurityPanel />} 
                allowedRoles={['security', 'admin']} 
              />
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute 
                element={<AdminPanel />} 
                allowedRoles={['admin']} 
              />
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
