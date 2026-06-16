# FarmConnectSA — Master Context (Phase 1, 2 & Frontend Overhaul Complete)

## 1. Project Overview

**Name:** FarmConnectSA
**Team Leader:** Kiran Soodyall — University of the Witwatersrand
**Contact:** kiransoodyall03@gmail.com

**Target Audience:** Small-scale communal livestock farmers in rural and peri-urban South Africa, with a primary focus on the Eastern Cape, KwaZulu-Natal, and Limpopo.

**Purpose:** A WhatsApp-based AI assistant that provides accessible agricultural advice (Phase 1) and a web-based Admin Dashboard for monitoring interactions (Phase 2), secured behind Google authentication (Frontend Overhaul).

### 1.1 Problem Statement

Small-scale livestock farmers in South Africa lack reliable access to animal health information, fair market opportunities, and livestock security guidance. This results in lost sales, exploitation by buyers, poor herd health, and stock theft. Word-of-mouth and informal WhatsApp groups are not sufficient or safe channels for spreading critical information — they're slow, easily corrupted, and have led to misuse of medication based on bad advice.

Key supporting research:
- 87.3% of small-scale livestock farmers struggle to access financial support (Mqadi & Naidoo, 2025).
- 93.1% of stolen livestock are never recovered (Eastern Cape research, as of 30 September 2025).
- Disease outbreaks (e.g. Foot-and-Mouth Disease) have caused significant export declines and hundreds of active cases.
- Communal and smallholder breeders account for 60–70% of the informal goat market, yet have little access to regulated auction houses.
- Approximately 16 million hectares of communal farming land exist in South Africa; ~20% is worked by small-scale/communal farmers.

### 1.2 Idea Statement

FarmConnectSA helps farmers facing local theft, lack of access to current farm-care information, and unfair market prices, achieve reduced business losses. This is delivered through a Conversational AI Chatbot (WhatsApp Business API + GPT), an SMS Notification Engine (Twilio), a lightweight Progressive Web App, and Market Price Data Integration. The competitive advantage is scale, ease of access, and correctness of information — no app download and no data connection required (SMS fallback available).

### 1.3 User Personas

- **Persona 1 (Consumer):** Age 30–70, any income class — butchers, restaurants, local meat-eating consumers across South Africa.
- **Persona 2 (Producer):** Age 30–70, under R100,000 p/a — farmers operating under Ubuntu philosophy, located in former homeland areas, peri-urban fringe areas, and small towns with auction infrastructure.

---

## 2. Tech Stack & Prerequisites

- **Runtime environment:** Node.js (v18.x or higher).
- **Communication:** Twilio WhatsApp Sandbox (bypasses immediate WhatsApp Business API costs during development). Local tunneling via `ngrok`.
- **AI Provider:** OpenAI (`gpt-3.5-turbo`, configurable to `gpt-4`), via the `openai` npm package.
- **Database:** Firebase Firestore (NoSQL).
- **Authentication:** Firebase Authentication — Google Sign-In only (`firebase/auth`, `GoogleAuthProvider`).
- **Frontend:** React (Vite), `react-router-dom` for client-side routing.

---

## 3. Architecture & Directory Structure

The monorepo structure isolates backend and frontend within `src`, with configuration at the root. The frontend now separates **routing/state**, **components**, and **styling** into distinct files.

```text
📦 project-root
 ┣ 📜 .env                       # Backend env vars (Twilio, OpenAI) — Ignored in Git
 ┣ 📜 .gitignore                 # Ignores node_modules, .env, serviceAccountKey.json
 ┣ 📜 package.json               # Root package.json — backend dependencies
 ┣ 📜 serviceAccountKey.json     # Firebase Admin SDK private key — Ignored in Git
 ┗ 📂 src
    ┣ 📂 backend                 # Node.js / Express Server
    ┃  ┣ 📜 app.js                # Express server + Twilio webhook entry point
    ┃  ┗ 📂 services
    ┃     ┣ 📜 aiService.js       # OpenAI logic and system prompt
    ┃     ┗ 📜 firebaseService.js # Firebase Admin SDK initialization
    ┗ 📂 frontend                # React / Vite Admin Dashboard + Landing Page
       ┣ 📜 .env                  # Frontend env vars (VITE_ prefixed) — Ignored in Git
       ┣ 📜 package.json          # Frontend dependencies (now incl. react-router-dom)
       ┗ 📂 src
          ┣ 📜 main.jsx           # Entry point (ReactDOM root render)
          ┣ 📜 App.jsx            # Router setup, auth state listener, route guards
          ┣ 📜 firebase.js        # Firebase Web SDK init — exports db, auth, googleProvider
          ┣ 📜 index.css          # Minimal box-sizing reset
          ┣ 📂 assets
          ┃  ┣ 📜 hero.png
          ┃  ┣ 📜 react.svg
          ┃  ┗ 📜 vite.svg
          ┣ 📂 components
          ┃  ┣ 📜 Navbar.jsx       # Landing page nav bar only
          ┃  ┣ 📜 LandingPage.jsx  # Public marketing page (hero, stats, features, CTA)
          ┃  ┣ 📜 AuthPage.jsx     # Google Sign-In page
          ┃  ┗ 📜 Dashboard.jsx    # Protected admin dashboard (chat log viewer)
          ┗ 📂 styles
             ┣ 📜 global.css       # CSS variables, resets, shared button primitives
             ┣ 📜 Navbar.css
             ┣ 📜 LandingPage.css
             ┣ 📜 AuthPage.css
             ┗ 📜 Dashboard.css
```

