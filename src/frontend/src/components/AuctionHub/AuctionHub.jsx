import './AuctionHub.css';

/* Static sample data until the live auction feed goes live */
const SAMPLE_AUCTIONS = [
  {
    town: 'Kokstad',
    province: 'KwaZulu-Natal',
    date: 'Sat, 25 Jul 2026',
    livestock: ['Cattle', 'Goats'],
    venue: 'Kokstad Livestock Sale Yard',
  },
  {
    town: 'Queenstown',
    province: 'Eastern Cape',
    date: 'Wed, 29 Jul 2026',
    livestock: ['Sheep', 'Goats'],
    venue: 'Komani Agri Auction Pens',
  },
  {
    town: 'Polokwane',
    province: 'Limpopo',
    date: 'Sat, 1 Aug 2026',
    livestock: ['Cattle'],
    venue: 'Polokwane Show Grounds',
  },
  {
    town: 'Mthatha',
    province: 'Eastern Cape',
    date: 'Fri, 7 Aug 2026',
    livestock: ['Cattle', 'Sheep', 'Goats'],
    venue: 'OR Tambo District Sale Pens',
  },
];

export default function AuctionHub() {
  return (
    <div className="auction-hub">
      <header className="auction-hub__header">
        <h1 className="auction-hub__title">Auction Hub</h1>
        <p className="auction-hub__subtitle">
          Live market prices and auction schedules across South Africa.
        </p>
      </header>

      <div className="auction-hub__banner" role="status">
        <span aria-hidden="true">🔨</span>
        <p>
          <strong>Live auction data is coming soon.</strong> The events below are a preview of
          the geo-located auction calendar — schedules and market prices will update in real
          time once the module launches.
        </p>
      </div>

      <div className="auction-hub__grid">
        {SAMPLE_AUCTIONS.map((auction, i) => (
          <article className="auction-card" key={i}>
            <div className="auction-card__top">
              <span className="auction-card__tag">Upcoming</span>
              <span className="auction-card__date">{auction.date}</span>
            </div>
            <h3 className="auction-card__town">{auction.town}</h3>
            <p className="auction-card__province">📍 {auction.province}</p>
            <p className="auction-card__venue">{auction.venue}</p>
            <div className="auction-card__livestock">
              {auction.livestock.map((animal, j) => (
                <span className="auction-card__chip" key={j}>{animal}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
