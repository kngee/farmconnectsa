const { OpenAI } = require('openai');
const { db } = require('./firebaseService');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const EXTRACTION_PROMPT = `You are a highly intelligent data extraction assistant for a farming CRM. Your task is to analyze a new message from a farmer in the context of their existing profile and return a **strict JSON object** representing the updated data.

**Rules:**
1.  **Analyze, Don't Assume:** Only extract information explicitly mentioned or strongly implied in the **new message**. Never invent data the farmer did not communicate.
2.  **Merge, Don't Replace:** The JSON you return will be MERGED into the existing profile. Only include fields that need to be added or updated. Omit everything else.
3.  **Herd Logic:** If the user mentions buying, selling, or losing animals, update the 'count' for that 'animalType'. If the animal type doesn't exist in the herd, add it as a new object in the array.
4.  **Health Timeline:** If the message mentions a new animal health issue, add a **new object** to the 'healthTimeline' array. Do not modify existing entries. Assign a 'severity' of 'low', 'medium', or 'high'.
5.  **Location:** Extract province, municipality, and nearestTown if mentioned.
6.  **Always update 'aiSummary'**: Provide a fresh, one-sentence summary of the farmer's current situation based on the new message.

**Inference Rules (apply conversational context, do not interrogate):**
- **agroEcologicalZone:** If the farmer mentions high rainfall, tall/sour grass, or mountains, infer 'sourveld'. If they mention dry conditions, short sweet grass, or thornveld, infer 'sweetveld'. Mixed signals → 'mixedveld'.
- **primaryWaterSource:** Infer from mentions of boreholes, rivers, dams, communal taps, or municipal water.
- **soilNutrientProfile:** Infer from mentions of soil type or plant growth, e.g. 'sandy/leached', 'clay/fertile', 'acidic'.
- **climateVulnerabilityIndex:** Number 0-10. Raise it (7-10) if they report drought, floods, or livestock deaths from weather; lower (0-3) if they report stable conditions. Only set when there is real signal.
- **grazingSystem:** Infer 'communal' from shared/village grazing, 'rotational' from camps/paddocks, 'tethered' from tied animals, 'free-range' from unmanaged roaming.
- **nightManagement:** If they mention kraaling animals at night, set 'kraaled'. Other options: 'open veld', 'shed/enclosure', 'herded home'.
- **predatorThreats:** Append predator names mentioned (e.g. 'jackal', 'caracal', 'stray dogs', 'leopard').
- **theftRiskLevel:** 'low', 'medium', or 'high' — infer 'high' from any mention of stock theft in their area.
- **dipTankAffiliation:** Extract the name/place of their dip tank or community dipping group, e.g. 'Mzimba communal dip tank'. If they say they have no dip tank access, set 'none'.
- **vaccinationHistory:** Append vaccine names or treatments mentioned as given (e.g. 'anthrax 2026', 'blackleg', 'RVF'). Do not remove existing entries.
- **acaricideEfficacy:** If they report ticks surviving after dipping, set 'suspected resistance'. If dipping works well, set 'effective'.
- **zoonoticAwarenessLevel:** Boolean — true if they show awareness that animal diseases can infect people (e.g. careful handling of aborted material, boiling milk), false if they describe risky practices.
- **pahcProximity:** Extract nearest animal health clinic/state vet office and distance in km if mentioned.
- **primaryFarmingGoal:** e.g. 'commercial sales', 'school fees / savings', 'household food', 'cultural/ceremonial', 'herd growth'.
- **capitalAvailability:** 'low', 'medium', or 'high' — infer from statements about affording feed, medicine, or fencing.
- **preferredSalesChannel:** e.g. 'speculators', 'formal auction', 'local butchery', 'private buyers', 'abattoir'.
- **traceabilityStatus:** litsRegistered true if they mention LITS registration; branded true if they mention brand marks or tattoos on animals.
- **financialInclusionIndex:** Number 0-10 — raise with mentions of bank accounts, loans, insurance, stokvels; lower if cash-only with no access to finance.
- **genderDynamics:** primaryCaregiver = who does daily animal care (e.g. 'wife', 'children', 'hired herder', 'self'); legalOwner = who legally owns the animals, if stated.
- **digitalLiteracyProxy:** 'low' if they struggle with typing/ask for voice notes/very short broken messages; 'high' if fluent detailed texting.
- **networkReliability:** Infer from complaints about signal/data, e.g. 'poor', 'intermittent', 'good'.
- **salesIntent:** ONLY when the farmer expresses a desire or need to SELL animals — e.g. "I want to sell 5 cattle", "looking for buyers", "school fees are due so I might sell a goat". Use timeframe 'immediate' if they want to sell within about a month or mention an urgent cash need, otherwise 'future'. Set targetDate only if a specific date or event is mentioned, else null. NEVER infer salesIntent from someone merely asking about prices or auctions out of curiosity.

**JSON Schema to Follow:**
{
  "location": { "province": "string", "municipality": "string", "nearestTown": "string" },
  "preferredLanguage": "string",
  "herd": [{ "animalType": "string", "count": "number", "lastReportedHealth": "string" }],
  "healthTimeline": [{ "timestamp": "ISO_8601_string", "event": "string", "severity": "string", "relatedAnimal": "string", "status": "ongoing" }],
  "salesIntent": [{ "animalType": "string", "count": "number", "targetDate": "ISO_8601_string or null", "timeframe": "string ('immediate'|'future')" }],
  "agroEcologicalZone": "string",
  "primaryWaterSource": "string",
  "soilNutrientProfile": "string",
  "climateVulnerabilityIndex": "number (0-10)",
  "grazingSystem": "string",
  "nightManagement": "string",
  "predatorThreats": ["string"],
  "theftRiskLevel": "string ('low'|'medium'|'high')",
  "dipTankAffiliation": "string",
  "vaccinationHistory": ["string"],
  "acaricideEfficacy": "string",
  "zoonoticAwarenessLevel": "boolean",
  "pahcProximity": { "nearestClinic": "string", "distanceKm": "number" },
  "primaryFarmingGoal": "string",
  "capitalAvailability": "string",
  "preferredSalesChannel": "string",
  "traceabilityStatus": { "litsRegistered": "boolean", "branded": "boolean" },
  "financialInclusionIndex": "number (0-10)",
  "genderDynamics": { "primaryCaregiver": "string", "legalOwner": "string" },
  "digitalLiteracyProxy": "string",
  "networkReliability": "string",
  "aiSummary": "string"
}`;

