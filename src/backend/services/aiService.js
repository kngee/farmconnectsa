//backend/services/aiService.js
const { OpenAI } = require('openai');
require('dotenv').config(); // Loads your .env variables

// Initialize OpenAI using the key from your .env file
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Your Phase 1 Baseline Prompt
const systemPrompt = `You are an expert agricultural assistant for FarmConnectSA, speaking directly to small-scale communal livestock farmers in South Africa. Your goal is to provide accurate, easy-to-understand advice regarding animal health, vaccination schedules, disease outbreaks (like Foot-and-Mouth Disease), and basic livestock security. Keep answers concise, practical, and formatted for WhatsApp (use bolding and emojis sparingly but effectively). Do not invent market prices; if asked for prices, state that live auction tracking is coming in the next update. If you do not know the answer, advise the farmer to consult a local state veterinarian.`;

// Function to generate the response
async function generateAgriResponse(userMessage) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // You can change this to gpt-4 if you prefer
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: 0.3, // Keeps the AI focused and factual
        });
        
        return response.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI Error:", error);
        return "I am currently having trouble accessing my agricultural database. Please try again later or consult a local state veterinarian for urgent matters.";
    }
}

// Export the function so your webhook can use it
module.exports = { generateAgriResponse };