// In-memory data store shared by the web dashboard and the WhatsApp bot.
// A hackathon proof of concept — swap for a real database (Postgres/SQLite) before production use.

const markets = [
  { id: "eastleigh", name: "Eastleigh Market", city: "Nairobi", lat: -1.2833, lng: 36.8500, tension: "calm", updatedAt: Date.now() },
  { id: "gikomba", name: "Gikomba Market", city: "Nairobi", lat: -1.2864, lng: 36.8322, tension: "calm", updatedAt: Date.now() },
  { id: "kibuye", name: "Kibuye Market", city: "Kisumu", lat: -0.1022, lng: 34.7617, tension: "calm", updatedAt: Date.now() },
  { id: "kariokor", name: "Kariokor Market", city: "Nairobi", lat: -1.2792, lng: 36.8344, tension: "calm", updatedAt: Date.now() },
];

const traders = [];
const factChecks = [];

let nextTraderId = 1;
let nextFactCheckId = 1;

function getMarkets() {
  return markets;
}

function getMarket(id) {
  return markets.find((m) => m.id === id);
}

function setTension(id, level) {
  const market = getMarket(id);
  if (!market) return null;
  if (!["calm", "watch", "high"].includes(level)) return null;
  market.tension = level;
  market.updatedAt = Date.now();
  return market;
}

function addFactCheck({ marketId, claim, verdict, explanation, postedBy }) {
  const market = getMarket(marketId);
  if (!market) return null;
  const entry = {
    id: nextFactCheckId++,
    marketId,
    claim,
    verdict, // "true" | "false" | "unverified"
    explanation,
    postedBy: postedBy || "Verifier",
    createdAt: Date.now(),
  };
  factChecks.unshift(entry);
  return entry;
}

function getFactChecks(marketId) {
  if (!marketId) return factChecks;
  return factChecks.filter((f) => f.marketId === marketId);
}

function getLatestFactCheck(marketId) {
  return factChecks.find((f) => f.marketId === marketId) || null;
}

function requestVouch({ phone, name, marketId }) {
  const existing = traders.find((t) => t.phone === phone && t.marketId === marketId);
  if (existing) return existing;
  const entry = {
    id: nextTraderId++,
    phone,
    name: name || phone,
    marketId,
    status: "pending", // "pending" | "approved"
    createdAt: Date.now(),
  };
  traders.push(entry);
  return entry;
}

function approveTrader(id) {
  const trader = traders.find((t) => t.id === Number(id));
  if (!trader) return null;
  trader.status = "approved";
  trader.approvedAt = Date.now();
  return trader;
}

function getTraders(status) {
  if (!status) return traders;
  return traders.filter((t) => t.status === status);
}

function findTraderByPhone(phone) {
  return traders.filter((t) => t.phone === phone);
}

module.exports = {
  getMarkets,
  getMarket,
  setTension,
  addFactCheck,
  getFactChecks,
  getLatestFactCheck,
  requestVouch,
  approveTrader,
  getTraders,
  findTraderByPhone,
};
