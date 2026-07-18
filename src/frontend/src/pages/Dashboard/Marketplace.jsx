import { useOutletContext } from 'react-router-dom';
import MarketplaceBoard from '../../components/Marketplace/MarketplaceBoard.jsx';

// Staff view of the marketplace: browse listings and express interest.
// Listing creation is a farmer-side feature (canSell=false here).
export default function Marketplace() {
  const { user } = useOutletContext();

  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">Livestock Marketplace</h1>
      <p className="dashboard-subtitle">
        Browse livestock listed for sale by farmers. Express interest to notify the
        seller — contact details stay private until they respond.
      </p>
      <MarketplaceBoard user={user} canSell={false} />
    </main>
  );
}
