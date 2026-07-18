const express = require('express');
const crypto = require('crypto');
const { db } = require('../services/firebaseService');
const { verifyFirebaseToken, requireRole } = require('../middleware/firebaseAuth');
const { broadcastPromotedAuction } = require('../services/broadcastService');
const { sendOutboundWhatsApp } = require('../services/reminderService');

const router = express.Router();

// Every marketplace route requires a signed-in user; role checks are per-route
// because farmers must be able to reach the listing-interest route.
router.use(verifyFirebaseToken);

const INSTITUTIONAL_ROLES = ['auctioneer', 'super_admin'];

// ── Lead masking helpers ─────────────────────────────────────

/**
 * Opaque lead IDs: salted sha256 of the profile doc ID. The doc ID IS the
 * farmer's phone number and the SA mobile number space is small enough to
 * brute-force unsalted hashes, so the salt is mandatory — fail closed without it.
 */
function leadIdFor(docId) {
    return crypto.createHash('sha256')
        .update(process.env.LEAD_ID_SALT + docId)
        .digest('hex');
}

function requireLeadSalt(req, res, next) {
    if (!process.env.LEAD_ID_SALT) {
        console.error('🚫 LEAD_ID_SALT is not set — marketplace lead routes are disabled.');
        return res.status(503).json({ error: 'Marketplace leads not configured' });
    }
    next();
}

/**
 * Masked Lead DTO. NEVER include: phone number, doc ID, name, email, health
 * data, or precise timestamps. Coarse location + intent only.
 */
function toLeadDTO(doc) {
    const p = doc.data();
    const lastInteraction = p.lastInteraction ? String(p.lastInteraction).slice(0, 10) : null;
    return {
        leadId: leadIdFor(doc.id),
        location: {
            nearestTown: p.location?.nearestTown || null,
            province: p.location?.province || null,
        },
        salesIntent: (p.salesIntent || []).map(s => ({
            animalType: s?.animalType || 'livestock',
            count: typeof s?.count === 'number' ? s.count : null,
            timeframe: s?.timeframe || 'future',
            targetDate: s?.targetDate || null,
        })),
        herdSummary: (p.herd || [])
            .filter(h => h && h.animalType)
            .map(h => ({ animalType: h.animalType, count: typeof h.count === 'number' ? h.count : null })),
        lastActive: lastInteraction,
    };
}

async function getConsentedLeadDocs() {
    const snap = await db.collection('farmer_profiles')
        .where('popiaConsent', '==', true)
        .get();
    return snap.docs.filter(doc => {
        const intents = doc.data().salesIntent;
        return Array.isArray(intents) && intents.length > 0;
    });
}

// ── Routes ───────────────────────────────────────────────────

// GET /api/marketplace/leads — masked qualified seller leads (institutional roles)
router.get('/leads', requireRole(INSTITUTIONAL_ROLES), requireLeadSalt, async (req, res) => {
    try {
        const docs = await getConsentedLeadDocs();
        const leads = docs.map(toLeadDTO);
        res.status(200).json({ count: leads.length, leads });
    } catch (error) {
        console.error('Error fetching marketplace leads:', error);
        res.status(500).json({ error: 'Could not fetch leads' });
    }
});

// POST /api/marketplace/broadcast — sponsored auction push to targeted farmers
router.post('/broadcast', requireRole(INSTITUTIONAL_ROLES), async (req, res) => {
    const { auctionId, targetLocation, targetAnimalType } = req.body || {};
    if (!auctionId || typeof auctionId !== 'string') {
        return res.status(400).json({ error: 'auctionId is required' });
    }

    try {
        const result = await broadcastPromotedAuction(
            auctionId,
            typeof targetLocation === 'string' ? targetLocation : null,
            typeof targetAnimalType === 'string' ? targetAnimalType : null,
            { uid: req.user.uid, email: req.user.email }
        );
        res.status(200).json(result);
    } catch (error) {
        if (error.code === 'AUCTION_NOT_FOUND') {
            return res.status(404).json({ error: 'Auction not found' });
        }
        console.error('Broadcast failed:', error);
        res.status(500).json({ error: 'Broadcast failed' });
    }
});

// POST /api/marketplace/leads/:leadId/purchase — conceptual (payments not built)
router.post('/leads/:leadId/purchase', requireRole(INSTITUTIONAL_ROLES), requireLeadSalt, async (req, res) => {
    try {
        const docs = await getConsentedLeadDocs();
        const match = docs.find(doc => leadIdFor(doc.id) === req.params.leadId);
        if (!match) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Demand signal for future billing — no contact info is revealed.
        await db.collection('lead_purchase_requests').add({
            leadId: req.params.leadId,
            requestedBy: { uid: req.user.uid, email: req.user.email },
            createdAt: new Date(),
        });

        res.status(501).json({
            error: 'not_implemented',
            message: 'Lead purchasing is coming soon. Your interest has been recorded.',
        });
    } catch (error) {
        console.error('Lead purchase request failed:', error);
        res.status(500).json({ error: 'Purchase request failed' });
    }
});

// POST /api/marketplace/listings/:listingId/interest — any signed-in role.
// Express-Interest relay: phone numbers stay hidden; the seller is notified on
// WhatsApp when their profile is linked, and always sees the interest in-app.
router.post('/listings/:listingId/interest', async (req, res) => {
    try {
        const listingRef = db.collection('marketplace_listings').doc(req.params.listingId);
        const listingSnap = await listingRef.get();
        if (!listingSnap.exists) {
            return res.status(404).json({ error: 'Listing not found' });
        }
        const listing = listingSnap.data();

        if (listing.status !== 'active') {
            return res.status(400).json({ error: 'Listing is no longer active' });
        }
        if (listing.sellerUid === req.user.uid) {
            return res.status(400).json({ error: 'You cannot express interest in your own listing' });
        }

        // Doc-ID-per-buyer gives free dedupe on repeat clicks
        await listingRef.collection('interests').doc(req.user.uid).set({
            buyerUid: req.user.uid,
            buyerEmail: req.user.email,
            buyerRole: req.user.role || 'farmer',
            createdAt: new Date(),
        }, { merge: true });

        // Resolve the seller's WhatsApp: uid-keyed profile, then email match —
        // the same fallback chain the farmer dashboard uses.
        let sellerPhone = null;
        const byUid = await db.collection('farmer_profiles').doc(listing.sellerUid).get();
        if (byUid.exists && byUid.data().phoneNumber) {
            sellerPhone = byUid.data().phoneNumber;
        } else {
            const sellerUser = await db.collection('users').doc(listing.sellerUid).get();
            const sellerEmail = sellerUser.exists ? sellerUser.data().email : null;
            if (sellerEmail) {
                const byEmail = await db.collection('farmer_profiles')
                    .where('email', '==', sellerEmail).limit(1).get();
                if (!byEmail.empty) {
                    sellerPhone = byEmail.docs[0].data().phoneNumber || byEmail.docs[0].id;
                }
            }
        }

        let notified = false;
        if (sellerPhone) {
            const count = typeof listing.count === 'number' ? listing.count : '';
            const animal = listing.animalType || 'livestock';
            notified = await sendOutboundWhatsApp(
                sellerPhone,
                `🛒 *FarmConnectSA Marketplace*\n\nA verified ${req.user.role || 'buyer'} is interested in your listing (${count} ${animal}).\nSee your dashboard to respond.`
            );
        }

        res.status(200).json({ notified });
    } catch (error) {
        console.error('Listing interest failed:', error);
        res.status(500).json({ error: 'Could not record interest' });
    }
});

module.exports = router;
