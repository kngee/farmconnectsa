const { db } = require('./firebaseService');

/**
 * POPIA consent state machine for the WhatsApp flow.
 *
 * States (derived from farmer_profiles fields — consentStatus is the source of truth):
 *   NOT_ASKED ──(ask appended to reply)──▶ PENDING
 *   PENDING ──"YES"──▶ GRANTED        PENDING ──"NO"──▶ DECLINED
 *   PENDING ──(no decision after 72h)──▶ ask again (stays PENDING)
 *   GRANTED ──"STOP SHARING"──▶ DECLINED
 *   DECLINED ──"START SHARING"──▶ GRANTED
 *
 * POPIA "freely given" requirement: consent NEVER gates the vet advice.
 * The ask is only appended AFTER a full AI reply, and declining changes nothing
 * about the service the farmer receives.
 */

const RE_ASK_AFTER_MS = 72 * 60 * 60 * 1000;        // re-append the ask if still pending
const PENDING_CAPTURE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // stop capturing bare YES/NO after this

const CONSENT_ASK = `\n\n—\n📄 *Data sharing (POPIA)*\nTo help you sell your livestock for the best prices, can we securely share your herd numbers (never your name) with verified local buyers? Reply *YES* or *NO*.\n_Your answer never affects the advice you get. Change it anytime: STOP SHARING / START SHARING._`;

const CONSENT_GRANTED_REPLY = `✅ Thank you! We'll share only your herd numbers and area with verified buyers — never your name or phone number.\nReply *STOP SHARING* anytime to opt out.`;

const CONSENT_DECLINED_REPLY = `👍 No problem — your information stays private. This never affects the advice you get.\nReply *START SHARING* if you change your mind.`;

// Exact-match keyword sets (post-normalization). Deliberately conservative so a
// "yes" answering a normal AI question is the only ambiguity, and only while pending.
const GRANT_WORDS = new Set(['yes', 'y', 'yebo', 'ewe']);
const DECLINE_WORDS = new Set(['no', 'n', 'cha', 'hayi']);
const OPT_OUT_PHRASE = 'stop sharing';
const OPT_IN_PHRASE = 'start sharing';

function normalize(msg) {
    return String(msg || '')
        .toLowerCase()
        .replace(/[!.,?…\u{1F300}-\u{1FAFF}☀-➿]/gu, '') // punctuation + emoji
        .replace(/\s+/g, ' ')
        .trim();
}

function parseTime(value) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
}

/**
 * Records a consent decision on the farmer's profile with an append-only audit trail.
 */
async function recordConsentDecision(senderNumber, granted, viaMessage) {
    const profileRef = db.collection('farmer_profiles').doc(senderNumber);
    const snapshot = await profileRef.get();
    const existingHistory = (snapshot.exists && Array.isArray(snapshot.data().consentHistory))
        ? snapshot.data().consentHistory
        : [];
    const now = new Date().toISOString();

    await profileRef.set({
        popiaConsent: granted,
        consentStatus: granted ? 'granted' : 'declined',
        consentDate: now,
        consentHistory: [
            ...existingHistory,
            { status: granted ? 'granted' : 'declined', timestamp: now, viaMessage: String(viaMessage || '').slice(0, 60) }
        ]
    }, { merge: true });

    console.log(`📄 POPIA consent ${granted ? 'GRANTED' : 'DECLINED'} for ${senderNumber}`);
}

/**
 * Runs BEFORE the AI on every inbound message.
 * Returns { consumed, reply, appendAsk }:
 *   consumed  — message was a pure consent keyword; reply with `reply` and skip the AI
 *   appendAsk — caller should append CONSENT_ASK to the AI reply (pending state
 *               has already been written here)
 */
async function preProcessInbound(senderNumber, incomingMsg) {
    const result = { consumed: false, reply: null, appendAsk: false };

    try {
        const text = normalize(incomingMsg);

        // Change-of-mind phrases work in ANY state
        if (text === OPT_OUT_PHRASE) {
            await recordConsentDecision(senderNumber, false, incomingMsg);
            return { ...result, consumed: true, reply: CONSENT_DECLINED_REPLY };
        }
        if (text === OPT_IN_PHRASE) {
            await recordConsentDecision(senderNumber, true, incomingMsg);
            return { ...result, consumed: true, reply: CONSENT_GRANTED_REPLY };
        }

        const snapshot = await db.collection('farmer_profiles').doc(senderNumber).get();
        const profile = snapshot.exists ? snapshot.data() : {};
        const status = profile.consentStatus;

        // Already decided and not a change-of-mind phrase → nothing to do
        if (status === 'granted' || status === 'declined') return result;

        if (status === 'pending') {
            const askedAt = parseTime(profile.consentAskedAt);
            const sinceAsk = Date.now() - askedAt;

            // Capture bare YES/NO only while the ask is fresh
            if (sinceAsk <= PENDING_CAPTURE_WINDOW_MS) {
                if (GRANT_WORDS.has(text)) {
                    await recordConsentDecision(senderNumber, true, incomingMsg);
                    return { ...result, consumed: true, reply: CONSENT_GRANTED_REPLY };
                }
                if (DECLINE_WORDS.has(text)) {
                    await recordConsentDecision(senderNumber, false, incomingMsg);
                    return { ...result, consumed: true, reply: CONSENT_DECLINED_REPLY };
                }
            }

            // Still pending: gently re-ask after 72h, otherwise let the AI answer normally
            if (sinceAsk >= RE_ASK_AFTER_MS) {
                await db.collection('farmer_profiles').doc(senderNumber).set({
                    consentStatus: 'pending',
                    consentAskedAt: new Date().toISOString()
                }, { merge: true });
                return { ...result, appendAsk: true };
            }
            return result;
        }

        // NOT_ASKED (new farmer or pre-consent profile): mark pending, ask after the AI reply.
        // set(merge:true) also creates the doc for a first-ever message.
        await db.collection('farmer_profiles').doc(senderNumber).set({
            consentStatus: 'pending',
            consentAskedAt: new Date().toISOString()
        }, { merge: true });
        return { ...result, appendAsk: true };

    } catch (error) {
        // Fail open for the farmer: consent bookkeeping must never block vet advice
        console.error('Consent pre-processing failed:', error);
        return result;
    }
}

module.exports = { preProcessInbound, recordConsentDecision, CONSENT_ASK };
