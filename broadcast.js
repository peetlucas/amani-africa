// Proactive outbound alerts - the piece that closes the loop. Without this, a verifier's
// tension change or fact-check only reaches someone who happens to ask. With it, everyone
// subscribed to that area gets told immediately, unprompted.
//
// Note on production readiness: Twilio's free WhatsApp Sandbox can only message numbers
// that joined the sandbox, and WhatsApp's own rules require a pre-approved message template
// for proactive (non-reply) messages sent outside a 24-hour conversation window. This module
// sends for real through Twilio when credentials are configured, and always logs/simulates
// so the mechanism is demonstrable even without a Twilio account.

const store = require("./store");

const HAS_TWILIO = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
const FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

let client = null;
if (HAS_TWILIO) {
  const twilio = require("twilio");
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const log = []; // recent broadcasts, newest first - shown in the Verifier Console for transparency

// Per-contact inbox of everything we ever tried to deliver, regardless of whether the real
// Twilio send succeeded. This is what lets the web Community Assistant simulator show an
// alert arriving unprompted, the same way a real WhatsApp push would - without it, "proactive"
// alerts would only ever be visible in the Verifier Console's log, never on the receiving side.
const inbox = {}; // contact -> [{ message, createdAt }]

function pushToInbox(contact, message) {
  if (!inbox[contact]) inbox[contact] = [];
  inbox[contact].push({ message, createdAt: Date.now() });
}

function getInbox(contact, since = 0) {
  return (inbox[contact] || []).filter((m) => m.createdAt > Number(since));
}

async function sendWhatsApp(to, body) {
  pushToInbox(to, body);
  if (!HAS_TWILIO) {
    console.log(`[broadcast:simulated] -> ${to}: ${body}`);
    return { to, ok: true, simulated: true };
  }
  try {
    await client.messages.create({ from: FROM, to, body });
    return { to, ok: true, simulated: false };
  } catch (err) {
    console.error(`[broadcast] failed to send to ${to}:`, err.message);
    return { to, ok: false, error: err.message };
  }
}

async function broadcastToRegion(regionId, message) {
  const region = store.getRegion(regionId);
  const subscribers = store.getSubscribers(regionId);
  const results = await Promise.all(subscribers.map((s) => sendWhatsApp(s.contact, message)));

  const delivered = results.filter((r) => r.ok && !r.simulated).length;
  const simulated = results.filter((r) => r.simulated).length;
  const failed = results.filter((r) => !r.ok).length;

  log.unshift({
    id: log.length + 1,
    regionId,
    regionName: region ? region.name : regionId,
    message,
    recipientCount: subscribers.length,
    delivered,
    simulated,
    failed,
    // Surfaced in the Verifier Console so a failed send is never silently reported as sent -
    // e.g. Twilio trial accounts block outbound messages to unverified numbers in some countries.
    failureReasons: [...new Set(results.filter((r) => !r.ok).map((r) => r.error))],
    createdAt: Date.now(),
  });

  return { recipientCount: subscribers.length, results };
}

function getLog() {
  return log;
}

module.exports = { sendWhatsApp, broadcastToRegion, getLog, getInbox, HAS_TWILIO };
