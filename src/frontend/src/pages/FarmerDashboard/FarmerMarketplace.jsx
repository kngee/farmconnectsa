import { useOutletContext } from 'react-router-dom';
import MarketplaceBoard from '../../components/Marketplace/MarketplaceBoard.jsx';

// Farmer view of the marketplace: browse, sell, and manage own listings.
export default function FarmerMarketplace() {
  const { user, profile } = useOutletContext();

  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">Livestock Marketplace</h1>
      <p className="dashboard-subtitle">
        List your livestock for sale and browse what other farmers are selling.
        Your phone number is never shown to buyers.
      </p>
      <MarketplaceBoard user={user} canSell={true} sellerProfile={profile} />
    </main>
  );
}
