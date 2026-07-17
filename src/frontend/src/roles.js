// Role model: role constants, display labels, and the tab access matrix

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  STATE_VET: 'state_vet',
  AUCTIONEER: 'auctioneer',
  FARMER: 'farmer',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  state_vet: 'State Veterinarian',
  auctioneer: 'Auctioneer',
  farmer: 'Farmer',
};

export const STAFF_ROLES = [ROLES.SUPER_ADMIN, ROLES.STATE_VET, ROLES.AUCTIONEER];

// Which roles may see each admin dashboard tab
export const TAB_ACCESS = {
  chatLogs: [ROLES.SUPER_ADMIN, ROLES.STATE_VET],
  profiles: [ROLES.SUPER_ADMIN, ROLES.STATE_VET],
  alerts:   [ROLES.SUPER_ADMIN, ROLES.STATE_VET],
  auctions: [ROLES.SUPER_ADMIN, ROLES.AUCTIONEER],
  users:    [ROLES.SUPER_ADMIN],
};

export const isStaff = (role) => STAFF_ROLES.includes(role);

export const canAccess = (role, tab) => (TAB_ACCESS[tab] || []).includes(role);

// First dashboard page each role can actually see. The /dashboard index is
// Chat Logs, which auctioneers cannot access — sending them to their own tab
// keeps guard redirects from ever looping.
export const homeTabPath = (role) => {
  if (role === ROLES.AUCTIONEER) return '/dashboard/auctions';
  if (isStaff(role)) return '/dashboard';
  return '/farmer-dashboard';
};

export const postLoginPath = (role) =>
  role === ROLES.SUPER_ADMIN ? '/select-role' : homeTabPath(role);
