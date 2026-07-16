import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.js'; 
import './Auctions.css';

/* ── Inline icon set ── */
const IconSearch = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconChevronLeft = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconChevronRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconArrowUp = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
  </svg>
);
const IconArrowDown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
  </svg>
);
const IconChevronsUpDown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 15 12 20 17 15" /><polyline points="7 9 12 4 17 9" />
  </svg>
);
const IconTrendingUp = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconTrendingDown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
  </svg>
);
const IconClock = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/* ── Date helpers ── */
const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getRelativeLabel = (date) => {
  const today = startOfToday();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  return 'Upcoming';
};

const buildCalendarCells = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

/* ── Small presentational helpers ── */
function StatCard({ icon, label, value, valueClass = '' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <span className={`stat-value ${valueClass}`}>{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function Auctions() {
  const [marketPrices, setMarketPrices] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingAuctions, setLoadingAuctions] = useState(true);

  // ── Table interaction state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'productName', direction: 'asc' });

  // ── Calendar interaction state ──
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(null);

  // ── Sync Live Market Prices from Firestore ──
  useEffect(() => {
    const marketQuery = query(
      collection(db, 'market_prices'),
      orderBy('dateRecorded', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(marketQuery, (snapshot) => {
      const prices = [];
      snapshot.forEach((doc) => {
        prices.push({ id: doc.id, ...doc.data() });
      });

      const uniqueLatestPrices = reduceToLatest(prices);
      setMarketPrices(uniqueLatestPrices);
      setLoadingPrices(false);
    }, (error) => {
      console.error("Error fetching live market prices: ", error);
      setLoadingPrices(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Sync Upcoming Auctions from Firestore ──
  useEffect(() => {
    const auctionsQuery = query(
      collection(db, 'auction_schedules'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(auctionsQuery, (snapshot) => {
      const loadedAuctions = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        loadedAuctions.push({
          id: doc.id,
          ...data,
          date: dateObj
        });
      });
      setAuctions(loadedAuctions);
      setLoadingAuctions(false);
    }, (error) => {
      console.error("Error fetching live auctions: ", error);
      setLoadingAuctions(false);
    });

    return () => unsubscribe();
  }, []);

  const reduceToLatest = (allPrices) => {
    const map = new Map();
    allPrices.forEach(item => {
      if (!map.has(item.productName)) {
        map.set(item.productName, item);
      }
    });
    return Array.from(map.values());
  };

  /* ── Derived: Top Gainer & Biggest Drop ── */
  const marketMovers = useMemo(() => {
    if (!marketPrices || marketPrices.length === 0) return { gainer: null, loser: null };
    
    // Filter out items without a valid change metric
    const validPrices = marketPrices.filter(p => typeof p.change === 'number');
    if (validPrices.length === 0) return { gainer: null, loser: null };

    const sortedByChange = [...validPrices].sort((a, b) => b.change - a.change);
    return {
      gainer: sortedByChange[0].change > 0 ? sortedByChange[0] : null,
      loser: sortedByChange[sortedByChange.length - 1].change < 0 ? sortedByChange[sortedByChange.length - 1] : null
    };
  }, [marketPrices]);

  /* ── Derived: category list for the filter dropdown ── */
  const categories = useMemo(() => {
    const set = new Set(marketPrices.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [marketPrices]);

  /* ── Derived: filtered + sorted price rows ── */
  const filteredPrices = useMemo(() => {
    let rows = marketPrices;

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      rows = rows.filter((item) => item.productName?.toLowerCase().includes(term));
    }
    if (categoryFilter !== 'all') {
      rows = rows.filter((item) => item.category === categoryFilter);
    }

    const { key, direction } = sortConfig;
    const sorted = [...rows].sort((a, b) => {
      if (key === 'price' || key === 'change') {
        const aVal = a[key] ?? 0;
        const bVal = b[key] ?? 0;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aVal = (a[key] ?? '').toString().toLowerCase();
      const bVal = (b[key] ?? '').toString().toLowerCase();
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [marketPrices, searchTerm, categoryFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortableHeader = (label, key) => {
    const isActive = sortConfig.key === key;
    return (
      <button type="button" className={`sort-btn${isActive ? ' active' : ''}`} onClick={() => handleSort(key)}>
        {label}
        {isActive ? (
          sortConfig.direction === 'asc' ? <IconArrowUp className="sort-icon" /> : <IconArrowDown className="sort-icon" />
        ) : (
          <IconChevronsUpDown className="sort-icon" />
        )}
      </button>
    );
  };

  const upcomingAuctions = useMemo(() => {
    const today = startOfToday();
    return auctions.filter((a) => a.date >= today);
  }, [auctions]);

  const auctionsByDateKey = useMemo(() => {
    const map = new Map();
    upcomingAuctions.forEach((a) => {
      const key = toDateKey(a.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return map;
  }, [upcomingAuctions]);

  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);
  const todayKey = toDateKey(new Date());

  const displayedAuctions = useMemo(() => {
    if (!selectedDateKey) return upcomingAuctions;
    return upcomingAuctions.filter((a) => toDateKey(a.date) === selectedDateKey);
  }, [upcomingAuctions, selectedDateKey]);

  const goToPrevMonth = () => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const nextAuction = upcomingAuctions[0];

  return (
    <main className="dashboard-content">
      {/* ── Page Title ── */}
      <div className="content-header">
        <div>
          <h1 className="content-title">Live Auctions & Market Trends</h1>
          <p className="content-subtitle">
            Real-time pricing data and scheduled regional farm stock events synced directly from AMT and BKB.
          </p>
        </div>
      </div>

      {/* ── At-a-glance stats ── */}
      <div className="stats-row">
        {/* Top Gainer Block */}
        <StatCard 
          icon={<IconTrendingUp className="icon" style={{ color: '#25D366' }} />} 
          label={marketMovers.gainer ? marketMovers.gainer.productName.replace(/_/g, ' ') : "No active gains"} 
          value={loadingPrices ? '—' : marketMovers.gainer ? `+${marketMovers.gainer.change}%` : '0.00%'} 
          valueClass="price-change--up"
        />
        
        {/* Biggest Drop Block */}
        <StatCard 
          icon={<IconTrendingDown className="icon" style={{ color: '#E74C3C' }} />} 
          label={marketMovers.loser ? marketMovers.loser.productName.replace(/_/g, ' ') : "No active losses"} 
          value={loadingPrices ? '—' : marketMovers.loser ? `${marketMovers.loser.change}%` : '0.00%'} 
          valueClass="price-change--down"
        />

        {/* Next Scheduled Auction highlight block */}
        <div className="stat-card stat-card--highlight" style={{ gridColumn: 'span 2' }}>
          <div className="stat-icon"><IconClock className="icon" /></div>
          <div className="stat-body">
            {loadingAuctions ? (
              <span className="stat-value">Loading…</span>
            ) : nextAuction ? (
              <>
                <span className="stat-value">{nextAuction.title}</span>
                <span className="stat-label">
                  {getRelativeLabel(nextAuction.date)} · {nextAuction.date.toLocaleDateString('default', { day: 'numeric', month: 'short' })} · {nextAuction.location}
                </span>
              </>
            ) : (
              <>
                <span className="stat-value">No auctions scheduled</span>
                <span className="stat-label">Check back soon</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Inner Content Grid ── */}
      <div className="auctions-grid">

        {/* Left: Market Prices */}
        <div className="auctions-card market-prices-panel">
          <div className="card-header">
            <h2 className="card-title">Live Market Index (ZAR)</h2>
            <span className="source-tag">Source: AMT</span>
          </div>

          {loadingPrices ? (
            <div className="loader">Synchronizing prices from database...</div>
          ) : marketPrices.length === 0 ? (
            <div className="empty-state">No live market data available in Firestore. Run the scraper.</div>
          ) : (
            <>
              <div className="table-controls">
                <div className="search-box">
                  <IconSearch className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search commodities…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search commodities"
                  />
                </div>
                <select
                  className="filter-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="all">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>

              <p className="results-count">
                Showing {filteredPrices.length} of {marketPrices.length} commodities
              </p>

              {filteredPrices.length === 0 ? (
                <div className="empty-state">No commodities match your search or filter.</div>
              ) : (
                <div className="price-table">
                  <div className="price-table__header">
                    <div>{renderSortableHeader('Commodity', 'productName')}</div>
                    <div>{renderSortableHeader('Price', 'price')}</div>
                    <div>{renderSortableHeader('Change', 'change')}</div>
                    <div>{renderSortableHeader('Unit', 'quantityType')}</div>
                    <div>{renderSortableHeader('Category', 'category')}</div>
                  </div>
                  <div className="price-table__body">
                    {filteredPrices.map((item) => (
                      <div className="price-table__row" key={item.id}>
                        <div className="price-name">
                          <strong>{item.productName.replace(/_/g, ' ')}</strong>
                        </div>
                        <div className="price-value">
                          R {item.price?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </div>
                        
                        {/* New Change Column */}
                        <div className={`price-change ${item.change > 0 ? 'price-change--up' : item.change < 0 ? 'price-change--down' : 'price-change--neutral'}`}>
                          {item.change > 0 ? '▲ ' : item.change < 0 ? '▼ ' : ''}
                          {item.change ? `${Math.abs(item.change).toFixed(2)}%` : '0.00%'}
                        </div>

                        <div className="price-unit">{item.quantityType}</div>
                        <div className="price-category">
                          <span className={`category-badge category-badge--${item.category}`}>
                            {item.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Upcoming Auctions */}
        <div className="auctions-card schedules-panel">
          <div className="card-header">
            <h2 className="card-title">Upcoming Schedules</h2>
            <span className="source-tag">Source: BKB</span>
          </div>

          {loadingAuctions ? (
            <div className="loader">Parsing upcoming schedules...</div>
          ) : (
            <>
              <div className="calendar-widget">
                <div className="calendar-nav">
                  <button type="button" className="calendar-nav-btn" onClick={goToPrevMonth} aria-label="Previous month">
                    <IconChevronLeft className="icon" />
                  </button>
                  <span className="calendar-month-label">
                    {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button type="button" className="calendar-nav-btn" onClick={goToNextMonth} aria-label="Next month">
                    <IconChevronRight className="icon" />
                  </button>
                </div>
                <div className="calendar-weekdays">
                  {WEEKDAY_LABELS.map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <div className="calendar-grid">
                  {calendarCells.map((cell, idx) => {
                    if (!cell) return <div className="calendar-day calendar-day--empty" key={idx} />;
                    const key = toDateKey(cell);
                    const hasEvent = auctionsByDateKey.has(key);
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDateKey;
                    return (
                      <button
                        type="button"
                        key={idx}
                        className={[
                          'calendar-day',
                          isToday ? 'calendar-day--today' : '',
                          isSelected ? 'calendar-day--selected' : '',
                          hasEvent ? 'calendar-day--has-event' : ''
                        ].filter(Boolean).join(' ')}
                        disabled={!hasEvent}
                        onClick={() => setSelectedDateKey(isSelected ? null : key)}
                        aria-label={hasEvent ? `${cell.toDateString()} — ${auctionsByDateKey.get(key).length} auction(s)` : cell.toDateString()}
                      >
                        {cell.getDate()}
                        {hasEvent && <span className="calendar-dot" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="upcoming-list-header">
                <h3 className="upcoming-list-title">
                  {selectedDateKey
                    ? new Date(selectedDateKey).toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'short' })
                    : 'Upcoming events'}
                </h3>
                {selectedDateKey && (
                  <button type="button" className="clear-filter-btn" onClick={() => setSelectedDateKey(null)}>
                    Clear
                  </button>
                )}
              </div>

              {displayedAuctions.length === 0 ? (
                <div className="empty-state">No upcoming auction events scheduled.</div>
              ) : (
                <div className="schedules-list">
                  {displayedAuctions.map((auction) => (
                    <div className="schedule-item" key={auction.id}>
                      <div className="schedule-date-box">
                        <span className="schedule-month">
                          {auction.date.toLocaleString('default', { month: 'short' })}
                        </span>
                        <span className="schedule-day">
                          {auction.date.getDate()}
                        </span>
                      </div>
                      <div className="schedule-details">
                        <h3 className="schedule-title">{auction.title}</h3>
                        <p className="schedule-location">📍 {auction.location}</p>
                      </div>
                      <div className="schedule-status">
                        <span className="status-pill status-pill--active">
                          {getRelativeLabel(auction.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </main>
  );
}