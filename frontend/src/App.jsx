import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';

// Import lightweight components eagerly
import LandingPage from './components/LandingPage';
import RoleSelectionPage from './components/RoleSelectionPage';
import ParticleBackground from './components/ParticleBackground';
import BrightnessController from './components/BrightnessController';

// Lazy load heavy dashboard and auth components
const EmployeeAuthPage = lazy(() => import('./components/EmployeeAuthPage'));
const EmployerAuthPage = lazy(() => import('./components/EmployerAuthPage'));
const AdminAuthPage = lazy(() => import('./components/AdminAuthPage'));
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard'));
const EmployerDashboard = lazy(() => import('./components/EmployerDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState(() => {
    return sessionStorage.getItem('cets_current_view') || 'landing';
  });
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

  // --- View Persistence ---
  useEffect(() => {
    sessionStorage.setItem('cets_current_view', currentView);
  }, [currentView]);

  // --- 30-Minute Idle Session Timeout ---
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      handleSetUser(null);
      Swal.fire({
        icon: 'info',
        title: 'Session Expired',
        text: '⏱ Your session has expired due to 30 minutes of inactivity. Please log in again to continue.',
        confirmButtonColor: '#6366f1',
        background: '#0f172a',
        color: '#f1f5f9'
      });
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
    setUser((prevUser) => {
      const newUser = typeof userData === 'function' ? userData(prevUser) : userData;
      if (newUser) {
        localStorage.setItem('cets_user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('cets_user');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
      }
      return newUser;
    });
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020817] text-white">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Wrap content in a common layout to include background and global tools
  const renderView = () => {
    if (user) {
      if (user.role === 'employee') return <EmployeeDashboard user={user} setUser={handleSetUser} />;
      if (user.role === 'employer') return <EmployerDashboard user={user} setUser={handleSetUser} />;
      if (user.role === 'admin') return <AdminDashboard user={user} setUser={handleSetUser} />;
      return (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
          <p>Error: Unrecognized role assigned to user.</p>
          <button onClick={() => handleSetUser(null)} className="ml-4 px-4 py-2 bg-indigo-600 rounded">Log Out</button>
        </div>
      );
    }

    if (currentView === 'landing') {
      return (
        <LandingPage
          key="landing"
          onNavigateToRoleSelection={() => setCurrentView('role-selection')}
          onNavigateToAdminAuth={() => setCurrentView('admin-auth')}
          setUser={handleSetUser}
          darkMode={true}
        />
      );
    }

    if (currentView === 'role-selection') {
      return (
        <RoleSelectionPage
          key="role-selection"
          onNavigateToAuth={(role) => {
            setCurrentView(role === 'employee' ? 'employee-auth' : 'employer-auth');
          }}
          onBack={() => setCurrentView('landing')}
        />
      );
    }

    if (currentView === 'employee-auth') {
      return (
        <EmployeeAuthPage 
          key="employee-auth" 
          setUser={handleSetUser} 
          onBack={() => {
            setCurrentView('role-selection');
          }} 
        />
      );
    }

    if (currentView === 'employer-auth') {
      return (
        <EmployerAuthPage 
          key="employer-auth" 
          setUser={handleSetUser} 
          onBack={() => {
            setCurrentView('role-selection');
          }} 
        />
      );
    }

    if (currentView === 'admin-auth') {
      return (
        <AdminAuthPage 
          key="admin-auth" 
          setUser={handleSetUser} 
          onBack={() => {
            setCurrentView('landing');
          }} 
        />
      );
    }
    return null;
  };

  return (
    <>
      <ParticleBackground />
      <BrightnessController />

      <main className="relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={user ? user.role : currentView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <Suspense fallback={
              <div className="flex h-screen items-center justify-center bg-[#020817]">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }>
              {renderView()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
}