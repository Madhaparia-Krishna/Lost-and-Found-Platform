import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminPanel from './pages/AdminPanel';
import Unauthorized from './pages/Unauthorized';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import FoundForm from './pages/FoundForm.jsx';
import LostForm from './pages/LostForm.jsx';
import ViewAllItems from './pages/ViewAllItems';
import SecurityDashboard from './pages/SecurityDashboard';
import ClaimForm from './pages/ClaimForm';

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
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/items" element={<ViewAllItems />} />

          {/* Protected routes */}
          <Route 
            path="/found" 
            element={
              <ProtectedRoute 
                element={<FoundForm />} 
                allowedRoles={['user', 'admin', 'security']} 
              />
            } 
          />
          <Route 
            path="/lost" 
            element={
              <ProtectedRoute 
                element={<LostForm />} 
                allowedRoles={['user', 'admin', 'security']} 
              />
            } 
          />
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
                element={<SecurityDashboard />} 
                allowedRoles={['security', 'admin']} 
              />
            } 
          />
          <Route 
            path="/security-dashboard" 
            element={
              <ProtectedRoute 
                element={<SecurityDashboard />} 
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
          
          {/* Claim form route */}
          <Route 
            path="/claim/:itemId" 
            element={
              <ProtectedRoute 
                element={<ClaimForm />} 
                allowedRoles={['user', 'admin', 'security']} 
              />
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
