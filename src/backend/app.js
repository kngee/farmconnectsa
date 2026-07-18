//backend/app.js
require('dotenv').config(); // Load env before any service constructs its clients

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { generateAgriResponse } = require('./services/aiService');
const { initializeReminders, runReminderScan, sendOutboundWhatsApp } = require('./services/reminderService');
const { ingestMarketData } = require('./services/marketService');
const { ingestAuctionData } = require('./services/auctionService');
const { db } = require('./services/firebaseService');
const validateTwilioRequest = require('./middleware/twilioAuth');
const requireAdminToken = require('./middleware/adminAuth');

const app = express();

// Behind ngrok (or any reverse proxy): trust the first hop so req.ip and
// req.protocol reflect the real client, not the tunnel.
app.set('trust proxy', 1);

// ── Security middleware ──
app.use(helmet());

// General API rate limit: 100 requests per 15 min per IP
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stricter limit for admin routes
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

// Lightweight health check for uptime pingers. Hitting this every ~10 min
// keeps the Render free instance awake, which is what prevents the cold-start
// webhook timeouts (Twilio error 11200). No auth, no side effects.
app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.post('/api/cron/ingest-market', async (req, res) => {
    // Simple security check to ensure random people don't trigger your scraper
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_KEY}`) {
        return res.status(401).send('Unauthorized');
    }

    // Acknowledge the request immediately so the cron service doesn't timeout
    res.status(202).send('Ingestion started.');

    await ingestAuctionData();
    await ingestMarketData();
});

app.get('/api/test-reminder', adminLimiter, requireAdminToken, async (req, res) => {
    console.log("🛠️ Manual reminder scan triggered via test route.");

    const result = await runReminderScan();

    if (result.success) {
        res.status(200).json({
            message: "Scan complete",
            messagesSent: result.messagesSent
        });
    } else {
        res.status(500).json({
            message: "Scan failed",
            error: result.error
        });
    }
});

app.post('/api/webhook/twilio', validateTwilioRequest, async (req, res) => {
    const incomingMsg = req.body.Body;
    const senderNumber = req.body.From;

    // Acknowledge Twilio IMMEDIATELY, before any slow work. The AI round-trip
    // (now up to two OpenAI calls for tool use) plus Firestore reads can exceed
    // Twilio's 15s webhook timeout, which produces error 11200. We reply
    // asynchronously via the REST API below, decoupling response time from
    // processing time so a slow AI call can never time out the webhook.
    res.status(204).end();

    if (!incomingMsg || !senderNumber) return;

    console.log(`Farmer ${senderNumber} asked: "${incomingMsg}"`);

    try {
        // Send the message to OpenAI and wait for the response
        const aiReply = await generateAgriResponse(incomingMsg, senderNumber);

        // Save the interaction to Firebase Firestore
        try {
            await db.collection('chat_logs').add({
                phoneNumber: senderNumber,
                userMessage: incomingMsg,
                aiResponse: aiReply,
                timestamp: new Date()
            });
            console.log("Chat logged to Firebase!");
        } catch (error) {
            console.error("Error saving to Firebase:", error);
        }

        // Send the reply back to the farmer via the Twilio REST API
        await sendOutboundWhatsApp(senderNumber, aiReply);
    } catch (error) {
        console.error("Async webhook processing failed:", error);
    }
});

initializeReminders();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`FarmConnectSA Server running on port ${PORT}`);
});
