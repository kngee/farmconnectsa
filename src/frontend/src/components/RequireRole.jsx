import { Navigate } from 'react-router-dom';
import { canAccess, homeTabPath } from '../roles.js';

// Guards a dashboard tab: roles without access bounce to their own home tab.
export default function RequireRole({ role, tab, children }) {
  return canAccess(role, tab) ? children : <Navigate to={homeTabPath(role)} replace />;
}
