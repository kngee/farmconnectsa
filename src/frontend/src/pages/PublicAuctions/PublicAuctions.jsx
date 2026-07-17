import Navbar from '../../components/NavBar/NavBar.jsx';
import Footer from '../../components/Footer/Footer';
import AuctionHub from '../../components/AuctionHub/AuctionHub.jsx';
import './PublicAuctions.css';

export default function PublicAuctions() {
  return (
    <>
      <Navbar links={[{ label: 'Home', to: '/' }]} />
      <main className="public-auctions">
        <AuctionHub />
      </main>
      <Footer />
    </>
  );
}
