import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/NavBar/NavBar.jsx';
import './LandingPage.css';

/* ── Data ─────────────────────────────────────── */
const TICKER_ITEMS = [
  { number: '87.3%',   label: 'of small-scale farmers cannot access financial support' },
  { number: '93.1%',   label: 'of stolen livestock are never recovered' },
  { number: '16M ha',  label: 'of communal farming land across South Africa' },
  { number: '60–70%',  label: 'of the informal goat market are small-scale farmers' },
];

const CRISIS_ITEMS = [
  'No reliable access to vaccination schedules or dipping dates',
  'Livestock stolen with a 93.1% chance of never being recovered',
  'Exploited by local buyers due to isolation from wider markets',
  'Misinformation spreading through WhatsApp groups about animal health',
  'Disconnected from agricultural support networks and extension services',
];

const SOLUTION_ITEMS = [
  'AI chatbot accessible via WhatsApp & SMS',
  'Automated vaccination and dipping reminders',
  'Geo-location-based auction calendar',
  'Multilingual support for SA\'s major languages',
  'Trusted, verified health information',
  'Admin dashboard for real-time monitoring',
];

const FEATURES = [
  {
    icon: '💉',
    title: 'Animal Health Alerts',
    text: 'Accurate vaccination schedules, dipping dates, and disease outbreak warnings sent directly to farmers via WhatsApp — no app download required.',
  },
  {
    icon: '🔒',
    title: 'Stock Security',
    text: 'Guidance on livestock protection, reporting stolen animals, and connecting to local farming security networks to fight the theft crisis.',
  },
  {
    icon: '📅',
    title: 'Auction Calendar',
    text: 'Geo-location-based auction events so farmers can access regulated sales beyond their immediate area and secure fair, market-rate prices.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Advice',
    text: 'A chatbot trained on agricultural expertise provides trusted answers, cutting through the dangerous misinformation spreading in WhatsApp groups.',
  },
  {
    icon: '🌍',
    title: 'Multilingual Access',
    text: 'Support across South Africa\'s major languages — every farmer can communicate in the language they\'re most comfortable with.',
  },
  {
    icon: '📡',
    title: 'Low-Data Design',
    text: 'Works via SMS or WhatsApp. No smartphone or data plan needed. Built for the real connectivity conditions of the Eastern Cape, KZN, and Limpopo.',
  },
];

/* ── Component ────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();

  // Duplicate items to create seamless infinite scroll
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <>
      <Navbar />

      {/* ── Hero ──────────────────────────────── */}
      <section className="hero">
        <div className="hero__grid" aria-hidden="true" />
        <div className="hero__content">
          <p className="hero__eyebrow">FarmConnectSA — South Africa</p>
          <h1 className="hero__headline">
            Giving SA's livestock<br />
            farmers the&nbsp;<em>information</em><br />
            they need to thrive
          </h1>
          <p className="hero__body">
            An AI-powered WhatsApp assistant connecting small-scale communal livestock farmers
            to accurate health data, fair market access, and livestock security guidance.
            No app download. No expensive data plan. Just a message away.
          </p>
          <div className="hero__actions">
            <button className="btn-primary" onClick={() => navigate('/auth')}>
              Admin Login →
            </button>
            <span className="hero__subtext">
              Eastern Cape · KwaZulu-Natal · Limpopo
            </span>
          </div>
        </div>
      </section>

      {/* ── Stats Ticker ──────────────────────── */}
      <div className="ticker" aria-label="Key research statistics">
        <div className="ticker__track" aria-hidden="true">
          {tickerItems.map((item, i) => (
            <div className="ticker__item" key={i}>
              <span className="ticker__number">{item.number}</span>
              <span className="ticker__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem / Solution ────────────────── */}
      <section className="split" aria-labelledby="crisis-heading">
        <div className="split__inner">

          {/* Left: The Crisis */}
          <div>
            <p className="split__label">The Crisis</p>
            <h2 className="split__heading" id="crisis-heading">
              A broken system leaving farmers behind
            </h2>
            <p className="split__body">
              South Africa's small-scale livestock farmers operate on communal land with minimal
              infrastructure and support. Critical decisions — vaccination, security, selling —
              are made on word-of-mouth that is too slow, unreliable, and easily corrupted by
              misinformation.
            </p>
            <p className="split__body">
              The result: preventable livestock deaths, unjust losses to theft, and market
              exploitation that traps farmers in cycles of poverty.
            </p>
            <ul className="crisis-list">
              {CRISIS_ITEMS.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Right: The Solution */}
          <div className="solution-card">
            <p className="solution-card__label">The Solution</p>
            <h2 className="solution-card__heading">FarmConnectSA</h2>
            <p className="solution-card__body">
              A WhatsApp-based AI assistant that puts the right information in the right hands,
              at the right time. Accessible anywhere. In any language. On any phone.
            </p>
            <ul className="solution-list">
              {SOLUTION_ITEMS.map((item, i) => (
                <li key={i}>
                  <span className="solution-list__check" aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* ── Features ──────────────────────────── */}
      <section className="features" aria-labelledby="features-heading">
        <div className="features__inner">
          <div className="features__header">
            <p className="features__eyebrow">What We Offer</p>
            <h2 className="features__title" id="features-heading">
              Built for the real conditions<br />of rural farming
            </h2>
          </div>
          <div className="features__grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-card__icon" aria-hidden="true">{f.icon}</div>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────── */}
      <section className="cta" aria-labelledby="cta-heading">
        <div className="cta__inner">
          <p className="cta__label">Admin Access</p>
          <h2 className="cta__heading" id="cta-heading">
            Monitor the platform
          </h2>
          <p className="cta__body">
            The FarmConnectSA admin dashboard gives the team real-time visibility into
            farmer interactions, AI responses, and platform health — all in one place.
          </p>
          <button className="btn-primary" onClick={() => navigate('/auth')}>
            Sign in to Dashboard →
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────── */}
      <footer className="footer">
        <p className="footer__text">
          © {new Date().getFullYear()} FarmConnectSA &nbsp;·&nbsp;
          University of the Witwatersrand &nbsp;·&nbsp;
          Team Leader: Kiran Soodyall
        </p>
      </footer>
    </>
  );
}