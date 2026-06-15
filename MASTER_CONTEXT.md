Here is the comprehensive, updated Master Context document. This captures the complete architecture, tech stack, codebase structure, and all the specific fixes and configurations we have implemented so far.

You can save this as your `MASTER_CONTEXT.md` to feed to any AI to get it instantly caught up on FarmConnectSA.

---

# FarmConnectSA — Master Context (Phase 1 & 2 Complete)

## 1. Project Overview

**Name:** FarmConnectSA


**Target Audience:** Small-scale communal livestock farmers in South Africa.
**Purpose:** A WhatsApp-based AI assistant that provides accessible agricultural advice (Phase 1) and a web-based Admin Dashboard for monitoring interactions (Phase 2).

## 2. Tech Stack & Prerequisites

* 
**Runtime environment:** Node.js (v18.x or higher).


* 
**Communication:** Twilio WhatsApp Sandbox (bypasses immediate WhatsApp Business API costs during development). Local tunneling via `ngrok`.


* 
**AI Provider:** OpenAI (configured via the `openai` npm package).


* 
**Database:** Firebase Firestore (NoSQL).


* 
**Frontend:** React built with Vite.



## 3. Architecture & Directory Structure

The project uses a custom "Monorepo" structure, completely isolating the backend and frontend within a top-level `src` folder while keeping configuration files at the root.

```text
📦 project-root
 ┣ 📜 .env                     # Secure environment variables (Ignored in Git)
 ┣ 📜 .gitignore               # Ignores node_modules, .env, and serviceAccountKey.json
 ┣ 📜 package.json             # Root package.json managing the backend dependencies
 ┣ 📜 serviceAccountKey.json   # Private Firebase Admin SDK key (Ignored in Git)
 ┗ 📂 src
    ┣ 📂 backend               # Node.js / Express Server
    ┃  ┣ 📜 app.js             # Main Express server and Twilio Webhook entry point
    ┃  ┗ 📂 services           # External service integrations
    ┃     ┣ 📜 aiService.js    # OpenAI logic and system prompt
    ┃     ┗ 📜 firebaseService.js # Firebase Admin SDK initialization
    ┗ 📂 frontend              # React / Vite Admin Dashboard
       ┣ 📜 package.json       # Frontend dependencies
        📂src
        ┣ 📂assets
        ┃ ┣ 📜hero.png
        ┃ ┣ 📜react.svg
        ┃ ┗ 📜vite.svg
        ┣ 📜App.css
        ┣ 📜App.jsx
        ┣ 📜firebase.js
        ┣ 📜index.css
        ┗ 📜main.jsx

```

## 4. Component Details & Configuration

### A. The Backend Pipeline (`src/backend/app.js`)

* Runs an Express server on `localhost:3000` (or `process.env.PORT`).


* Exposes a webhook at `POST /api/webhook/twilio`.


* 
**Flow:** Receives incoming WhatsApp messages from Twilio -> passes the text to OpenAI -> saves the user's phone number, message, AI response, and timestamp to the Firestore `chat_logs` collection -> replies to Twilio using TwiML XML formatting.



### B. The AI Persona (`src/backend/services/aiService.js`)

* Connects to OpenAI using `OPENAI_API_KEY` from the `.env` file.


* 
**Phase 1 Baseline System Prompt (CRITICAL INSTRUCTION):** > "You are an expert agricultural assistant for FarmConnectSA, speaking directly to small-scale communal livestock farmers in South Africa. Your goal is to provide accurate, easy-to-understand advice regarding animal health, vaccination schedules, disease outbreaks (like Foot-and-Mouth Disease), and basic livestock security. Keep answers concise, practical, and formatted for WhatsApp (use bolding and emojis sparingly but effectively). Do not invent market prices; if asked for prices, state that live auction tracking is coming in the next update. If you do not know the answer, advise the farmer to consult a local state veterinarian." 



### C. Database & Firebase Integration

* **Backend (Admin):** Uses the `firebase-admin` package. It uses the modern modular import architecture (`firebase-admin/app` and `firebase-admin/firestore`) to initialize the app using the downloaded `serviceAccountKey.json`.


* 
**Frontend (Web):** Uses the standard `firebase` package and initializes the connection inside `src/frontend/src/firebase.js` using the public Web Configuration keys provided by the Firebase Console.



### D. The Frontend Admin Dashboard (`src/frontend`)

* A React application that replaces default Vite styling with a clean, professional dashboard layout.


* Utilizes the Firebase Web SDK (`collection`, `getDocs`, `query`, `orderBy`) to fetch documents from the `chat_logs` Firestore collection.


* Displays recent interactions on cards showing the Farmer's phone number, their message, and the AI's reply.



## 5. Local Development & Run Instructions

Running the full stack requires juggling three simultaneous terminal processes:

1. 
**Backend Server:** * From the project root, run `npm run dev`.


* 
*Note:* The `package.json` script maps to `"dev": "nodemon src/backend/app.js"`.




2. 
**Ngrok Tunnel:** * Open a new terminal and run `ngrok http 3000`.


* The generated forwarding URL MUST be pasted into the Twilio WhatsApp Sandbox Settings under "When a message comes in" (appending `/api/webhook/twilio`).




3. 
**Frontend Server:** * Open a third terminal, navigate to `cd src/frontend`, and run `npm run dev`.


* Access the dashboard at `http://localhost:5173`.





## 6. Known Development Traps Resolved

* **Firebase Admin v12 Modular Update:** The backend previously crashed due to `admin.credential.cert` being undefined. This was fixed by migrating to modular imports (`initializeApp`, `cert` from `firebase-admin/app`).


* **Frontend `process is not defined` Error:** The frontend previously crashed because an IDE auto-import accidentally pulled from `firebase-admin/firestore` (a Node.js library) instead of the Web SDK (`firebase/firestore`). Strict separation of these packages is required.