> **Note:** `App.css` (legacy, Vite default styling) has been removed — `global.css` now owns all base/shared styling, imported once in `App.jsx`.

---

## 4. Component Details & Configuration

### A. The Backend Pipeline (`src/backend/app.js`)

- Runs an Express server on `localhost:3000` (or `process.env.PORT`).
- Exposes a webhook at `POST /api/webhook/twilio`.
- **Flow:** Receives incoming WhatsApp messages from Twilio → passes the text to OpenAI → saves the farmer's phone number, message, AI response, and timestamp to the Firestore `chat_logs` collection → replies to Twilio using TwiML XML formatting.

### B. The AI Persona (`src/backend/services/aiService.js`)

- Connects to OpenAI using `OPENAI_API_KEY` from the root `.env` file.
- Model: `gpt-3.5-turbo`, `temperature: 0.3` (keeps responses focused and factual).
- **System Prompt (unchanged from Phase 1):**
  > "You are an expert agricultural assistant for FarmConnectSA, speaking directly to small-scale communal livestock farmers in South Africa. Your goal is to provide accurate, easy-to-understand advice regarding animal health, vaccination schedules, disease outbreaks (like Foot-and-Mouth Disease), and basic livestock security. Keep answers concise, practical, and formatted for WhatsApp (use bolding and emojis sparingly but effectively). Do not invent market prices; if asked for prices, state that live auction tracking is coming in the next update. If you do not know the answer, advise the farmer to consult a local state veterinarian."
- On OpenAI failure, falls back to a static message advising the farmer to consult a local state veterinarian.

### C. Database & Firebase Integration

- **Backend (Admin):** Uses `firebase-admin`, modular imports (`firebase-admin/app`, `firebase-admin/firestore`), initialized with `serviceAccountKey.json`. Writes to `chat_logs` via `db.collection('chat_logs').add(...)`.
- **Frontend (Web):** Uses the standard `firebase` package (`firebase/app`, `firebase/firestore`, `firebase/auth`) inside `src/frontend/src/firebase.js`. Exports three named instances:
  - `db` — Firestore instance, used by `Dashboard.jsx` to read `chat_logs`.
  - `auth` — Firebase Auth instance, used by `AuthPage.jsx` and `App.jsx`.
  - `googleProvider` — `GoogleAuthProvider` instance for `signInWithPopup`.

### D. Routing & Authentication Flow (`src/frontend/src/App.jsx`)

- `react-router-dom` (`BrowserRouter`, `Routes`, `Route`, `Navigate`) defines three routes:
  - `/` → `LandingPage` (public)
  - `/auth` → `AuthPage` (public, Google Sign-In only)
  - `/dashboard` → `Dashboard` (protected)
- `onAuthStateChanged` listener tracks the Firebase user in state with three possible values:
  - `undefined` — auth state still resolving (renders a blank dark loading screen)
  - `null` — confirmed signed out (redirects `/dashboard` → `/auth`)
  - `User` object — confirmed signed in (renders `Dashboard`, passing `user` as a prop)
- A catch-all `*` route redirects unknown paths back to `/`.

### E. The Landing Page (`src/frontend/src/components/LandingPage.jsx`)

- Public marketing page explaining the project, problem, and solution.
- Sections: Hero → animated stats ticker (87.3%, 93.1%, 16M ha, 60–70% — pulled directly from the research findings above) → Problem/Solution split → Feature grid (6 cards) → CTA → Footer.
- Single navigation action throughout: **Admin Login**, routing to `/auth`.
- Styled via `LandingPage.css` + `Navbar.css`, using shared tokens from `global.css`.

### F. The Auth Page (`src/frontend/src/components/AuthPage.jsx`)

- **Google Sign-In only** — no email/password option, per project requirement.
- Uses `signInWithPopup(auth, googleProvider)`.
- Handles three states: idle (shows Google button), loading (`Signing in…`), and error (friendly messages for `auth/popup-closed-by-user`, `auth/network-request-failed`, and a generic fallback).
- On success, navigates to `/dashboard`.
- "← Back to home" link returns to `/`.

