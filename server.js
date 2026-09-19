require("dotenv").config();
const express = require("express");
const path = require("path");
const store = require("./store");
const whatsapp = require("./whatsapp");
const ai = require("./ai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio posts form-encoded bodies
app.use(express.static(path.join(__dirname, "public")));

// ---------- Regions ----------

app.get("/api/regions", (req, res) => {
  res.json(store.getRegions());
});

app.post("/api/regions/:id/tension", (req, res) => {
  const { level } = req.body;
  const region = store.setTension(req.params.id, level);
  if (!region) return res.status(400).json({ error: "Invalid region id or tension level" });
  res.json(region);
});

// ---------- Fact-checks ----------

app.get("/api/factchecks", (req, res) => {
  res.json(store.getFactChecks(req.query.regionId));
});

app.post("/api/factchecks", (req, res) => {
  const { regionId, claim, verdict, explanation, postedBy, sourceReportId } = req.body;
  if (!regionId || !claim || !verdict) {
    return res.status(400).json({ error: "regionId, claim and verdict are required" });
  }
  const entry = store.addFactCheck({ regionId, claim, verdict, explanation, postedBy, sourceReportId });
  if (!entry) return res.status(400).json({ error: "Unknown regionId" });
  res.json(entry);
});

// ---------- Anonymous reports ----------

app.get("/api/reports", (req, res) => {
  res.json(store.getReports(req.query.status));
});

app.post("/api/reports", (req, res) => {
  const { regionId, category, description, contact } = req.body;
  if (!regionId || !description) {
    return res.status(400).json({ error: "regionId and description are required" });
  }
  const entry = store.addReport({ regionId, category, description, contact });
  if (!entry) return res.status(400).json({ error: "Unknown regionId" });
  res.json(entry);
});

app.post("/api/reports/:id/resolve", (req, res) => {
  const { resolution, status } = req.body;
  const report = store.resolveReport(req.params.id, { resolution, status });
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

// ---------- Protection requests ----------

app.get("/api/protection", (req, res) => {
  res.json(store.getProtectionRequests(req.query.status));
});

app.post("/api/protection/:id/connect", (req, res) => {
  const request = store.connectProtection(req.params.id);
  if (!request) return res.status(404).json({ error: "Protection request not found" });
  res.json(request);
});

// ---------- Community assistant (web simulator - same logic the WhatsApp bot uses) ----------

app.post("/api/assistant/message", async (req, res) => {
  const { from, body } = req.body;
  if (!from || !body) return res.status(400).json({ error: "from and body are required" });
  const reply = await whatsapp.handleIncomingMessage({ from, body });
  res.json({ reply });
});

// ---------- Real WhatsApp webhook (Twilio) ----------

app.post("/webhook/whatsapp", async (req, res) => {
  const from = req.body.From; // e.g. "whatsapp:+2547XXXXXXXX"
  const body = req.body.Body;
  console.log(`[whatsapp] ${from}: ${body}`);

  const reply = await whatsapp.handleIncomingMessage({ from, body });

  res.set("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`);
});

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

app.get("/api/status", (req, res) => {
  res.json({ ok: true, aiEnabled: ai.HAS_KEY });
});

app.listen(PORT, () => {
  console.log(`Amani Africa server running at http://localhost:${PORT}`);
  console.log(`AI (Claude) integration: ${ai.HAS_KEY ? "ENABLED" : "disabled - using keyword fallback"}`);
  console.log(`WhatsApp webhook path: /webhook/whatsapp (point ngrok + Twilio Sandbox here)`);
});
