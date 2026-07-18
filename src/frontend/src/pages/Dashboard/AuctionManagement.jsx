import AuctionHub from '../../components/AuctionHub/AuctionHub.jsx';
import PromoteAuctionPanel from '../../components/Marketplace/PromoteAuctionPanel.jsx';
import LeadsPanel from '../../components/Marketplace/LeadsPanel.jsx';

export default function AuctionManagement() {
  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">Auction Management</h1>
      <p className="dashboard-subtitle">
        Promote your auctions to targeted, consented farmers and discover qualified
        seller leads — plus live market prices synced from AMT and BKB.
      </p>
      <PromoteAuctionPanel />
      <LeadsPanel />
      <AuctionHub />
    </main>
  );
}
