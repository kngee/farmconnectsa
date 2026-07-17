// Shared display helpers for farmer profile data

// Helper function to format dates
export const formatDate = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Robust Location Renderer
export const renderLocation = (loc) => {
  if (!loc || loc === 'unknown') return 'Location Unknown';
  if (typeof loc === 'string') return loc;
  return [loc.nearestTown, loc.province].filter(Boolean).join(', ') || 'Location Unknown';
};
