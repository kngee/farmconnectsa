const crypto = require('crypto');

/**
 * Guards admin-only routes with a shared secret supplied via the
 * x-admin-token header, compared in constant time against ADMIN_API_TOKEN.
 */
function requireAdminToken(req, res, next) {
    const expected = process.env.ADMIN_API_TOKEN;
    if (!expected) {
        console.error('🚫 ADMIN_API_TOKEN is not set — admin routes are disabled.');
        return res.status(503).json({ error: 'Admin API not configured' });
    }

    const provided = String(req.headers['x-admin-token'] || '');
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

module.exports = requireAdminToken;
