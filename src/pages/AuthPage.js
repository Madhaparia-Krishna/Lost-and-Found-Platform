import React from 'react';
import { useLocation } from 'react-router-dom';
import AuthForms from '../components/AuthForms';
import '../styles/AuthPage.css';

const AuthPage = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  
  return (
    <div className="auth-page">
      <AuthForms initialForm={isLoginPage ? 'login' : 'register'} />
    </div>
  );
};

export default AuthPage; 