import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__content">
        <p className="footer__text">
          © 2026 FarmConnectSA · University of the Witwatersrand · Team Leader: Kiran Soodyall
        </p>

        <div className="footer__team">
          <div className="footer__section">
            <p className="footer__name">Kiran Soodyall</p>
            <p className="footer__name">Kenna Geleta</p>
            <p className="footer__name">Abdul Gani</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;