const { OpenAI } = require('openai');
const { db } = require('./firebaseService');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `You are a highly intelligent data extraction assistant for a farming CRM. Your task is to analyze a new message from a farmer in the context of their existing profile and return a **strict JSON object** representing the updated data.

**Rules:**
1.  **Analyze, Don't Assume:** Only extract information explicitly mentioned in the **new message**.
2.  **Merge, Don't Replace:** The JSON you return will be MERGED into the existing profile. Only include fields that need to be added or updated.
3.  **Herd Logic:** If the user mentions buying, selling, or losing animals, update the 'count' for that 'animalType'. If the animal type doesn't exist in the herd, add it as a new object in the array.
4.  **Health Timeline:** If the message mentions a new animal health issue, add a **new object** to the 'healthTimeline' array. Do not modify existing entries. Assign a 'severity' of 'low', 'medium', or 'high'.
5.  **Location:** Extract province, municipality, and nearestTown if mentioned.
6.  **Always update 'aiSummary'**: Provide a fresh, one-sentence summary of the farmer's current situation based on the new message.

**JSON Schema to Follow:**
{
  "location": { "province": "string", "municipality": "string", "nearestTown": "string" },
  "preferredLanguage": "string",
  "herd": [{ "animalType": "string", "count": "number", "lastReportedHealth": "string" }],
  "healthTimeline": [{ "timestamp": "ISO_8601_string", "event": "string", "severity": "string", "relatedAnimal": "string", "status": "ongoing" }],
  "aiSummary": "string"
}`;

/**
 * Generates a dynamic system prompt based on the farmer's profile.
 * This translates the raw JSON data into natural language instructions for the AI.
 * @param {object} profile - The farmer's profile object from Firestore.
 * @returns {string} A dynamically generated system prompt.
 */
function generateSystemPrompt(profile) {
    const basePrompt = `You are an expert agricultural assistant for FarmConnectSA, speaking directly to small-scale communal livestock farmers in South Africa. Your goal is to provide accurate, easy-to-understand advice. Keep answers concise, practical, and formatted for WhatsApp. If asked for prices, state that live auction tracking is coming soon. If you do not know the answer, advise the farmer to consult a local state veterinarian.`;

    let context = "## Farmer Context:\n";
    if (profile.location?.nearestTown || profile.location?.province) {
        context += `- The farmer is located near ${profile.location.nearestTown || ''}, ${profile.location.province || ''}.
`;
    }
    if (profile.preferredLanguage) {
        context += `- Their preferred language is ${profile.preferredLanguage}. Try to use simple terms.
`;
    }
    if (profile.herd && profile.herd.length > 0) {
        const herdString = profile.herd.map(h => `${h.count} ${h.animalType}`).join(', ');
        context += `- Their herd consists of: ${herdString}.
`;
    }
    if (profile.healthTimeline && profile.healthTimeline.filter(e => e.status === 'ongoing').length > 0) {
        const ongoingIssues = profile.healthTimeline
            .filter(e => e.status === 'ongoing')
            .map(e => `${e.event} (${e.relatedAnimal})`)
            .join(', ');
        context += `- They have ongoing health concerns, including: ${ongoingIssues}. Pay close attention to these.
`;
    }
    
    return `${basePrompt}

${context}`;
}

/**
 * Runs in the background to extract entities from a user's message
 * and updates their Firestore profile.
 * @param {string} senderNumber - The user's phone number.
 * @param {string} incomingMsg - The latest message from the user.
 * @param {object} currentProfile - The existing profile data from Firestore.
 */
async function extractAndSaveProfile(senderNumber, incomingMsg, currentProfile) {
    try {
        const extractionResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: EXTRACTION_PROMPT },
                { role: "user", content: `Existing Profile: ${JSON.stringify(currentProfile)}

New Message from Farmer: "${incomingMsg}"

Return ONLY the JSON object with the fields to be added or updated.` }
            ],
            temperature: 0.1,
        });

        const extractedData = JSON.parse(extractionResponse.choices[0].message.content);

        const profileRef = db.collection('farmer_profiles').doc(senderNumber);

        // Smart Herd Merging Logic
        if (extractedData.herd) {
            const updatedHerd = [...(currentProfile.herd || [])];
            
            extractedData.herd.forEach(newAnimal => {
                const index = updatedHerd.findIndex(existing => existing.animalType.toLowerCase() === newAnimal.animalType.toLowerCase());
                if (index !== -1) {
                    updatedHerd[index].count = newAnimal.count;
                    if(newAnimal.lastReportedHealth) {
                        updatedHerd[index].lastReportedHealth = newAnimal.lastReportedHealth;
                    }
                } else {
                    updatedHerd.push(newAnimal);
                }
            });
            extractedData.herd = updatedHerd;
        }

        // Append to Health Timeline instead of replacing
        if (extractedData.healthTimeline) {
            extractedData.healthTimeline = [
                ...(currentProfile.healthTimeline || []),
                ...extractedData.healthTimeline,
            ];
        }

        const finalProfileUpdate = {
            ...extractedData,
            phoneNumber: senderNumber,
            lastInteraction: new Date().toISOString(),
            profileCreatedAt: currentProfile.profileCreatedAt || new Date().toISOString()
        };
        
        // Calculate Risk Status
        if(finalProfileUpdate.healthTimeline) {
            const ongoingHigh = finalProfileUpdate.healthTimeline.filter(e => e.status === 'ongoing' && e.severity === 'high').length;
            const ongoingMedium = finalProfileUpdate.healthTimeline.filter(e => e.status === 'ongoing' && e.severity === 'medium').length;
            if(ongoingHigh > 0) {
                finalProfileUpdate.riskStatus = 'high';
            } else if (ongoingMedium > 0) {
                finalProfileUpdate.riskStatus = 'medium';
            } else {
                finalProfileUpdate.riskStatus = 'low';
            }
        }


        await profileRef.set(finalProfileUpdate, { merge: true });
        console.log(`✅ Profile updated in background for ${senderNumber}`);

    } catch (error) {
        console.error("Error during background profile extraction:", error);
    }
}

module.exports = { generateSystemPrompt, extractAndSaveProfile };
