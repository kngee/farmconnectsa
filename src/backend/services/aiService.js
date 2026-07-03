const { OpenAI } = require('openai');
const { db } = require('./firebaseService');
const { generateSystemPrompt, extractAndSaveProfile } = require('./profileService');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ── Main Conversation Function ──
async function generateAgriResponse(incomingMsg, senderNumber) {
    try {
        // 1. Fetch Global Message Limit and Check Usage
        const settingsRef = db.collection('settings').doc('global');
        const settingsDoc = await settingsRef.get();
        const messageLimit = settingsDoc.exists ? settingsDoc.data().messageLimit : 50;
        const userLogsSnapshot = await db.collection('chat_logs').where('phoneNumber', '==', senderNumber).get();
        const userMessageCount = userLogsSnapshot.size;

        if (userMessageCount >= messageLimit) {
            return "You have reached your message limit. Please try again later.";
        }

        // 2. Fetch Farmer Profile for Context
        let currentProfile = {};
        const profileRef = db.collection('farmer_profiles').doc(senderNumber);
        const profileDoc = await profileRef.get();
        if (profileDoc.exists) {
            currentProfile = profileDoc.data();
        }

        // 3. Fetch Chat History
        const historySnapshot = await db.collection('chat_logs')
            .where('phoneNumber', '==', senderNumber)
            .orderBy('timestamp', 'desc')
            .limit(4) // Get last 4 messages for a better memory window
            .get();
        const chatHistory = historySnapshot.docs.map(doc => doc.data()).reverse().flatMap(log => [
            { role: "user", content: log.userMessage },
            { role: "assistant", content: log.aiResponse },
        ]);

        // 4. Generate Dynamic System Prompt and Assemble Messages
        const systemPrompt = generateSystemPrompt(currentProfile);
        const messages = [
            { role: "system", content: systemPrompt },
            ...chatHistory,
            { role: "user", content: incomingMsg }
        ];

        // 5. Generate the reply for the farmer
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // <--- CHANGE THIS FROM gpt-4o-mini
            messages: messages,
            temperature: 0.7,
        });
        const aiReply = response.choices[0].message.content;

        // 6. Fire Background Extraction (Do NOT await)
        extractAndSaveProfile(senderNumber, incomingMsg, currentProfile).catch(err =>
            console.error("Background extraction failed:", err)
        );

        return aiReply;

    } catch (error) {
        console.error("OpenAI Error:", error);
        return "I am currently having trouble accessing my agricultural database. Please consult a local state veterinarian for urgent advice.";
    }
}

module.exports = { generateAgriResponse };