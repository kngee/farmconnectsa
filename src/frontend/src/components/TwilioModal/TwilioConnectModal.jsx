import { useState } from 'react';
import QRCode from 'react-qr-code';
import './TwilioConnectModal.css';

export default function TwilioConnectModal({ isOpen, onClose }) {
  const [showDataInfo, setShowDataInfo] = useState(false);

  // Twilio Sandbox Details
  const twilioNumber = "14155238886"; // Formatted for wa.me link
  const sandboxPassword = "settle-is";
  const waLink = `https://wa.me/${twilioNumber}?text=${encodeURIComponent(sandboxPassword)}`;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Prevent clicks inside the modal from closing it */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2>Connect to FarmConnectSA</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Cold Start Warning Banner */}
        <div className="warning-banner">
          <span className="warning-icon">⏳</span>
          <div>
            <strong>Important Note on First Use:</strong>
            <p>
              Our AI servers occasionally enter "sleep mode" when inactive. 
              Your very first message may take <strong>up to 15 minutes</strong> to receive a reply while the system wakes up. Subsequent messages will be instant.
            </p>
          </div>
        </div>

        {/* Connection Instructions */}
        <div className="connect-steps">
          <div className="qr-section">
            <QRCode value={waLink} size={160} />
            <a href={waLink} className="btn-whatsapp">
              Open in WhatsApp
            </a>
          </div>

          <div className="manual-section">
            <h3>How it works:</h3>
            <ol>
              <li>Scan the QR code, or open WhatsApp manually.</li>
              <li>Add our secure number: <br/><strong>+1 (415) 523-8886</strong></li>
              <li>Send this exact secret code to join:</li>
            </ol>
            <div className="secret-code">
              settle-is
            </div>
          </div>
        </div>

        {/* Data Privacy Accordion */}
        <div className="data-privacy-section">
          <button 
            className="data-toggle-btn" 
            onClick={() => setShowDataInfo(!showDataInfo)}
          >
            <span className="info-icon">ℹ️</span> 
            What information does the AI store about you?
            <span className="toggle-arrow">{showDataInfo ? '▲' : '▼'}</span>
          </button>
          
          {showDataInfo && (
            <div className="data-info-content">
              <p>To provide personalized veterinary advice, FarmConnectSA securely stores the following to create your <strong>Farmer Profile</strong>:</p>
              <ul>
                <li><strong>Phone Number:</strong> Used to recognize you across sessions.</li>
                <li><strong>Chat Logs:</strong> Recent interactions to maintain conversation context.</li>
                <li><strong>Extracted Context:</strong> If you mention your location, language, or herd size (e.g., "I have 5 goats"), the AI remembers this to give you tailored health alerts.</li>
              </ul>
              <p className="privacy-assurance">We never share or sell this data to third-party buyers.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}