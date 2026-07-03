import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Page Imports
import LandingPage from './pages/LandingPage/LandingPage';
import AuthPage from './pages/AuthPage/AuthPage';
import DashboardLayout from './pages/Dashboard/DashboardLayout';
import ChatLogs from './pages/Dashboard/ChatLogs';
import FarmerProfiles from './pages/Dashboard/FarmerProfiles';
import Auctions from './pages/Dashboard/Auctions';
import Alerts from './pages/Dashboard/Alerts';

// Styles
import './App.css';
import './global.css';

// Title updater component
function TitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'FarmConnectSA',
      '/auth': 'Sign In - FarmConnectSA',
      '/dashboard': 'Admin Dashboard - FarmConnectSA',
    };
    
    document.title = titles[location.pathname] || 'FarmConnectSA';
  }, [location]);

  return null;
}

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Show loading screen while auth state resolves
  if (user === undefined) {
    return <div style={{ backgroundColor: '#1a1a1a', height: '100vh' }} />;
  }

  return (
    <BrowserRouter>
      <TitleUpdater />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Protected Dashboard Routes (Nested) */}
        <Route 
          path="/dashboard" 
          element={user ? <DashboardLayout user={user} /> : <Navigate to="/auth" />}
        >
          {/* These components render inside the DashboardLayout's <Outlet /> */}
          <Route index element={<ChatLogs />} />
          <Route path="profiles" element={<FarmerProfiles />} />
          <Route path="auctions" element={<Auctions />} />
          <Route path="alerts" element={<Alerts />} />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;