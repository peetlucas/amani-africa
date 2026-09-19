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
        "SAFETY - asking if a region/area is calm or safe",
        "REPORT - reporting a rumor, a gathering, a business being targeted, or an attack in progress",
        "PROTECTION - asking to be connected to a peace-committee / protection contact because they feel at risk",
        "FACTCHECK - asking about a rumor or wanting the latest verified fact-check",
        "STATUS - asking about the status of a report or protection request they already made",
        "SUBSCRIBE - asking to get alerts, notifications, or updates for an area",
        "UNSUBSCRIBE - asking to stop getting alerts for an area",
        "MENU - anything else, greetings, or unclear",
      ].join("\n");
      const reply = await callClaude(system, text);
      const intent = reply.toUpperCase().match(/SAFETY|REPORT|PROTECTION|FACTCHECK|STATUS|UNSUBSCRIBE|SUBSCRIBE|MENU/)?.[0];
      if (intent) return intent;
    } catch (err) {
      console.error("[ai] classifyIntent fallback due to error:", err.message);
    }
  }

  // Keyword fallback - always available, no API key required. Order matters:
  // "unsubscribe" must be checked before "subscribe" since it contains that substring.
  if (/unsubscribe|stop.*alert|no more alert/.test(lower)) return "UNSUBSCRIBE";
  if (/subscribe|alert me|notify me|follow this area|get alerts/.test(lower)) return "SUBSCRIBE";
  if (/report|gathering|crowd|mob|targeted|attack|being attacked/.test(lower)) return "REPORT";
  if (/protect|at risk|unsafe for me|feel unsafe|help me/.test(lower)) return "PROTECTION";
  if (/rumor|rumour|fact.?check|true or false|heard that/.test(lower)) return "FACTCHECK";
  if (/status|resolved|pending|reviewing/.test(lower)) return "STATUS";
  if (/safe|calm|tension|trouble|risk/.test(lower)) return "SAFETY";
  return "MENU";
}

// Try to extract a known region name from free text (simple contains-match fallback).
function matchRegion(text, regions) {
  const lower = text.toLowerCase();
  return regions.find((r) => lower.includes(r.name.toLowerCase().split(" ")[0].toLowerCase()));
}

// Very rough category guess for a report, used by the fallback path.
function guessReportCategory(text) {
  const lower = text.toLowerCase();
  if (/attack|violence|burning|looting/.test(lower)) return "attack_in_progress";
  if (/shop|business|stall|store/.test(lower)) return "business_targeted";
  if (/crowd|gathering|mob forming|group forming/.test(lower)) return "gathering";
  if (/rumor|rumour|claim|heard/.test(lower)) return "rumor";
  return "other";
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

module.exports = { classifyIntent, matchRegion, guessReportCategory, translateToSwahili, HAS_KEY };