// Nested object fields that must be deep-merged so new sub-fields
// never wipe out existing ones (e.g. updating litsRegistered must keep branded).
const NESTED_OBJECT_FIELDS = ['location', 'pahcProximity', 'traceabilityStatus', 'genderDynamics'];

// Array-of-string fields that accumulate over time. Firestore's merge:true
// REPLACES arrays wholesale, so we union them in JS before writing.
const APPEND_ARRAY_FIELDS = ['vaccinationHistory', 'predatorThreats'];

// Progressive profiling targets, highest priority first.
const PROFILING_PRIORITIES = [
    // 1. Biosecurity threats — outbreak mapping and immediate health risk
    { field: 'dipTankAffiliation', label: 'Which dip tank or community dipping group they use (biosecurity - highest priority)' },
    { field: 'vaccinationHistory', label: 'Which vaccinations their animals have received (biosecurity - highest priority)' },
    // 2. Foundational environmental factors — baseline nutrition and survival advice
    { field: 'agroEcologicalZone', label: 'Their veld type, e.g. sourveld or sweetveld (environmental)' },
    { field: 'primaryWaterSource', label: 'Their main livestock water source (environmental)' },
    // 3. Husbandry & infrastructure — operational limits of advice
    { field: 'grazingSystem', label: 'How their animals graze: communal, rotational, tethered (husbandry)' },
    { field: 'nightManagement', label: 'Where their animals are kept at night, e.g. kraaled (husbandry)' },
    // 4. Socio-economic context — financial feasibility of recommendations
    { field: 'primaryFarmingGoal', label: 'Their main farming goal, e.g. sales, food, savings (socio-economic - lowest priority)' },
    { field: 'capitalAvailability', label: 'Roughly how much they can spend on inputs like feed or medicine (socio-economic - lowest priority)' },
];

