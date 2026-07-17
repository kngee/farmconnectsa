// Central app configuration & shared constants

// Seeded as super_admin on first login (see services/userService.js);
// all other role checks live in roles.js against the users collection.
export const ADMIN_EMAIL = 'kiransoodyall03@gmail.com';

// WhatsApp bot entry point (Twilio sandbox)
export const TWILIO_NUMBER = '14155238886'; // Replace with your Twilio number (no +)
export const SANDBOX_PASSWORD = 'join settle-is'; // Replace with your sandbox code
export const WA_LINK = `https://wa.me/${TWILIO_NUMBER}?text=${encodeURIComponent(SANDBOX_PASSWORD)}`;
