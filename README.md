# 🌾 FarmConnectSA

**Empowering small-scale livestock farmers across South Africa with accessible AI-driven agricultural advice.**

---

## 📋 Overview

FarmConnectSA is an intelligent WhatsApp-based agricultural assistant designed to serve small-scale communal livestock farmers in rural and peri-urban South Africa. Our mission is to bridge the critical gap between farmers and reliable animal health information, fair market opportunities, and livestock security guidance.

**Key Stats:**
- 87.3% of small-scale livestock farmers struggle to access financial support
- 93.1% of stolen livestock are never recovered
- ~16 million hectares of communal farming land exist in South Africa
- 60–70% of the informal goat market is controlled by smallholder breeders with limited market access

### The Problem We Solve

Small-scale livestock farmers face three critical challenges:
1. **Poor Animal Health:** Lack of access to accurate disease prevention and vaccination guidance
2. **Stock Theft:** Vulnerability to livestock theft with minimal recovery prospects
3. **Unfair Pricing:** Exploitation by middlemen due to poor market visibility and information asymmetry

### Our Solution

A **WhatsApp-based conversational AI** that provides instant, accessible agricultural advice — no app download required. Complemented by:
- 📊 **Admin Dashboard** — Monitor all farmer interactions in real-time
- 🔐 **Google Authentication** — Secure access for farm advisors
- 🗄️ **Firestore Database** — Persistent chat logs and analytics
- 💬 **SMS Fallback** — Coming soon for farmers without data access

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18.x or higher
- **npm** or **yarn**
- Firebase project with Firestore and Authentication enabled
- OpenAI API key
- Twilio WhatsApp Sandbox account
- `ngrok` (for local tunneling)

## 📁 Project Structure

```
farmconnectsa/
├── src/
│   ├── backend/
│   │   ├── app.js                    # Express server + Twilio webhook
│   │   └── services/
│   │       ├── aiService.js          # OpenAI integration
│   │       └── firebaseService.js    # Firebase Admin SDK
│   └── frontend/
│       ├── src/
│       │   ├── main.jsx              # React entry point
│       │   ├── App.jsx               # Router & auth state
│       │   ├── firebase.js           # Firebase Web SDK config
│       │   ├── components/
│       │   │   ├── LandingPage.jsx   # Public marketing page
│       │   │   ├── AuthPage.jsx      # Google Sign-In
│       │   │   └── Dashboard.jsx     # Protected admin panel
│       │   └── styles/               # Component CSS files
│       ├── package.json
│       └── .env                      # Frontend config (VITE_ prefix)
├── package.json                      # Backend dependencies
├── .env                              # Backend config
└── serviceAccountKey.json            # Firebase credentials (ignored in Git)
```

---

## 🔧 Architecture

### Backend Pipeline

```
Farmer sends WhatsApp → Twilio webhook → OpenAI AI Assistant → 
Firestore chat_logs → TwiML reply to farmer
```

**Key Components:**

| Component | Purpose |
|-----------|---------|
| `app.js` | Express server listening on port 3000 |
| `aiService.js` | Sends farmer messages to OpenAI (gpt-3.5-turbo) |
| `firebaseService.js` | Initializes Firebase Admin SDK |

### Frontend Architecture

- **Routing:** `react-router-dom` with three routes
  - `/` — Public landing page
  - `/auth` — Google Sign-In page
  - `/dashboard` — Protected admin dashboard
- **Authentication:** Firebase Auth with Google Sign-In only
- **Real-time Data:** Firestore Web SDK for reading chat logs

---

## 🤖 The AI Persona

The AI assistant is configured with a detailed system prompt that ensures:
- ✅ Accurate, practical livestock health advice for South African context
- ✅ Concise, WhatsApp-friendly responses (no walls of text)
- ✅ Honest "I don't know" responses with referral to local veterinarians
- ✅ No invented market prices (price integration coming in Phase 3)

**Model:** `gpt-3.5-turbo` | **Temperature:** 0.3 (factual focus)

---

## 📊 Admin Dashboard Features

- **Live Chat Log Viewer** — See all farmer messages and AI responses
- **Stats Bar** — Total interactions, unique farmers, last activity
- **Timestamp Tracking** — Know exactly when farmers engaged
- **One-Click Sign Out** — Secure logout

---

## 🔐 Security & Authentication

- **Google Sign-In only** — No email/password option
- **Firebase Auth** — Industry-standard authentication
- **Service account credentials** — Never committed to Git
- **Environment variables** — All secrets stored in `.env` files

**⚠️ Development Note:** Currently, any Google account can sign in. For production, restrict access via Firebase security rules or custom claims.

---

## 💬 Support & Contact

**Project Lead:** Kiran Soodyall  
**Email:** kiransoodyall03@gmail.com  
**Institution:** University of the Witwatersrand

---

## 📄 License

[MIT License](LICENSE) — Use, modify, and distribute freely.

---

## 🙏 Acknowledgments

Built with ❤️ for South Africa's small-scale farming communities.

**Research foundations:**
- Mqadi & Naidoo (2025) — Financial support gaps in smallholder farming
- Eastern Cape livestock security research (2025)
- Foot-and-Mouth Disease & export impact analysis
- Communal land usage and informal market structures

---

**Let's connect farmers. Let's empower communities. Let's grow together.** 🌾