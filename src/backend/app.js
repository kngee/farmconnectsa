
//backend/app.js
const express = require('express');
const { twiml } = require('twilio');
const { generateAgriResponse } = require('./services/aiService');
const { initializeReminders } = require('./services/reminderService');
const { ingestMarketData } = require('./services/marketService');

initializeReminders();

const { db } = require('./services/firebaseService');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// A lightweight endpoint to keep the server awake
app.get('/api/health', (req, res) => {
  const currentTime = new Date().toISOString();
  console.log(`[HEALTH CHECK] Ping received at ${currentTime}`);
  res.status(200).send('FarmConnectSA Backend is awake.');
});

app.post('/api/cron/ingest-market', async (req, res) => {
  // Simple security check to ensure random people don't trigger your scraper
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_KEY}`) {
    return res.status(401).send('Unauthorized');
  }

  // Acknowledge the request immediately so the cron service doesn't timeout
  res.status(202).send('Ingestion started.'); 
  
  // Run the scraper in the background
  await ingestMarketData();
});

app.get('/api/test-reminder', async (req, res) => {
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
app.post('/api/webhook/twilio', async (req, res) => {
    const incomingMsg = req.body.Body;
    const senderNumber = req.body.From;
    
    console.log(`Farmer ${senderNumber} asked: "${incomingMsg}"`);
    
    // Send the message to OpenAI and wait for the response
    const aiReply = await generateAgriResponse(incomingMsg, senderNumber);    
    // --> 2. Save the interaction to Firebase Firestore
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
    // <-- End of Firebase saving logic
    
    // Format the response for Twilio WhatsApp
    const twimlResponse = new twiml.MessagingResponse();
    twimlResponse.message(aiReply);
    
    // Send the formatted reply back to the farmer
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`FarmConnectSA Server running on port ${PORT}`);
});