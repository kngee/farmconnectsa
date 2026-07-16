import React from 'react';
import Navbar from '../../components/NavBar/NavBar.jsx';
import Footer from '../../components/Footer/Footer';
import './Auctions.css';

/* ── Mock Data (To be replaced by Firestore ingestion) ── */
const MARKET_PRICES = [
  { id: 1, category: 'Beef A2/3', price: 'R 67,67', unit: 'per Kg', change: '+2.92%', trend: 'up' },
  { id: 2, category: 'Weaners (200-250kg)', price: 'R 45,20', unit: 'per Kg', change: '-0.02%', trend: 'down' },
  { id: 3, category: 'Sheep A2/3', price: 'R 107,20', unit: 'per Kg', change: '-1.78%', trend: 'down' },
  { id: 4, category: 'White Maize', price: 'R 3 295,00', unit: 'per Ton', change: '+0.76%', trend: 'up' },
];

const UPCOMING_AUCTIONS = [
  { 
    id: 'auc-1', 
    title: 'BKB Commercial Cattle Auction', 
    date: '2026-07-24', 
    location: 'Frankfort, Free State',
    status: 'Scheduled'
  },
  { 
    id: 'auc-2', 
    title: 'BKB Merino Stud Sale', 
    date: '2026-07-28', 
    location: 'Graaff-Reinet, Eastern Cape',
    status: 'Scheduled'
  },
  { 
    id: 'auc-3', 
    title: 'Vleissentraal Weaner Auction', 
    date: '2026-08-02', 
    location: 'Jozini, KwaZulu-Natal',
    status: 'Upcoming'
  }
];

export default function Auctions() {
  return (
    <>
      <Navbar />

      {/* ── Hero Section ── */}
      <section className="hero hero--compact">
        <div className="hero__grid" aria-hidden="true" />
        <div className="hero__content">
          <p className="hero__eyebrow">Market Intelligence</p>
          <h1 className="hero__headline" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
            Live <em>Auctions</em> & Prices
          </h1>
          <p className="hero__body">
            Real-time agricultural market trends and localized auction schedules. 
            Empowering your commercial decisions with verified data.
          </p>
        </div>
      </section>

      {/* ── Ticker Section ── */}
      <div className="ticker" aria-label="Live Market Movements">
        <div className="ticker__track" aria-hidden="true">
          {[...MARKET_PRICES, ...MARKET_PRICES].map((item, i) => (
            <div className="ticker__item" key={i}>
              <span className="ticker__label">{item.category}</span>
              <span className="ticker__number">{item.price}</span>
              <span className={`ticker__trend ticker__trend--${item.trend}`}>
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dashboard Split Section ── */}
      <section className="split dashboard-split">
        <div className="split__inner">
          
          {/* Left: Market Prices */}
          <div className="market-panel">
            <p className="split__label">National Averages</p>
            <h2 className="split__heading">Commodity Prices</h2>
            <p className="split__body">
              Latest aggregated pricing data sourced directly from AMT. 
              Use this baseline to negotiate fair value for your livestock.
            </p>
            
            <div className="price-list">
              <div className="price-list__header">
                <span>Commodity</span>
                <span>Current Price</span>
                <span>Trend</span>
              </div>
              {MARKET_PRICES.map((item) => (
                <div className="price-row" key={item.id}>
                  <div className="price-row__info">
                    <strong>{item.category}</strong>
                    <span>{item.unit}</span>
                  </div>
                  <div className="price-row__value">{item.price}</div>
                  <div className={`price-row__change price-row__change--${item.trend}`}>
                    {item.trend === 'up' ? '▲' : '▼'} {item.change.replace(/[+-]/, '')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auction Schedules */}
          <div className="solution-card auction-panel">
            <p className="solution-card__label">Verified Schedules</p>
            <h2 className="solution-card__heading" style={{ fontSize: '2rem' }}>Upcoming Auctions</h2>
            <p className="solution-card__body">
              Synchronized directly from trusted South African auction houses.
            </p>
            
            <div className="auction-list">
              {UPCOMING_AUCTIONS.map((auction) => (
                <div className="auction-card" key={auction.id}>
                  <div className="auction-card__date">
                    <span className="auction-card__month">
                      {new Date(auction.date).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span className="auction-card__day">
                      {new Date(auction.date).getDate()}
                    </span>
                  </div>
                  <div className="auction-card__details">
                    <h3 className="auction-card__title">{auction.title}</h3>
                    <p className="auction-card__location">📍 {auction.location}</p>
                  </div>
                  <div className="auction-card__status">
                    <span className="status-badge">{auction.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}