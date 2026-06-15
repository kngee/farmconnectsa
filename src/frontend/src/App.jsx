import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import LandingPage from './pages/LandingPage/LandingPage.jsx';
import AuthPage    from './pages/AuthPage/AuthPage.jsx';
import Dashboard   from './pages/Dashboard/Dashboard.jsx';
import './global.css';

/*
  ProtectedRoute:
  - undefined  → still resolving auth state, show blank dark screen
  - null       → not signed in, redirect to /auth
  - User obj   → signed in, render children
*/
function ProtectedRoute({ user, children }) {
  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F2A1A' }} aria-busy="true" />
    );
  }
  if (user === null) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
    });
    return unsubscribe; // clean up listener on unmount
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/auth"      element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <Dashboard user={user} />
            </ProtectedRoute>
          }
        />
        {/* Catch-all: send unknown routes back to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}