function isFieldMissing(value) {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
}

function getMissingPriorityFields(profile) {
    return PROFILING_PRIORITIES.filter(p => isFieldMissing(profile[p.field]));
}

/**
 * Generates a dynamic system prompt based on the farmer's profile.
 * This translates the raw JSON data into natural language instructions for the AI.
 * @param {object} profile - The farmer's profile object from Firestore.
 * @returns {string} A dynamically generated system prompt.
 */
function generateSystemPrompt(profile) {
    const basePrompt = `You are an expert agricultural assistant for FarmConnectSA, speaking directly to small-scale communal livestock farmers in South Africa. Your goal is to provide accurate, easy-to-understand advice. Keep answers concise, practical, and formatted for WhatsApp. If you do not know the answer, advise the farmer to consult a local state veterinarian.`;

    let context = "## Farmer Context:\n";

    // ── Location & language ──
    if (profile.location?.nearestTown || profile.location?.province) {
        context += `- The farmer is located near ${profile.location.nearestTown || ''}, ${profile.location.province || ''}.\n`;
    }
    if (profile.preferredLanguage) {
        context += `- Their preferred language is ${profile.preferredLanguage}. Try to use simple terms.\n`;
    }

    // ── Herd & health ──
    if (profile.herd && profile.herd.length > 0) {
        const herdString = profile.herd.map(h => `${h.count} ${h.animalType}`).join(', ');
        context += `- Their herd consists of: ${herdString}.\n`;
    }
    if (profile.healthTimeline && profile.healthTimeline.filter(e => e.status === 'ongoing').length > 0) {
        const ongoingIssues = profile.healthTimeline
            .filter(e => e.status === 'ongoing')
            .map(e => `${e.event} (${e.relatedAnimal})`)
            .join(', ');
        context += `- They have ongoing health concerns, including: ${ongoingIssues}. Pay close attention to these.\n`;
    }

    // ── Environmental ──
    const envParts = [];
    if (profile.agroEcologicalZone) envParts.push(`operates on ${profile.agroEcologicalZone} veld`);
    if (profile.primaryWaterSource) envParts.push(`water comes from ${profile.primaryWaterSource}`);
    if (profile.soilNutrientProfile) envParts.push(`soil is ${profile.soilNutrientProfile}`);
    if (envParts.length > 0) context += `- Environment: The farmer ${envParts.join('; ')}.\n`;
    if (typeof profile.climateVulnerabilityIndex === 'number') {
        context += `- Climate vulnerability: ${profile.climateVulnerabilityIndex}/10. ${profile.climateVulnerabilityIndex >= 7 ? 'They are highly exposed to climate shocks — factor drought/flood resilience into advice.' : ''}\n`;
    }

    // ── Husbandry & infrastructure ──
    const husbandryParts = [];
    if (profile.grazingSystem) husbandryParts.push(`utilizes a ${profile.grazingSystem} grazing system`);
    if (profile.nightManagement) husbandryParts.push(`animals are ${profile.nightManagement} at night`);
    if (husbandryParts.length > 0) context += `- Husbandry: The farmer ${husbandryParts.join('; ')}.\n`;
    if (profile.predatorThreats && profile.predatorThreats.length > 0) {
        context += `- Known predator threats: ${profile.predatorThreats.join(', ')}.\n`;
    }
    if (profile.theftRiskLevel) {
        context += `- Stock theft risk in their area: ${profile.theftRiskLevel}.\n`;
    }

    // ── Biosecurity ──
    if (profile.dipTankAffiliation) {
        context += `- Dip tank affiliation: ${profile.dipTankAffiliation}.\n`;
    }
    if (profile.vaccinationHistory && profile.vaccinationHistory.length > 0) {
        context += `- Vaccination history: ${profile.vaccinationHistory.join(', ')}.\n`;
    }
    if (profile.acaricideEfficacy) {
        context += `- Dip/acaricide efficacy: ${profile.acaricideEfficacy}. ${profile.acaricideEfficacy === 'suspected resistance' ? 'Consider recommending an acaricide class rotation.' : ''}\n`;
    }
    if (typeof profile.zoonoticAwarenessLevel === 'boolean') {
        context += `- Zoonotic disease awareness: ${profile.zoonoticAwarenessLevel ? 'aware of animal-to-human disease risks' : 'NOT aware of animal-to-human disease risks — gently include human safety warnings where relevant'}.\n`;
    }
    if (profile.pahcProximity?.nearestClinic) {
        const dist = typeof profile.pahcProximity.distanceKm === 'number' ? ` (~${profile.pahcProximity.distanceKm} km away)` : '';
        context += `- Nearest animal health support: ${profile.pahcProximity.nearestClinic}${dist}.\n`;
    }

    // ── Socio-economic ──
    const econParts = [];
    if (profile.primaryFarmingGoal) econParts.push(`their primary farming goal is ${profile.primaryFarmingGoal}`);
    if (profile.capitalAvailability) econParts.push(`capital availability is ${profile.capitalAvailability} — keep recommendations affordable at that level`);
    if (profile.preferredSalesChannel) econParts.push(`they prefer selling via ${profile.preferredSalesChannel}`);
    if (econParts.length > 0) context += `- Socio-economic: ${econParts.join('; ')}.\n`;
    if (profile.traceabilityStatus && (typeof profile.traceabilityStatus.litsRegistered === 'boolean' || typeof profile.traceabilityStatus.branded === 'boolean')) {
        context += `- Traceability: LITS registered: ${profile.traceabilityStatus.litsRegistered ? 'yes' : 'no'}; animals branded: ${profile.traceabilityStatus.branded ? 'yes' : 'no'}.\n`;
    }
    if (typeof profile.financialInclusionIndex === 'number') {
        context += `- Financial inclusion: ${profile.financialInclusionIndex}/10.\n`;
    }

    // ── Human capital ──
    if (profile.genderDynamics?.primaryCaregiver || profile.genderDynamics?.legalOwner) {
        const gd = [];
        if (profile.genderDynamics.primaryCaregiver) gd.push(`daily animal care is done by ${profile.genderDynamics.primaryCaregiver}`);
        if (profile.genderDynamics.legalOwner) gd.push(`the legal owner is ${profile.genderDynamics.legalOwner}`);
        context += `- Household roles: ${gd.join('; ')} — address advice to the person doing the daily work.\n`;
    }
    if (profile.digitalLiteracyProxy) {
        context += `- Digital literacy: ${profile.digitalLiteracyProxy}${profile.digitalLiteracyProxy === 'low' ? ' — use very short sentences and simple words' : ''}.\n`;
    }
    if (profile.networkReliability) {
        context += `- Network reliability: ${profile.networkReliability}${profile.networkReliability === 'poor' ? ' — keep messages short and self-contained; they may not receive follow-ups' : ''}.\n`;
    }

    // ── Progressive Profiling ──
    let profilingRule = `## Progressive Profiling:
You must act as an active, continuous listener. Review the farmer's provided context. If critical fields are missing, gracefully append one natural, diagnostic question to the end of your response to gather this data. Do NOT interrogate the farmer or ask a list of questions. Weave it conversationally into the context of their current problem. Never ask more than ONE profiling question per reply, and skip it entirely if the farmer is dealing with an urgent emergency.`;

    const missing = getMissingPriorityFields(profile);
    if (missing.length > 0) {
        profilingRule += `\n\nData still missing for this farmer, in STRICT priority order (highest first). Target the FIRST item unless the current conversation makes a lower one far more natural:\n`;
        profilingRule += missing.map((m, i) => `${i + 1}. ${m.label}`).join('\n');
    } else {
        profilingRule += `\n\nAll critical profile fields are already filled. Do not ask profiling questions — focus entirely on the farmer's request.`;
    }

    return `${basePrompt}\n\n${context}\n${profilingRule}`;
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
            model: "gpt-4o-mini",
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

        // Defensive strip: the LLM must never be able to write consent state or
        // rewrite the identity key, even if it hallucinates these fields.
        const PROTECTED_FIELDS = ['popiaConsent', 'consentStatus', 'consentDate', 'consentAskedAt', 'consentHistory', 'phoneNumber'];
        for (const field of PROTECTED_FIELDS) {
            delete extractedData[field];
        }

        const profileRef = db.collection('farmer_profiles').doc(senderNumber);

        // Smart Herd Merging Logic
        if (extractedData.herd) {
            const updatedHerd = [...(currentProfile.herd || [])];

            extractedData.herd.forEach(newAnimal => {
                const index = updatedHerd.findIndex(existing => existing.animalType.toLowerCase() === newAnimal.animalType.toLowerCase());
                if (index !== -1) {
                    updatedHerd[index].count = newAnimal.count;
                    if (newAnimal.lastReportedHealth) {
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

        // Sales Intent Merging: update-in-place per animalType (mirrors herd merge),
        // so "actually only 3 cattle" updates the entry instead of duplicating it.
        // Spread old + new so fields the new extraction omitted (e.g. targetDate) survive.
        if (Array.isArray(extractedData.salesIntent)) {
            const updatedIntents = [...(currentProfile.salesIntent || [])];
            const nowIso = new Date().toISOString();

            extractedData.salesIntent
                .filter(n => n && typeof n.animalType === 'string' && n.animalType.trim())
                .forEach(newIntent => {
                    const index = updatedIntents.findIndex(existing =>
                        (existing.animalType || '').toLowerCase() === newIntent.animalType.toLowerCase());
                    if (index !== -1) {
                        updatedIntents[index] = { ...updatedIntents[index], ...newIntent, updatedAt: nowIso };
                    } else {
                        updatedIntents.push({ ...newIntent, createdAt: nowIso, updatedAt: nowIso });
                    }
                });
            extractedData.salesIntent = updatedIntents;
        }

        // Deep-merge nested objects so partial updates never clobber existing sub-fields
        // (e.g. extracting litsRegistered must not erase an existing 'branded' value).
        for (const field of NESTED_OBJECT_FIELDS) {
            if (extractedData[field] && typeof extractedData[field] === 'object' && !Array.isArray(extractedData[field])) {
                extractedData[field] = { ...(currentProfile[field] || {}), ...extractedData[field] };
            }
        }

        // Union-append accumulating string arrays (Firestore merge:true replaces arrays)
        for (const field of APPEND_ARRAY_FIELDS) {
            if (Array.isArray(extractedData[field])) {
                extractedData[field] = [...new Set([...(currentProfile[field] || []), ...extractedData[field]])];
            }
        }

        const finalProfileUpdate = {
            ...extractedData,
            phoneNumber: senderNumber,
            lastInteraction: new Date().toISOString(),
            profileCreatedAt: currentProfile.profileCreatedAt || new Date().toISOString()
        };

        // Calculate Risk Status
        if (finalProfileUpdate.healthTimeline) {
            const ongoingHigh = finalProfileUpdate.healthTimeline.filter(e => e.status === 'ongoing' && e.severity === 'high').length;
            const ongoingMedium = finalProfileUpdate.healthTimeline.filter(e => e.status === 'ongoing' && e.severity === 'medium').length;
            if (ongoingHigh > 0) {
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
