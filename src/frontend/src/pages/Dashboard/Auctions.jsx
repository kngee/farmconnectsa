import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.js'; // Adjust path based on where your firebase.js is located
import './Auctions.css';

export default function Auctions() {
  const [marketPrices, setMarketPrices] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingAuctions, setLoadingAuctions] = useState(true);

  // ── Sync Live Market Prices from Firestore ──
  useEffect(() => {
    // We query the market prices ordered by the date recorded, limiting to the latest records
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
      
      // Group by category to prevent duplicate historical plots and only show current averages
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
        // Convert Firestore Timestamp to Native JS Date
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

  // Helper utility to keep only the latest price entry per product name
  const reduceToLatest = (allPrices) => {
    const map = new Map();
    allPrices.forEach(item => {
      if (!map.has(item.productName)) {
        map.set(item.productName, item);
      }
    });
    return Array.from(map.values());
  };

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
            <div className="price-table">
              <div className="price-table__header">
                <span>Commodity</span>
                <span>Price</span>
                <span>Unit</span>
                <span>Category</span>
              </div>
              <div className="price-table__body">
                {marketPrices.map((item) => (
                  <div className="price-table__row" key={item.id}>
                    <div className="price-name">
                      <strong>{item.productName.replace(/_/g, ' ')}</strong>
                    </div>
                    <div className="price-value">
                      R {item.price?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
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
        </div>

        {/* Right: Upcoming Auctions */}
        <div className="auctions-card schedules-panel">
          <div className="card-header">
            <h2 className="card-title">Upcoming Schedules</h2>
            <span className="source-tag">Source: BKB</span>
          </div>

          {loadingAuctions ? (
            <div className="loader">Parsing upcoming schedules...</div>
          ) : auctions.length === 0 ? (
            <div className="empty-state">No upcoming auction events scheduled.</div>
          ) : (
            <div className="schedules-list">
              {auctions.map((auction) => {
                const isPast = auction.date < new Date();
                return (
                  <div className={`schedule-item ${isPast ? 'schedule-item--past' : ''}`} key={auction.id}>
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
                      <span className={`status-pill ${isPast ? 'status-pill--past' : 'status-pill--active'}`}>
                        {isPast ? 'Completed' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}