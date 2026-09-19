// WhatsApp bot logic, shared by the real Twilio webhook and the in-browser simulator.
// Community members interact only through short messages / quick replies - they get
// verified information and can report concerns; they never see who else reported what.

const store = require("./store");
const ai = require("./ai");

const TENSION_LABEL = { green: "🟢 Calm", amber: "🟠 Rising tension", red: "🔴 High tension / active concern" };

function tensionLine(region) {
  return `${region.name}, ${region.city}: ${TENSION_LABEL[region.tension]}`;
}

function stripRegionName(text, region) {
  if (!region) return text;
  const re = new RegExp(region.name.split(" ")[0], "ig");
  return text.replace(re, "").trim();
}

async function handleIncomingMessage({ from, body, mediaUrl, mediaType }) {
  const text = (body || "").trim();
  const regions = store.getRegions();
  const intent = await ai.classifyIntent(text || (mediaUrl ? "report" : ""));
  const region = ai.matchRegion(text, regions);

  switch (intent) {
    case "SAFETY": {
      if (!region) {
        return listRegionsPrompt(regions, "Which area do you want to check? Reply with its name, e.g. \"Is Eastleigh calm today?\"");
      }
      const latest = store.getLatestFactCheck(region.id);
      let reply = tensionLine(region);
      if (latest) {
        reply += `\n\nLatest verified update: "${latest.claim}" -> ${latest.verdict.toUpperCase()}\n${latest.explanation}`;
      }
      reply += "\n\nIf you see something concerning, reply \"report\" to flag it - your identity is never shared.";
      return reply;
    }

    case "FACTCHECK": {
      const latest = region ? store.getLatestFactCheck(region.id) : store.getFactChecks()[0];
      if (!latest) return "No verified fact-checks yet for that area. We'll alert you as soon as a verifier confirms or debunks something.";
      const r = store.getRegion(latest.regionId);
      return `Fact-check for ${r.name}:\n"${latest.claim}" -> ${latest.verdict.toUpperCase()}\n${latest.explanation}`;
    }

    case "REPORT": {
      if (!region) {
        return listRegionsPrompt(
          regions,
          "To report a concern, tell me the area and what's happening, e.g. \"Report Eastleigh: a crowd is gathering outside the shops.\" You do not need to give your name."
        );
      }
      const description = stripRegionName(text, region).replace(/^report[:\s]*/i, "").trim() || "No further detail given.";
      const category = ai.guessReportCategory(description);
      const report = store.addReport({
        regionId: region.id,
        category,
        description,
        contact: from,
        attachmentUrl: mediaUrl || null,
        attachmentType: mediaUrl ? mediaType : null,
      });
      return [
        `Thank you - your report for ${region.name} has been sent to local verifiers for review. It is confidential and not shown publicly.`,
        `Category: ${category.replace("_", " ")}`,
        mediaUrl ? "Your attached photo/video was included - this helps verifiers confirm faster." : "You can also attach a photo or video for verifiers to check, if you have one - it's optional.",
        `If you or someone else is in immediate danger, please also contact local authorities directly.`,
      ].join("\n");
    }

    case "PROTECTION": {
      const note = region ? stripRegionName(text, region) : text;
      const request = store.requestProtection({ contact: from, note, regionId: region ? region.id : null });
      return "We've received your request to be connected with a local peace-committee contact. A verifier will reach out. This request is private - only verifiers can see it.";
    }

    case "STATUS": {
      const myReports = store.getReports().filter((r) => r.contact === from);
      const myRequests = store.findProtectionByContact(from);
      if (myReports.length === 0 && myRequests.length === 0) {
        return "You don't have any reports or protection requests on file. Reply \"report\" to flag a concern, or \"protect me\" if you feel at risk.";
      }
      const lines = [];
      myReports.forEach((r) => lines.push(`Report (${r.category.replace("_", " ")}): ${r.status.toUpperCase()}`));
      myRequests.forEach((p) => lines.push(`Protection request: ${p.status.toUpperCase()}`));
      return lines.join("\n");
    }

    default:
      return [
        "👋 Welcome to Amani Africa - verified area-safety information and confidential reporting.",
        "Reply with:",
        "- \"Is <area> calm today?\"",
        "- \"Report <area>: <what you're seeing>\"",
        "- \"Protect me\" to request a peace-committee contact",
        "- \"What's the latest fact-check?\"",
        "- \"status\" to check a report or request you already made",
      ].join("\n");
  }
}

function listRegionsPrompt(regions, prompt) {
  return `${prompt}\n\nAreas: ${regions.map((r) => `${r.name} (${r.city})`).join(", ")}`;
}

module.exports = { handleIncomingMessage };
