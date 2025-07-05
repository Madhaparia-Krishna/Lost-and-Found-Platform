import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import NotificationBell from './components/NotificationBell';
import TestImage from './components/TestImage';

// Layouts
import DashboardLayout from './components/layouts/DashboardLayout';

// Routes
import PrivateRoute from './components/routes/PrivateRoute';
import PublicRoute from './components/routes/PublicRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import ItemDetail from './pages/ItemDetail';
import Security from './pages/Security';
import Admin from './pages/Admin';
import Unauthorized from './pages/Unauthorized';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import TestRole from './pages/TestRole';
import TestMatchPage from './pages/TestMatchPage';

// Footer Pages
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';

// Dashboard Pages
import FoundItems from './pages/dashboard/FoundItems';
import LostItems from './pages/dashboard/LostItems';
import RequestedItems from './pages/dashboard/RequestedItems';
import ReturnedItems from './pages/dashboard/ReturnedItems';

// Form Pages
import ReportLostItem from './pages/forms/ReportLostItem';
import ReportFoundItem from './pages/forms/ReportFoundItem';
import EditItem from './pages/forms/EditItem';

// Styles
import './App.css';
import './styles/custom.css';
import './styles/logo.css';

// AppContent component to conditionally render the Navbar
const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname.includes('/reset-password');

  return (
    <>
      {/* Only show Navbar if not on auth pages */}
      {!isAuthPage && <Navbar />}
      
      {/* Main Content */}
      <div className="app-container">
        <Routes>
          {/* Public routes - Home page is always accessible */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Footer pages */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Dashboard routes */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/dashboard/found-items" replace />} />
            <Route path="found-items" element={<FoundItems />} />
            <Route path="lost-items" element={<LostItems />} />
            <Route path="requested-items" element={<RequestedItems />} />
            <Route path="returned-items" element={<ReturnedItems />} />
          </Route>
          
          {/* Item form routes */}
          <Route path="/report-lost" element={
            <PrivateRoute>
              <ReportLostItem />
            </PrivateRoute>
          } />
          <Route path="/report-found" element={
            <PrivateRoute>
              <ReportFoundItem />
            </PrivateRoute>
          } />
          <Route path="/forms/report-found" element={
            <PrivateRoute>
              <ReportFoundItem />
            </PrivateRoute>
          } />
          <Route path="/edit-item/:id" element={
            <PrivateRoute>
              <EditItem />
            </PrivateRoute>
          } />
          
          {/* Item details */}
          <Route path="/items/:id" element={
            <PrivateRoute>
              <ItemDetail />
            </PrivateRoute>
          } />
          
          {/* Security staff routes */}
          <Route path="/security" element={
            <PrivateRoute requireRole="security">
              <Security />
            </PrivateRoute>
          } />
          <Route path="/security-dashboard" element={
            <PrivateRoute requireRole="security">
              <Security />
            </PrivateRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <PrivateRoute requireRole="admin">
              <Admin />
            </PrivateRoute>
          } />
          <Route path="/admin/dashboard" element={
            <PrivateRoute requireRole="admin">
              <Admin />
            </PrivateRoute>
          } />
          
          {/* Profile route */}
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          
          {/* Password reset routes */}
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          
          {/* Test role route */}
          <Route path="/test-role" element={<TestRole />} />
          
          {/* Match testing routes */}
          <Route path="/dev/test-match" element={
            <PrivateRoute>
              <TestMatchPage />
            </PrivateRoute>
          } />
          
          {/* TestImage route */}
          <Route path="/test-image" element={<TestImage />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#27ae60',
                },
              },
              error: {
                style: {
                  background: '#e74c3c',
                },
                duration: 4000,
              },
            }}
          />
          
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
