const { OpenAI } = require('openai');
const { db } = require('./firebaseService');
const { generateSystemPrompt, extractAndSaveProfile } = require('./profileService');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ── Tool Instructions (appended to the dynamic system prompt) ──
const TOOL_INSTRUCTIONS = `

## Live Data Tools:
You have access to real-time market prices and upcoming auction schedules. If a user asks for prices or auctions, ALWAYS use your tools to fetch the data. Do not guess.
- When formatting the tool results for WhatsApp, keep it highly concise, easy to read on small screens, and format prices in ZAR (R), e.g. "R 3 295 per kg".
- Use short lines, one item per line, with * for emphasis where helpful.
- If a tool returns no data, tell the farmer plainly that you have no data for that request right now and suggest they check back later. Never invent prices or auction dates.`;

// ── OpenAI Tool (Function) Definitions ──
const tools = [
    {
        type: "function",
        function: {
            name: "get_market_prices",
            description: "Fetches the latest South African agricultural market prices (in ZAR) scraped from AMT. Use when the farmer asks about current prices, price changes, or what their livestock/produce is worth.",
            parameters: {
                type: "object",
                properties: {
                    category: {
                        type: "string",
                        description: "Optional product category to filter by, e.g. 'beef', 'mutton', 'pork', 'poultry', 'grains'. Lowercase."
                    },
                    productName: {
                        type: "string",
                        description: "Optional specific product name to search for, e.g. 'Class A' or 'weaner'. Partial matches are supported."
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_upcoming_auctions",
            description: "Fetches upcoming livestock auction events (BKB schedules). Use when the farmer asks about auctions, sale dates, or where they can buy/sell animals.",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "Optional town/area name to filter auctions by, e.g. 'Bloemfontein'. Partial matches are supported."
                    },
                    limit: {
                        type: "number",
                        description: "Maximum number of auctions to return. Default 3, max 10."
                    }
                },
                required: []
            }
        }
    }
];

// ── Helpers ──

// Firestore reads return Timestamp objects; scrapers write JS Dates. Handle both.
function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    return new Date(value);
}

function formatDay(value) {
    const d = toDate(value);
    return d ? d.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : 'unknown';
}

function formatDateTime(value) {
    const d = toDate(value);
    return d ? d.toLocaleString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg'
    }) : 'unknown';
}

// ── Firestore Query Functions (executed when the AI calls a tool) ──

/**
 * Queries market_prices for the latest price per product.
 * Sorts by dateRecorded desc, then filters category/productName in memory —
 * this avoids needing a composite Firestore index for where + orderBy.
 */
async function queryMarketPrices(args = {}) {
    const { category, productName } = args;

    const snapshot = await db.collection('market_prices')
        .orderBy('dateRecorded', 'desc')
        .limit(150)
        .get();

    let records = snapshot.docs.map(doc => doc.data());

    if (category) {
        const cat = String(category).toLowerCase().trim();
        records = records.filter(r => (r.category || '').toLowerCase().includes(cat));
    }
    if (productName) {
        const name = String(productName).toLowerCase().trim();
        records = records.filter(r => (r.productName || '').toLowerCase().includes(name));
    }

    // The collection is a time-series: keep only the newest record per product.
    const latestByProduct = new Map();
    for (const r of records) {
        const key = `${r.category}|${r.productName}`;
        if (!latestByProduct.has(key)) latestByProduct.set(key, r); // records already sorted desc
    }

    const prices = [...latestByProduct.values()].slice(0, 12).map(r => ({
        product: r.productName,
        category: r.category,
        price: r.price,
        unit: r.quantityType,
        currency: r.currency || 'ZAR',
        changePercent: r.change,
        dateRecorded: formatDay(r.dateRecorded)
    }));

    if (prices.length === 0) {
        return { count: 0, prices: [], note: "No market price data found for this request. The data feed may not cover it yet." };
    }
    return { count: prices.length, prices };
}

/**
 * Queries auction_schedules for upcoming events (date >= now), soonest first.
 * Location is free-text from the iCal feed, so it is matched in memory.
 */
async function queryAuctions(args = {}) {
    const { location } = args;
    const limit = Math.min(Math.max(parseInt(args.limit, 10) || 3, 1), 10);

    const snapshot = await db.collection('auction_schedules')
        .where('date', '>=', new Date())
        .orderBy('date', 'asc')
        .limit(location ? 25 : limit) // fetch a wider window when filtering in memory
        .get();

    let records = snapshot.docs.map(doc => doc.data());

    if (location) {
        const loc = String(location).toLowerCase().trim();
        records = records.filter(a => (a.location || '').toLowerCase().includes(loc));
    }

    const auctions = records.slice(0, limit).map(a => ({
        title: a.title,
        auctioneer: a.auctioneer,
        date: formatDateTime(a.date),
        location: a.location,
        description: (a.description || '').slice(0, 140)
    }));

    if (auctions.length === 0) {
        return { count: 0, auctions: [], note: "No upcoming auctions found for this request. Schedules update regularly, so it is worth checking again soon." };
    }
    return { count: auctions.length, auctions };
}

/**
 * Dispatches a single OpenAI tool call to the matching query function.
 * Always returns a JSON string (including on error) so the model can respond gracefully.
 */
async function executeToolCall(toolCall) {
    let args = {};
    try {
        args = JSON.parse(toolCall.function.arguments || '{}');
    } catch {
        console.warn(`⚠️ Could not parse tool arguments for ${toolCall.function.name}`);
    }

    try {
        let result;
        switch (toolCall.function.name) {
            case 'get_market_prices':
                result = await queryMarketPrices(args);
                break;
            case 'get_upcoming_auctions':
                result = await queryAuctions(args);
                break;
            default:
                result = { error: `Unknown tool: ${toolCall.function.name}` };
        }
        return JSON.stringify(result);
    } catch (error) {
        console.error(`Tool execution failed (${toolCall.function.name}):`, error);
        return JSON.stringify({ error: "The live data lookup failed. Apologise and suggest the farmer try again later." });
    }
}

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
        const systemPrompt = generateSystemPrompt(currentProfile) + TOOL_INSTRUCTIONS;
        const messages = [
            { role: "system", content: systemPrompt },
            ...chatHistory,
            { role: "user", content: incomingMsg }
        ];

        // 5. First call: let the model answer directly or request tools
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            tools: tools,
            tool_choice: "auto",
            temperature: 0.7,
        });

        const responseMessage = response.choices[0].message;
        let aiReply = responseMessage.content;

        // 6. If the model requested tools, execute them and make a second call
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            console.log(`🔧 AI requested ${responseMessage.tool_calls.length} tool call(s): ${responseMessage.tool_calls.map(t => t.function.name).join(', ')}`);

            // The assistant message carrying tool_calls MUST precede the tool results
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                const toolResult = await executeToolCall(toolCall);
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: toolResult
                });
            }

            // Second call (no tools param) so the model formats a final text reply
            const followUp = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: messages,
                temperature: 0.7,
            });
            aiReply = followUp.choices[0].message.content;
        }

        if (!aiReply) {
            aiReply = "Sorry, I could not put together an answer just now. Please try asking again.";
        }

        // 7. Fire Background Extraction (Do NOT await)
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
