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

// ---------- Markets ----------

app.get("/api/markets", (req, res) => {
  res.json(store.getMarkets());
});

app.post("/api/markets/:id/tension", (req, res) => {
  const { level } = req.body;
  const market = store.setTension(req.params.id, level);
  if (!market) return res.status(400).json({ error: "Invalid market id or tension level" });
  res.json(market);
});

// ---------- Fact-checks ----------

app.get("/api/factchecks", (req, res) => {
  res.json(store.getFactChecks(req.query.marketId));
});

app.post("/api/factchecks", (req, res) => {
  const { marketId, claim, verdict, explanation, postedBy } = req.body;
  if (!marketId || !claim || !verdict) {
    return res.status(400).json({ error: "marketId, claim and verdict are required" });
  }
  const entry = store.addFactCheck({ marketId, claim, verdict, explanation, postedBy });
  if (!entry) return res.status(400).json({ error: "Unknown marketId" });
  res.json(entry);
});

// ---------- Traders / vouching ----------

app.get("/api/traders", (req, res) => {
  res.json(store.getTraders(req.query.status));
});

app.post("/api/traders/:id/approve", (req, res) => {
  const trader = store.approveTrader(req.params.id);
  if (!trader) return res.status(404).json({ error: "Trader not found" });
  res.json(trader);
});

// ---------- Trader assistant (web simulator - same logic the WhatsApp bot uses) ----------

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
