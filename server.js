require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const store = require("./store");
const whatsapp = require("./whatsapp");
const ai = require("./ai");
const broadcast = require("./broadcast");

const app = express();
const PORT = process.env.PORT || 3000;

// Optional evidence attached to a report - photo or short video. Stored on local disk for
// this proof of concept; swap for object storage (S3/GCS) before any real deployment.
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\/|^video\//.test(file.mimetype);
    cb(ok ? null : new Error("Only image or video attachments are allowed"), ok);
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio posts form-encoded bodies
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

// ---------- Regions ----------

app.get("/api/regions", (req, res) => {
  const regions = store.getRegions().map((r) => ({ ...r, subscriberCount: store.getSubscriberCount(r.id) }));
  res.json(regions);
});

const TENSION_ALERT = {
  amber: (r) => `\u{1F7E0} Amani Africa Alert: ${r.name}, ${r.city} tension has been raised to AMBER (rising tension). Avoid unnecessary travel there and don't act on unverified claims. Reply "report" if you see something concerning.`,
  red: (r) => `\u{1F534} Amani Africa Alert: ${r.name}, ${r.city} tension has been raised to RED (high tension / active concern). Avoid the area if possible. Reply "protect me" if you feel at risk.`,
  green: (r) => `\u{1F7E2} Amani Africa Update: ${r.name}, ${r.city} has returned to CALM. Verifiers confirm no ongoing concern.`,
};

app.post("/api/regions/:id/tension", async (req, res) => {
  const { level } = req.body;
  const before = store.getRegion(req.params.id);
  const previousLevel = before ? before.tension : null;
  const region = store.setTension(req.params.id, level);
  if (!region) return res.status(400).json({ error: "Invalid region id or tension level" });

  if (previousLevel !== level) {
    const buildAlert = TENSION_ALERT[level];
    if (buildAlert) await broadcast.broadcastToRegion(region.id, buildAlert(region));
  }

  res.json({ ...region, subscriberCount: store.getSubscriberCount(region.id) });
});

// ---------- Fact-checks ----------

app.get("/api/factchecks", (req, res) => {
  res.json(store.getFactChecks(req.query.regionId));
});

app.post("/api/factchecks", async (req, res) => {
  const { regionId, claim, verdict, explanation, postedBy, sourceReportId } = req.body;
  if (!regionId || !claim || !verdict) {
    return res.status(400).json({ error: "regionId, claim and verdict are required" });
  }
  const entry = store.addFactCheck({ regionId, claim, verdict, explanation, postedBy, sourceReportId });
  if (!entry) return res.status(400).json({ error: "Unknown regionId" });

  const region = store.getRegion(regionId);
  const alert = `\u{1F4CB} Amani Africa Fact-check for ${region.name}: "${claim}" → ${verdict.toUpperCase()}. ${explanation || ""}`.trim();
  await broadcast.broadcastToRegion(regionId, alert);

  res.json(entry);
});

// ---------- Anonymous reports ----------

app.get("/api/reports", (req, res) => {
  res.json(store.getReports(req.query.status));
});

// Attachment is entirely optional - accepts a normal JSON post with no file, or a
// multipart/form-data post with an "attachment" field carrying an image/video.
app.post("/api/reports", upload.single("attachment"), (req, res) => {
  const { regionId, category, description, contact } = req.body;
  if (!regionId || !description) {
    return res.status(400).json({ error: "regionId and description are required" });
  }
  let attachmentUrl = null;
  let attachmentType = null;
  if (req.file) {
    attachmentUrl = `/uploads/${req.file.filename}`;
    attachmentType = req.file.mimetype.startsWith("video/") ? "video" : "image";
  }
  const entry = store.addReport({ regionId, category, description, contact, attachmentUrl, attachmentType });
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
  // Twilio attaches media as MediaUrl0/MediaContentType0 when NumMedia > 0. The URL requires
  // Twilio account auth to fetch directly - stored as a reference here; a real deployment
  // would re-host it (like the web upload path does) rather than link to Twilio directly.
  const numMedia = parseInt(req.body.NumMedia || "0", 10);
  const mediaUrl = numMedia > 0 ? req.body.MediaUrl0 : null;
  const mediaType = numMedia > 0 && (req.body.MediaContentType0 || "").startsWith("video/") ? "video" : "image";
  console.log(`[whatsapp] ${from}: ${body}${mediaUrl ? ` [attached media: ${mediaUrl}]` : ""}`);

  const reply = await whatsapp.handleIncomingMessage({ from, body, mediaUrl, mediaType });

  res.set("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`);
});

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

app.get("/api/status", (req, res) => {
  res.json({ ok: true, aiEnabled: ai.HAS_KEY, twilioEnabled: broadcast.HAS_TWILIO });
});

app.get("/api/broadcasts", (req, res) => {
  res.json(broadcast.getLog());
});

// Keep upload failures (oversized/wrong-type file) as a clean 400 instead of a stack trace.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || /image or video/.test(err.message || "")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Amani Africa server running at http://localhost:${PORT}`);
  console.log(`AI (Claude) integration: ${ai.HAS_KEY ? "ENABLED" : "disabled - using keyword fallback"}`);
  console.log(`WhatsApp webhook path: /webhook/whatsapp (point ngrok + Twilio Sandbox here)`);
});
