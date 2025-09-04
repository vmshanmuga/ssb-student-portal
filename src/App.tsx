import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase/config';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Dashboards from './pages/Dashboards';
import Assignments from './pages/Assignments';
import Announcements from './pages/Announcements';
import Resources from './pages/Resources';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground text-xl">Loading SSB Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
            },
          }}
        />
        <Login />
      </>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          },
        }}
      />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboards" element={<Dashboards />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="resources" element={<Resources />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;