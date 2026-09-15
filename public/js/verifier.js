// Verifier Console - live map + tension controls + fact-check posting + vouch approvals.

const TENSION_LEVELS = ["calm", "watch", "high"];
const TENSION_COLOR = { calm: "#2fa84f", watch: "#d9a441", high: "#d1453d" };

let map;
let markerLayer = {};

function initMap() {
  map = L.map("map").setView([-1.2, 36.8], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
}

function markerIcon(level) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${TENSION_COLOR[level]};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
  });
}

async function renderMarkets() {
  const markets = await Api.getMarkets();
  const listEl = document.getElementById("marketList");
  const fcMarketSelect = document.getElementById("fcMarket");

  listEl.innerHTML = markets.map((m) => `
    <div class="market-row" data-id="${m.id}">
      <div>
        <div class="name"><span class="tension-dot ${m.tension}"></span>${m.name}</div>
        <div class="city">${m.city}</div>
      </div>
      <div class="tension-buttons">
        ${TENSION_LEVELS.map((lvl) => `<button data-level="${lvl}" class="${lvl === m.tension ? `active ${lvl}` : ""}">${lvl}</button>`).join("")}
      </div>
    </div>
  `).join("");

  fcMarketSelect.innerHTML = markets.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");

  markets.forEach((m) => {
    if (markerLayer[m.id]) {
      markerLayer[m.id].setIcon(markerIcon(m.tension));
    } else {
      markerLayer[m.id] = L.marker([m.lat, m.lng], { icon: markerIcon(m.tension) })
        .addTo(map)
        .bindPopup(`<b>${m.name}</b><br>${m.city}`);
    }
  });

  listEl.querySelectorAll(".market-row").forEach((row) => {
    const id = row.dataset.id;
    row.querySelectorAll(".tension-buttons button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await Api.setTension(id, btn.dataset.level);
        await renderMarkets();
      });
    });
  });
}

async function renderFactChecks() {
  const list = await Api.getFactChecks();
  const markets = await Api.getMarkets();
  const nameOf = (id) => markets.find((m) => m.id === id)?.name || id;
  const el = document.getElementById("factCheckList");

  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">No fact-checks posted yet.</div>`;
    return;
  }

  el.innerHTML = list.map((f) => `
    <div class="fact-item">
      <b>${nameOf(f.marketId)}</b> — "${f.claim}" is <span class="verdict ${f.verdict}">${f.verdict.toUpperCase()}</span><br>
      ${f.explanation}
    </div>
  `).join("");
}

async function renderTraders() {
  const pending = await Api.getTraders("pending");
  const markets = await Api.getMarkets();
  const nameOf = (id) => markets.find((m) => m.id === id)?.name || id;
  const el = document.getElementById("traderList");

  if (pending.length === 0) {
    el.innerHTML = `<div class="empty-state">No pending vouch requests.</div>`;
    return;
  }

  el.innerHTML = pending.map((t) => `
    <div class="trader-item" data-id="${t.id}">
      <span>${t.name} — ${nameOf(t.marketId)}</span>
      <button>Approve</button>
    </div>
  `).join("");

  el.querySelectorAll(".trader-item button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".trader-item").dataset.id;
      await Api.approveTrader(id);
      await renderTraders();
    });
  });
}

document.getElementById("factCheckForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await Api.postFactCheck({
    marketId: document.getElementById("fcMarket").value,
    claim: document.getElementById("fcClaim").value,
    verdict: document.getElementById("fcVerdict").value,
    explanation: document.getElementById("fcExplanation").value,
  });
  e.target.reset();
  await renderFactChecks();
});

async function refreshAll() {
  await Promise.all([renderMarkets(), renderFactChecks(), renderTraders()]);
}

initMap();
refreshAll();
setInterval(refreshAll, 4000); // simple polling keeps both consoles in sync for the live demo
