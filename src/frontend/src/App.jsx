import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import LandingPage from './pages/LandingPage/LandingPage';
import AuthPage from './pages/AuthPage/AuthPage';
import Dashboard from './pages/Dashboard/Dashboard';
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Navigate to="/auth" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;