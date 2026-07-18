const crypto = require('crypto');
const { db } = require('./firebaseService');
const { sendOutboundWhatsApp } = require('./reminderService');

/**
 * Sponsored auction broadcasts to consented, targeted farmers.
 *
 * POPIA: recipients are ONLY farmers with popiaConsent === true. Every broadcast
 * writes an audit record (with salted recipient hashes, never raw numbers).
 *
 * Integrity firewall: this message is clearly demarcated as SPONSORED and is
 * completely separate from the clinical AI advice pipeline.
 *
 * Sandbox limitation: on the Twilio WhatsApp sandbox, freeform outbound messages
 * only deliver to farmers inside their 24-hour session window (error 63016
 * otherwise) — those failures are counted honestly in `failed`. Production
 * requires a WhatsApp Business number with pre-approved message templates.
 */

const MAX_BROADCAST_RECIPIENTS = 50; // guardrail: an unfiltered broadcast cannot blast everyone

function hashRecipient(phone) {
    const salt = process.env.LEAD_ID_SALT || '';
    return crypto.createHash('sha256').update(salt + phone).digest('hex');
}

function formatAuctionDate(value) {
    const d = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    if (!d || Number.isNaN(d.getTime())) return 'Date TBA';
    return d.toLocaleString('en-ZA', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg'
    });
}

function matchesLocation(profile, targetLocation) {
    if (!targetLocation) return true;
    const target = String(targetLocation).toLowerCase().trim();
    if (!target) return true;
    const candidates = [
        profile.location?.nearestTown,
        profile.location?.municipality,
        profile.location?.province,
    ].filter(Boolean).map(v => String(v).toLowerCase());
    // Bidirectional includes tolerates "Bloem" vs "Bloemfontein" in either field
    return candidates.some(c => c.includes(target) || target.includes(c));
}

function matchesAnimalType(profile, targetAnimalType) {
    if (!targetAnimalType) return true;
    const target = String(targetAnimalType).toLowerCase().trim();
    if (!target) return true;
    const herdMatch = Array.isArray(profile.herd) &&
        profile.herd.some(h => (h?.animalType || '').toLowerCase().includes(target));
    const intentMatch = Array.isArray(profile.salesIntent) &&
        profile.salesIntent.some(s => (s?.animalType || '').toLowerCase().includes(target));
    return herdMatch || intentMatch;
}

function buildBroadcastMessage(auction, targetAnimalType) {
    const animalLine = targetAnimalType
        ? `\nSelling ${targetAnimalType}? Buyers will be at this auction.\n`
        : '';
    return `📢 *SPONSORED ALERT* — FarmConnectSA\n\n🐄 Livestock auction near you:\n*${auction.title || 'Livestock Auction'}*\n📅 ${formatAuctionDate(auction.date)}\n📍 ${auction.location || 'Location TBA'}\n${animalLine}\n_You receive these because you agreed to buyer alerts. Reply STOP SHARING to opt out._`;
}

/**
 * Broadcasts a promoted auction to consented farmers matching the filters.
 * @returns {Promise<{matched:number, sent:number, failed:number, broadcastId:string}>}
 * @throws {{code:'AUCTION_NOT_FOUND'}} when the auction doc does not exist
 */
async function broadcastPromotedAuction(auctionId, targetLocation, targetAnimalType, initiatedBy = null) {
    const auctionSnap = await db.collection('auction_schedules').doc(auctionId).get();
    if (!auctionSnap.exists) {
        const err = new Error(`Auction not found: ${auctionId}`);
        err.code = 'AUCTION_NOT_FOUND';
        throw err;
    }
    const auction = auctionSnap.data();

    // Single equality where() — auto-indexed, no composite index required.
    const consentedSnap = await db.collection('farmer_profiles')
        .where('popiaConsent', '==', true)
        .get();

    const recipients = [];
    consentedSnap.forEach(doc => {
        const profile = doc.data();
        const phone = profile.phoneNumber || doc.id;
        if (!phone) return;
        if (!matchesLocation(profile, targetLocation)) return;
        if (!matchesAnimalType(profile, targetAnimalType)) return;
        recipients.push(phone);
    });

    const capped = recipients.slice(0, MAX_BROADCAST_RECIPIENTS);
    const message = buildBroadcastMessage(auction, targetAnimalType);

    let sent = 0;
    let failed = 0;
    for (const phone of capped) {
        const ok = await sendOutboundWhatsApp(phone, message);
        if (ok) sent++; else failed++;
    }

    const auditRef = await db.collection('broadcasts').add({
        auctionId,
        auctionTitle: auction.title || null,
        targetLocation: targetLocation || null,
        targetAnimalType: targetAnimalType || null,
        initiatedBy: initiatedBy || null,
        matchedCount: recipients.length,
        sentCount: sent,
        failedCount: failed,
        recipientHashes: capped.map(hashRecipient),
        createdAt: new Date(),
        status: 'completed'
    });

    console.log(`📢 Broadcast ${auditRef.id}: matched ${recipients.length}, sent ${sent}, failed ${failed}`);
    return { matched: recipients.length, sent, failed, broadcastId: auditRef.id };
}

module.exports = { broadcastPromotedAuction, MAX_BROADCAST_RECIPIENTS };
