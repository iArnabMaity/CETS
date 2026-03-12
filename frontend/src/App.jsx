import React, { useState, useEffect, useCallback, useRef } from 'react';

// Import all your existing, functioning components
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployerDashboard from './components/EmployerDashboard';
import AdminDashboard from './components/AdminDashboard';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// 1. Import the Analytics helper
import { SpeedInsights } from "@vercel/speed-insights/react"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>,
)

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('landing');
  const [isInitializing, setIsInitializing] = useState(true);
  const idleTimerRef = useRef(null);

  // --- Token Persistence ---
  useEffect(() => {
    const storedUser = localStorage.getItem('cets_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem('cets_user');
      }
    }
    setIsInitializing(false);
  }, []);

  // --- 30-Minute Idle Session Timeout ---
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      handleSetUser(null);
      alert('⏱ Session expired due to 30 minutes of inactivity. Please log in again.');
    }, SESSION_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer));
    resetIdleTimer(); // start the timer
    return () => {
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

  const handleSetUser = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('cets_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('cets_user');
    }
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020817] text-white">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 1. If a user is securely logged in, route them to their specific dashboard
  if (user) {
    if (user.role === 'employee') {
      return <EmployeeDashboard user={user} setUser={handleSetUser} />;
    }
    if (user.role === 'employer') {
      return <EmployerDashboard user={user} setUser={handleSetUser} />;
    }
    if (user.role === 'admin') {
      return <AdminDashboard user={user} setUser={handleSetUser} />;
    }

    // Failsafe catch-all
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <p>Error: Unrecognized role assigned to user.</p>
        <button onClick={() => handleSetUser(null)} className="ml-4 px-4 py-2 bg-indigo-600 rounded">Log Out</button>
      </div>
    );
  }

  // 2. If nobody is logged in, show the original Landing Page by default
  if (currentView === 'landing') {
    return <LandingPage
      onNavigateToAuth={() => setCurrentView('auth')}
      setUser={setUser}
      darkMode={true}
    />;
  }

  // 3. When they click "Get Started" on the landing page, show the Auth/CAPTCHA screen
  if (currentView === 'auth') {
    return <AuthPage setUser={handleSetUser} onBack={() => setCurrentView('landing')} />;
  }

  return null;
}