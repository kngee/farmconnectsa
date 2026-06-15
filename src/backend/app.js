
//backend/app.js
const express = require('express');
const { twiml } = require('twilio');
const { generateAgriResponse } = require('./services/aiService');
const { db } = require('./services/firebaseService'); // <-- 1. Import Firebase
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/webhook/twilio', async (req, res) => {
    const incomingMsg = req.body.Body;
    const senderNumber = req.body.From;
    
    console.log(`Farmer ${senderNumber} asked: "${incomingMsg}"`);
    
    // Send the message to OpenAI and wait for the response
    const aiReply = await generateAgriResponse(incomingMsg);
    
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