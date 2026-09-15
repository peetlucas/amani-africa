// Optional Claude-powered helpers: free-text intent classification and Swahili translation.
// Falls back to plain keyword matching when ANTHROPIC_API_KEY is not set, so the bot always works.

const HAS_KEY = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = "claude-sonnet-4-5";

async function callClaude(system, userText) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "";
}

// Classify a free-text WhatsApp message into one of our known intents.
async function classifyIntent(text) {
  const lower = text.toLowerCase();

  if (HAS_KEY) {
    try {
      const system = [
        "Classify the user's WhatsApp message into exactly one intent.",
        "Reply with ONLY one word, no punctuation:",
        "SAFETY - asking if a market/area is safe or calm",
        "VOUCH - asking to register or be vouched for as a trader",
        "FACTCHECK - asking about a rumor or wanting the latest verified fact-check",
        "STATUS - asking whether their vouch request was approved",
        "MENU - anything else, greetings, or unclear",
      ].join("\n");
      const reply = await callClaude(system, text);
      const intent = reply.toUpperCase().match(/SAFETY|VOUCH|FACTCHECK|STATUS|MENU/)?.[0];
      if (intent) return intent;
    } catch (err) {
      console.error("[ai] classifyIntent fallback due to error:", err.message);
    }
  }

  // Keyword fallback - always available, no API key required.
  if (/vouch|register|join|sign\s*up/.test(lower)) return "VOUCH";
  if (/rumor|rumour|fact.?check|true|false|heard that/.test(lower)) return "FACTCHECK";
  if (/status|approved|pending/.test(lower)) return "STATUS";
  if (/safe|calm|tension|trouble|risk/.test(lower)) return "SAFETY";
  return "MENU";
}

// Try to extract a known market name from free text (simple contains-match fallback).
function matchMarket(text, markets) {
  const lower = text.toLowerCase();
  return markets.find((m) => lower.includes(m.name.toLowerCase().split(" ")[0].toLowerCase()));
}

async function translateToSwahili(text) {
  if (!HAS_KEY) return null; // no fallback translation without the API - English is used instead
  try {
    const system = "Translate the following message to Swahili. Reply with ONLY the translation, nothing else.";
    return await callClaude(system, text);
  } catch (err) {
    console.error("[ai] translateToSwahili failed:", err.message);
    return null;
  }
}

module.exports = { classifyIntent, matchMarket, translateToSwahili, HAS_KEY };
