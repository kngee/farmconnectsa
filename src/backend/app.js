//backend/app.js
require('dotenv').config(); // Load env before any service constructs its clients

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { twiml } = require('twilio');
const { generateAgriResponse } = require('./services/aiService');
const { initializeReminders, runReminderScan } = require('./services/reminderService');
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

    console.log(`Farmer ${senderNumber} asked: "${incomingMsg}"`);

    // Send the message to OpenAI and wait for the response
    const aiReply = await generateAgriResponse(incomingMsg, senderNumber);
    // --> Save the interaction to Firebase Firestore
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

    // Format the response for Twilio WhatsApp
    const twimlResponse = new twiml.MessagingResponse();
    twimlResponse.message(aiReply);

    // Send the formatted reply back to the farmer
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse.toString());
});

initializeReminders();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`FarmConnectSA Server running on port ${PORT}`);
});
