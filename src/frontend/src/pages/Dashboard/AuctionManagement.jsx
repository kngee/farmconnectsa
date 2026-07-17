import AuctionHub from '../../components/AuctionHub/AuctionHub.jsx';

export default function AuctionManagement() {
  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">Auction Management</h1>
      <p className="dashboard-subtitle">
        Live market prices and auction schedules synced from AMT and BKB. Editing
        tools for schedules and listings are under development.
      </p>
      <AuctionHub />
    </main>
  );
}
