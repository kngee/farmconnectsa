import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { ensureUserDoc } from './services/userService.js';
import { ROLES, isStaff, homeTabPath, postLoginPath } from './roles.js';

// Page Imports
import LandingPage from './pages/LandingPage/LandingPage.jsx';
import AuthPage from './pages/AuthPage/AuthPage.jsx';
import RoleSelection from './pages/RoleSelection/RoleSelection.jsx';
import PublicAuctions from './pages/PublicAuctions/PublicAuctions.jsx';
import DashboardLayout from './pages/Dashboard/DashboardLayout.jsx';
import ChatLogs from './pages/Dashboard/Chatlogs.jsx';
import FarmerProfiles from './pages/Dashboard/FarmerProfiles.jsx';
import Alerts from './pages/Dashboard/Alerts.jsx';
import AuctionManagement from './pages/Dashboard/AuctionManagement.jsx';
import UserManagement from './pages/Dashboard/UserManagement.jsx';
import FarmerDashboard from './pages/FarmerDashboard/FarmerDashboard.jsx';
import FarmerProfile from './pages/FarmerDashboard/FarmerProfile.jsx';
import FarmerMarketplace from './pages/FarmerDashboard/FarmerMarketplace.jsx';
import Marketplace from './pages/Dashboard/Marketplace.jsx';
import AuctionHub from './components/AuctionHub/AuctionHub.jsx';
import RequireRole from './components/RequireRole.jsx';

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
      '/auctions': 'Auction Hub - FarmConnectSA',
      '/select-role': 'Choose Role - FarmConnectSA',
      '/dashboard': 'Admin Dashboard - FarmConnectSA',
      '/dashboard/auctions': 'Auction Management - FarmConnectSA',
      '/dashboard/marketplace': 'Marketplace - FarmConnectSA',
      '/dashboard/users': 'User Management - FarmConnectSA',
      '/farmer-dashboard': 'Farmer Dashboard - FarmConnectSA',
      '/farmer-dashboard/auctions': 'Auction Hub - FarmConnectSA',
      '/farmer-dashboard/marketplace': 'Marketplace - FarmConnectSA',
    };

    document.title = titles[location.pathname] || 'FarmConnectSA';
  }, [location]);

  return null;
}

function App() {
  // undefined = resolving auth/role, null = signed out, { user, role } = signed in
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setSession(null);
        return;
      }
      setSession(undefined);
      // Least privilege on failure: an unreadable role means farmer access only
      const role = await ensureUserDoc(currentUser).catch((err) => {
        console.error('Could not resolve user role:', err);
        return ROLES.FARMER;
      });
      setSession({ user: currentUser, role });
    });

    return () => unsubscribe();
  }, []);

  // Show loading screen while auth + role resolve
  if (session === undefined) {
    return <div style={{ backgroundColor: '#1a1a1a', height: '100vh' }} />;
  }

  const user = session?.user ?? null;
  const role = session?.role ?? null;

  return (
    <BrowserRouter>
      <TitleUpdater />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auctions" element={<PublicAuctions />} />
        <Route
          path="/auth"
          element={user ? <Navigate to={postLoginPath(role)} replace /> : <AuthPage />}
        />

        {/* Role Selection (super admin only) */}
        <Route
          path="/select-role"
          element={
            !user
              ? <Navigate to="/auth" replace />
              : role === ROLES.SUPER_ADMIN ? <RoleSelection /> : <Navigate to={homeTabPath(role)} replace />
          }
        />

        {/* Admin Dashboard (staff roles; tabs gated per role) */}
        <Route
          path="/dashboard"
          element={
            !user
              ? <Navigate to="/auth" replace />
              : isStaff(role) ? <DashboardLayout user={user} role={role} /> : <Navigate to="/farmer-dashboard" replace />
          }
        >
          {/* These components render inside the DashboardLayout's <Outlet /> */}
          <Route index element={<RequireRole role={role} tab="chatLogs"><ChatLogs /></RequireRole>} />
          <Route path="profiles" element={<RequireRole role={role} tab="profiles"><FarmerProfiles /></RequireRole>} />
          <Route path="alerts" element={<RequireRole role={role} tab="alerts"><Alerts /></RequireRole>} />
          <Route path="auctions" element={<RequireRole role={role} tab="auctions"><AuctionManagement /></RequireRole>} />
          <Route path="marketplace" element={<RequireRole role={role} tab="marketplace"><Marketplace /></RequireRole>} />
          <Route path="users" element={<RequireRole role={role} tab="users"><UserManagement /></RequireRole>} />
        </Route>

        {/* Farmer Dashboard (any authenticated user) */}
        <Route
          path="/farmer-dashboard"
          element={user ? <FarmerDashboard user={user} role={role} /> : <Navigate to="/auth" replace />}
        >
          <Route index element={<FarmerProfile />} />
          <Route path="auctions" element={<AuctionHub />} />
          <Route path="marketplace" element={<FarmerMarketplace />} />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
