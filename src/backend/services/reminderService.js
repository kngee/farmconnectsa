const cron = require('node-cron');
const twilio = require('twilio');
const { db } = require('./firebaseService');
require('dotenv').config();

// Initialize Twilio Client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const fromNumber = process.env.TWILIO_SANDBOX_NUMBER;

async function sendOutboundWhatsApp(toNumber, messageBody) {
    try {
        await client.messages.create({
            body: messageBody,
            from: fromNumber,
            to: toNumber
        });
        console.log(`✅ Automated reminder sent to ${toNumber}`);
    } catch (error) {
        console.error(`❌ Failed to send reminder to ${toNumber}:`, error.message);
    }
}

// ── The Core Scanning Logic (Separated for Testing) ──
async function runReminderScan() {
    console.log("🔍 Running farmer profile scan...");
    let sentCount = 0;

    try {
        const profilesSnapshot = await db.collection('farmer_profiles').get();
        
        profilesSnapshot.forEach(doc => {
            const profile = doc.data();
            const phone = profile.phoneNumber;
            
            // Safety check: Ensure they have a herd array
            if (!profile.herd || profile.herd.length === 0) return;

            // Check if they own Cattle or Goats
            const hasVulnerableAnimals = profile.herd.some(animal => 
                animal.animalType.toLowerCase().includes('cattle') || 
                animal.animalType.toLowerCase().includes('cow') ||
                animal.animalType.toLowerCase().includes('goat')
            );

            if (hasVulnerableAnimals) {
                const message = `🌾 *FarmConnectSA Health Alert*\n\nHi there! We noticed you have livestock in your profile. As we enter the warmer months, the risk of tick-borne diseases (like Redwater and Heartwater) increases.\n\nEnsure your dipping schedule is up to date. Reply to this message if you need advice on which dip to use!`;
                
                sendOutboundWhatsApp(phone, message);
                sentCount++;
            }
        });

        return { success: true, messagesSent: sentCount };

    } catch (error) {
        console.error("Error running reminder scan:", error);
        return { success: false, error: error.message };
    }
}

// ── The Cron Job ──
function initializeReminders() {
    console.log("⏰ Proactive Reminder Engine Initialized.");
    
    // Runs automatically every day at 8:00 AM
    cron.schedule('0 8 * * *', () => {
        console.log("⏰ Cron Triggered: Running daily scan.");
        runReminderScan();
    });
}

// Export the new runReminderScan function so app.js can use it
module.exports = { initializeReminders, sendOutboundWhatsApp, runReminderScan };