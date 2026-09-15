// WhatsApp bot logic, shared by the real Twilio webhook and the in-browser simulator.
// Traders interact only through quick replies / short free text - they receive alerts, they don't file reports.

const store = require("./store");
const ai = require("./ai");

function tensionLine(market) {
  const labels = { calm: "🟢 Calm", watch: "🟡 Watch", high: "🔴 High tension" };
  return `${market.name}: ${labels[market.tension]}`;
}

async function handleIncomingMessage({ from, body }) {
  const text = (body || "").trim();
  const markets = store.getMarkets();
  const intent = await ai.classifyIntent(text);
  const market = ai.matchMarket(text, markets);

  switch (intent) {
    case "SAFETY": {
      if (!market) {
        return listMarketsPrompt(markets, "Which market do you want to check? Reply with the name, e.g. \"Is Eastleigh safe today?\"");
      }
      const latest = store.getLatestFactCheck(market.id);
      let reply = tensionLine(market);
      if (latest) {
        reply += `\n\nLatest verified update: "${latest.claim}" -> ${latest.verdict.toUpperCase()}\n${latest.explanation}`;
      }
      return reply;
    }

    case "FACTCHECK": {
      const target = market || null;
      const latest = target ? store.getLatestFactCheck(target.id) : store.getFactChecks()[0];
      if (!latest) return "No verified fact-checks yet for that market. We'll alert you as soon as a verifier posts one.";
      const m = store.getMarket(latest.marketId);
      return `Fact-check for ${m.name}:\n"${latest.claim}" -> ${latest.verdict.toUpperCase()}\n${latest.explanation}`;
    }

    case "VOUCH": {
      if (!market) {
        return listMarketsPrompt(markets, "Which market do you trade at? Reply with the name to request vouching, e.g. \"Vouch me for Gikomba\".");
      }
      const trader = store.requestVouch({ phone: from, marketId: market.id });
      return `Thanks! Your vouch request for ${market.name} is now PENDING review by a local verifier. We'll message you once it's approved.`;
    }

    case "STATUS": {
      const mine = store.findTraderByPhone(from);
      if (mine.length === 0) return "You don't have any vouch requests yet. Reply \"vouch me for <market>\" to start one.";
      return mine.map((t) => {
        const m = store.getMarket(t.marketId);
        return `${m.name}: ${t.status.toUpperCase()}`;
      }).join("\n");
    }

    default:
      return [
        "👋 Welcome to Amani Africa.",
        "Reply with:",
        "- \"Is <market> safe today?\"",
        "- \"Vouch me for <market>\"",
        "- \"What's the latest fact-check?\"",
        "- \"status\" to check your vouch request",
      ].join("\n");
  }
}

function listMarketsPrompt(markets, prompt) {
  return `${prompt}\n\nMarkets: ${markets.map((m) => m.name).join(", ")}`;
}

module.exports = { handleIncomingMessage };
