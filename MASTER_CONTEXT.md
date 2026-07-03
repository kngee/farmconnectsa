Of course. As a Senior Full-Stack Software Engineer and Systems Architect, I've designed the comprehensive architecture and generated the code for your "Dynamic Farmer Profile CRM" in FarmConnectSA.

Here are the four pillars of the solution:

### Pillar 1: Firestore Database Schema (The CRM Foundation)

A robust and scalable NoSQL schema is critical. The following design for the `farmer_profiles` collection is optimized for our needs: it's readable, easily mergeable by the AI, and structured for future data analysis.

The document ID for each record will be the farmer's WhatsApp number (e.g., `+27821234567`).

**`farmer_profiles/{phoneNumber}` Document Structure:**

```json
{
  // --- Core Demographics ---
  "phoneNumber": "+27821234567", // Primary ID
  "preferredLanguage": "isiZulu", // ISO 639-1 code, extracted by AI
  "location": {
    "province": "KwaZulu-Natal", // Extracted by AI
    "municipality": "uMkhanyakude", // Extracted by AI
    "nearestTown": "Jozini" // Extracted by AI
  },

  // --- AI-Managed Metadata ---
  "profileCreatedAt": "2023-10-27T10:00:00Z", // ISO 8601 Timestamp
  "lastInteraction": "2024-05-21T15:30:00Z", // Updated on every interaction
  "aiSummary": "A small-scale farmer in KZN with a mixed herd, primarily concerned with tick-borne diseases in his cattle.", // AI-generated summary for quick admin review.

  // --- Dynamic, AI-Managed Inventory ---
  "herd": [
    { "animalType": "cattle", "count": 15, "lastReportedHealth": "good" },
    { "animalType": "goats", "count": 25, "lastReportedHealth": "concerns about coughing" },
    { "animalType": "chickens", "count": 50, "lastReportedHealth": "stable" }
  ],

  // --- Timeline for Predictive Analytics & Risk Assessment ---
  "healthTimeline": [
    {
      "timestamp": "2024-05-21T15:30:00Z",
      "event": "Reported coughing in goats.",
      "severity": "medium", // 'low', 'medium', 'high'
      "relatedAnimal": "goats",
      "status": "ongoing" // 'ongoing', 'resolved'
    },
    {
      "timestamp": "2024-04-12T09:00:00Z",
      "event": "Reported tick infestation in cattle.",
      "severity": "high",
      "relatedAnimal": "cattle",
      "status": "resolved"
    }
  ],
  
  // --- Risk Profile ---
  "riskStatus": "medium" // 'low', 'medium', 'high'. Calculated based on healthTimeline.
}
```

**Architectural Decisions:**

1.  **Document ID:** Using the phone number is a natural primary key, ensuring uniqueness and fast lookups.
2.  **Nested Location:** Structuring location allows for geospatial queries, like finding all farmers in a specific municipality to warn them of a localized outbreak.
3.  **Dynamic `herd` Array:** An array of objects is perfect for this. The AI can easily add new animal types or update counts.
4.  **`healthTimeline`:** This is the most critical part for ML. It creates a time-series record of health events. We can run analysis on this to find patterns, predict future risks, and calculate the overall `riskStatus`.

---

Now, let's implement the backend logic and the frontend view. I will provide the code for the remaining pillars in the following steps.

---
### System Workflow: The Lifecycle of a Farmer Profile

This describes the end-to-end process of how a farmer profile is created and continuously updated, simply by having a conversation.

1.  **First Contact (via WhatsApp):**
    *   A farmer sends their first message to the FarmConnectSA WhatsApp number.
    *   Twilio receives this message and forwards it to our Node.js/Express webhook endpoint (e.g., `/api/twilio/webhook`).
    *   The `senderNumber` (e.g., `whatsapp:+27821234567`) is extracted from the Twilio payload.

2.  **Initial AI Interaction:**
    *   Our `generateAgriResponse` function in `aiService.js` is triggered.
    *   It queries the `farmer_profiles` collection in Firestore for a document with the `senderNumber` as its ID.
    *   **No profile is found.** The `currentProfile` object remains empty.
    *   The AI generates a standard, non-personalized welcome message, as it has no context yet.

3.  **Background Profile Creation:**
    *   After the initial reply is sent to the farmer, the `extractAndSaveProfile` function in `profileService.js` is called **asynchronously** in the background.
    *   It takes the farmer's first message (e.g., "Hello, I am a farmer in Limpopo and I have 20 cattle") and an empty `currentProfile`.
    *   The OpenAI API (in JSON mode) analyzes the message based on the advanced `EXTRACTION_PROMPT`. It might extract: `{ "location": { "province": "Limpopo" }, "herd": [{ "animalType": "cattle", "count": 20 }] }`.
    *   The function then calls `db.collection('farmer_profiles').doc(senderNumber).set(..., { merge: true })`.
    *   Since no document exists, Firestore **creates a new one** with the `senderNumber` as the ID and populates it with the extracted data, along with `profileCreatedAt` and `lastInteraction` timestamps.

4.  **Subsequent Interactions & Dynamic Context:**
    *   The farmer sends another message (e.g., "My cows are coughing").
    *   The `generateAgriResponse` function runs again. This time, it **finds the existing profile** in Firestore.
    *   The `generateSystemPrompt` function is now called with the rich profile data. It constructs a highly contextual prompt: *"You are speaking to a farmer near Polokwane, Limpopo. Their herd consists of: 20 cattle. Pay attention to their needs."*
    *   The AI's response is now personalized and informed (e.g., "Coughing in cattle in Limpopo can be a sign of...").
    *   In the background, `extractAndSaveProfile` runs again. It analyzes "My cows are coughing" and extracts a new health event: `{ "healthTimeline": [{ "event": "Reported coughing", "relatedAnimal": "cattle", "severity": "medium", "status": "ongoing" }] }`.
    *   This new data is **merged** into the existing Firestore document, appending to the `healthTimeline` array and updating the `riskStatus`.

This cycle repeats with every message, making the CRM profile richer and the AI's advice progressively more accurate and personalized over time, with zero manual data entry required.
