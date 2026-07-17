const twilio = require('twilio');

/**
 * Rejects any request to the Twilio webhook that was not genuinely signed by
 * Twilio, so spoofed messages never reach OpenAI or Firestore.
 *
 * Twilio signs the exact public URL it posted to. Behind ngrok/a proxy the
 * reconstructed URL can differ from the signed one, so TWILIO_WEBHOOK_URL
 * (the full public https URL of this route) takes precedence when set.
 */
function validateTwilioRequest(req, res, next) {
    if (process.env.SKIP_TWILIO_VALIDATION === 'true') {
        console.warn('⚠️  SKIP_TWILIO_VALIDATION=true — Twilio signature check BYPASSED. Never use this in production.');
        return next();
    }

    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.headers['x-twilio-signature'];
    const url = process.env.TWILIO_WEBHOOK_URL
        || `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (!authToken || !signature || !twilio.validateRequest(authToken, signature, url, req.body)) {
        console.warn(`🚫 Rejected webhook call with invalid/missing Twilio signature (from ${req.ip}).`);
        return res.status(403).send('Invalid Twilio signature');
    }

    next();
}

module.exports = validateTwilioRequest;
