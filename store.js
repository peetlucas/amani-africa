// In-memory data store shared by the web dashboard and the WhatsApp bot.
// A hackathon proof of concept — swap for a real database (Postgres/SQLite) before production use.
//
// Sample regions and fact-checks below are illustrative placeholders for the demo only.
// They do not represent verified claims about any real incident, community, or nationality —
// in a real deployment, region data and fact-checks would come only from vetted local verifiers.

const regions = [
  { id: "eastleigh", name: "Eastleigh", city: "Nairobi", country: "Kenya", type: "trading district", lat: -1.2833, lng: 36.8500, tension: "green", updatedAt: Date.now() },
  { id: "gikomba", name: "Gikomba Market", city: "Nairobi", country: "Kenya", type: "market", lat: -1.2864, lng: 36.8322, tension: "green", updatedAt: Date.now() },
  { id: "kibuye", name: "Kibuye Market", city: "Kisumu", country: "Kenya", type: "market", lat: -0.1022, lng: 34.7617, tension: "green", updatedAt: Date.now() },
  { id: "cbd-nairobi", name: "Nairobi CBD", city: "Nairobi", country: "Kenya", type: "business district", lat: -1.2864, lng: 36.8172, tension: "green", updatedAt: Date.now() },
  { id: "marabastad", name: "Marabastad", city: "Pretoria", country: "South Africa", type: "trading district", lat: -25.7350, lng: 28.1875, tension: "green", updatedAt: Date.now() },
  { id: "durban-cbd", name: "Durban CBD", city: "Durban", country: "South Africa", type: "business district", lat: -29.8579, lng: 31.0292, tension: "green", updatedAt: Date.now() },
];

const TENSION_LEVELS = ["green", "amber", "red"];
const REPORT_CATEGORIES = ["rumor", "gathering", "business_targeted", "attack_in_progress", "other"];

const protectionRequests = [];
const factChecks = [];
const reports = [];

let nextProtectionId = 1;
let nextFactCheckId = 1;
let nextReportId = 1;

function getRegions() {
  return regions;
}

function getRegion(id) {
  return regions.find((r) => r.id === id);
}

function setTension(id, level) {
  const region = getRegion(id);
  if (!region) return null;
  if (!TENSION_LEVELS.includes(level)) return null;
  region.tension = level;
  region.updatedAt = Date.now();
  return region;
}

// ---------- Fact-checks: verified confirmation/debunking of a specific claim ----------

function addFactCheck({ regionId, claim, verdict, explanation, postedBy, sourceReportId }) {
  const region = getRegion(regionId);
  if (!region) return null;
  const entry = {
    id: nextFactCheckId++,
    regionId,
    claim,
    verdict, // "true" | "false" | "unverified"
    explanation,
    postedBy: postedBy || "Verifier",
    sourceReportId: sourceReportId || null,
    createdAt: Date.now(),
  };
  factChecks.unshift(entry);
  return entry;
}

function getFactChecks(regionId) {
  if (!regionId) return factChecks;
  return factChecks.filter((f) => f.regionId === regionId);
}

function getLatestFactCheck(regionId) {
  return factChecks.find((f) => f.regionId === regionId) || null;
}

// ---------- Anonymous reports: the early-warning channel, before a rumor becomes an incident ----------
// No identity is required. An optional contact is only used if the reporter wants a follow-up.

function addReport({ regionId, category, description, contact }) {
  const region = getRegion(regionId);
  if (!region) return null;
  const entry = {
    id: nextReportId++,
    regionId,
    category: REPORT_CATEGORIES.includes(category) ? category : "other",
    description,
    contact: contact || null,
    status: "new", // "new" | "reviewing" | "resolved"
    resolution: null,
    createdAt: Date.now(),
  };
  reports.unshift(entry);
  return entry;
}

function getReports(status) {
  if (!status) return reports;
  return reports.filter((r) => r.status === status);
}

function resolveReport(id, { resolution, status } = {}) {
  const report = reports.find((r) => r.id === Number(id));
  if (!report) return null;
  report.status = status || "resolved";
  report.resolution = resolution || report.resolution;
  report.resolvedAt = Date.now();
  return report;
}

// ---------- Protection requests: a quiet way to ask for a peace-committee contact ----------
// Deliberately not a public registry - only a verifier ever sees who has asked for help.

function requestProtection({ contact, note, regionId }) {
  const entry = {
    id: nextProtectionId++,
    contact: contact || null,
    note: note || "",
    regionId,
    status: "pending", // "pending" | "connected"
    createdAt: Date.now(),
  };
  protectionRequests.push(entry);
  return entry;
}

function connectProtection(id) {
  const request = protectionRequests.find((p) => p.id === Number(id));
  if (!request) return null;
  request.status = "connected";
  request.connectedAt = Date.now();
  return request;
}

function getProtectionRequests(status) {
  if (!status) return protectionRequests;
  return protectionRequests.filter((p) => p.status === status);
}

function findProtectionByContact(contact) {
  return protectionRequests.filter((p) => p.contact === contact);
}

module.exports = {
  TENSION_LEVELS,
  REPORT_CATEGORIES,
  getRegions,
  getRegion,
  setTension,
  addFactCheck,
  getFactChecks,
  getLatestFactCheck,
  addReport,
  getReports,
  resolveReport,
  requestProtection,
  connectProtection,
  getProtectionRequests,
  findProtectionByContact,
};