### G. The Frontend Admin Dashboard (`src/frontend/src/components/Dashboard.jsx`)

- Protected route — only reachable when `App.jsx`'s auth listener confirms a signed-in user.
- Fetches `chat_logs` from Firestore via `getDocs(query(collection(db, 'chat_logs'), orderBy('timestamp', 'desc')))`.
- Displays:
  - A stats bar: total interactions, unique farmers (deduplicated by phone number), and last activity timestamp.
  - A list of log cards, each showing the farmer's phone number, their message, and the AI's reply, with a formatted timestamp.
- Defensive `formatTimestamp` helper handles Firestore `Timestamp` objects (`.toDate()`), plain JS `Date` objects, and ISO strings.
- Explicit loading, error, and empty states (the original implementation only logged errors to the console).
- Sign-out button (`signOut(auth)`) redirects to `/` on completion.
- Styled via `Dashboard.css`, using the same design tokens as the rest of the app for visual consistency.

---

## 5. Environment Variables

Because the project has two independent runtimes (Node backend, Vite frontend), there are **two separate `.env` files** — this is a common source of bugs and worth calling out explicitly.

| File | Used by | Variable prefix |
|---|---|---|
| `project-root/.env` | Backend (Node/Express) | None — read via `process.env.X` |
| `src/frontend/.env` | Frontend (Vite/React) | **Must** be prefixed `VITE_` — read via `import.meta.env.VITE_X` |

**`src/frontend/.env` contents:**
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Both `.env` files must be listed in `.gitignore` individually — a root-level ignore rule does not automatically cover the nested frontend `.env`.

---

## 6. Local Development & Run Instructions

Running the full stack requires three simultaneous terminal processes:

1. **Backend Server:**
   - From the project root, run `npm run dev`.
   - *Note:* maps to `"dev": "nodemon src/backend/app.js"`.

2. **Ngrok Tunnel:**
   - Open a new terminal and run `ngrok http 3000`.
   - Paste the generated forwarding URL into the Twilio WhatsApp Sandbox Settings under "When a message comes in" (appending `/api/webhook/twilio`).

3. **Frontend Server:**
   - Open a third terminal, navigate to `cd src/frontend`, and run `npm run dev`.
   - Access the app at `http://localhost:5173`.
   - First-time setup also requires `npm install react-router-dom` inside `src/frontend`.

**Firebase Console setup required for Auth:**
- Authentication → Sign-in method → enable **Google**.
- Authentication → Settings → Authorized domains → add `localhost` (development) and the production domain when deployed.

---

## 7. Known Development Traps Resolved

- **Firebase Admin v12 Modular Update:** Backend previously crashed due to `admin.credential.cert` being undefined. Fixed by migrating to modular imports (`initializeApp`, `cert` from `firebase-admin/app`).
- **Frontend `process is not defined` Error:** Frontend previously crashed because an IDE auto-import pulled from `firebase-admin/firestore` (Node.js library) instead of the Web SDK (`firebase/firestore`). Strict separation of these packages is required.
- **`process.env` undefined in Vite:** Vite does not expose `process.env` to client code. All Firebase config values resolved to `undefined`, throwing `auth/invalid-api-key`. Fixed by switching to `import.meta.env.VITE_X`.
- **Missing `VITE_` prefix:** Vite only exposes env variables prefixed with `VITE_` to the browser bundle (a deliberate security boundary against leaking server secrets). Variables without the prefix are silently invisible to client code.
- **`.env` file in the wrong directory:** Vite resolves `.env` relative to its own `package.json` (i.e. `src/frontend/`), not the project root. A root-level `.env` is never read by the frontend — it needs its own copy inside `src/frontend/`.
- **Firestore Timestamp shape mismatch:** Timestamps written by `firebase-admin` (`new Date()`) are returned to the Web SDK as Firestore `Timestamp` objects requiring `.toDate()`, not plain JS Dates. The dashboard's `formatTimestamp` helper handles this defensively across object, Date, and string shapes.

---

## 8. Next Steps / Open Items

- Migrate `Dashboard.jsx` from `getDocs` (one-time fetch) to `onSnapshot` for live-updating chat logs, if real-time monitoring becomes a priority.
- Restrict Firestore/Firebase Auth access to specific authorised email addresses (e.g. via Firestore security rules or a custom claims check), since any Google account can currently authenticate.
- Replace `serviceAccountKey.json` local file usage with environment-based credentials before production deployment.
- Implement the SMS fallback channel (Twilio/Africa's Talking) described in the Idea Statement for farmers without WhatsApp/data access.
- Build out the geo-location-based auction calendar and multilingual support referenced in the original idea description — not yet started.