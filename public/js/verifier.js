// Verifier Console - live map + tension controls + confidential reports + fact-checks + protection requests.

const TENSION_LEVELS = ["green", "amber", "red"];
const TENSION_COLOR = { green: "#2fa84f", amber: "#d9a441", red: "#d1453d" };
const CATEGORY_LABEL = {
  rumor: "Rumor circulating",
  gathering: "Crowd / gathering forming",
  business_targeted: "Business being targeted",
  attack_in_progress: "Attack in progress",
  other: "Other",
};

let map;
let markerLayer = {};

function initMap() {
  map = L.map("map").setView([-5, 30], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 100);
  window.addEventListener("resize", () => map.invalidateSize());
}

function markerIcon(level) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${TENSION_COLOR[level]};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
  });
}

async function renderRegions() {
  const regions = await Api.getRegions();
  const listEl = document.getElementById("regionList");
  const fcRegionSelect = document.getElementById("fcRegion");

  listEl.innerHTML = regions.map((r) => `
    <div class="market-row" data-id="${r.id}">
      <div>
        <div class="name"><span class="tension-dot ${r.tension}"></span>${r.name}</div>
        <div class="city">${r.city}, ${r.country} — ${r.type}</div>
      </div>
      <div class="tension-buttons">
        ${TENSION_LEVELS.map((lvl) => `<button data-level="${lvl}" class="${lvl === r.tension ? `active ${lvl}` : ""}">${lvl}</button>`).join("")}
      </div>
    </div>
  `).join("");

  const previousSelection = fcRegionSelect.value;
  fcRegionSelect.innerHTML = regions.map((r) => `<option value="${r.id}">${r.name} (${r.city})</option>`).join("");
  if (previousSelection) fcRegionSelect.value = previousSelection;

  const isFirstRender = Object.keys(markerLayer).length === 0;

  regions.forEach((r) => {
    if (markerLayer[r.id]) {
      markerLayer[r.id].setIcon(markerIcon(r.tension));
    } else {
      markerLayer[r.id] = L.marker([r.lat, r.lng], { icon: markerIcon(r.tension) })
        .addTo(map)
        .bindPopup(`<b>${r.name}</b><br>${r.city}, ${r.country}`);
    }
  });

  if (isFirstRender && regions.length > 0) {
    const bounds = L.latLngBounds(regions.map((r) => [r.lat, r.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  listEl.querySelectorAll(".market-row").forEach((row) => {
    const id = row.dataset.id;
    row.querySelectorAll(".tension-buttons button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await Api.setTension(id, btn.dataset.level);
        await renderRegions();
      });
    });
  });

  return regions;
}

async function renderReports(regions) {
  const pending = await Api.getReports("new");
  const nameOf = (id) => regions.find((r) => r.id === id)?.name || id;
  const el = document.getElementById("reportList");

  if (pending.length === 0) {
    el.innerHTML = `<div class="empty-state">No new reports.</div>`;
    return;
  }

  el.innerHTML = pending.map((r) => `
    <div class="report-item" data-id="${r.id}">
      <div class="report-header">
        <b>${nameOf(r.regionId)}</b>
        <span class="category-badge ${r.category}">${CATEGORY_LABEL[r.category] || r.category}</span>
      </div>
      <div class="report-desc">${r.description}</div>
      <div class="report-actions">
        <button data-action="factcheck">Turn into fact-check</button>
        <button data-action="resolve">Mark resolved</button>
      </div>
    </div>
  `).join("");

  el.querySelectorAll(".report-item").forEach((item) => {
    const id = item.dataset.id;
    const report = pending.find((r) => r.id === Number(id));

    item.querySelector('[data-action="resolve"]').addEventListener("click", async () => {
      await Api.resolveReport(id, { status: "resolved" });
      await refreshAll();
    });

    item.querySelector('[data-action="factcheck"]').addEventListener("click", () => {
      document.getElementById("fcRegion").value = report.regionId;
      document.getElementById("fcClaim").value = report.description;
      document.getElementById("fcClaim").scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("fcClaim").dataset.sourceReportId = id;
    });
  });
}

async function renderFactChecks(regions) {
  const list = await Api.getFactChecks();
  const nameOf = (id) => regions.find((r) => r.id === id)?.name || id;
  const el = document.getElementById("factCheckList");

  if (list.length === 0) {
    el.innerHTML = `<div class="empty-state">No fact-checks posted yet.</div>`;
    return;
  }

  el.innerHTML = list.map((f) => `
    <div class="fact-item">
      <b>${nameOf(f.regionId)}</b> — "${f.claim}" is <span class="verdict ${f.verdict}">${f.verdict.toUpperCase()}</span><br>
      ${f.explanation}
    </div>
  `).join("");
}

async function renderProtection(regions) {
  const pending = await Api.getProtectionRequests("pending");
  const nameOf = (id) => regions.find((r) => r.id === id)?.name || "Unspecified area";
  const el = document.getElementById("protectionList");

  if (pending.length === 0) {
    el.innerHTML = `<div class="empty-state">No pending protection requests.</div>`;
    return;
  }

  el.innerHTML = pending.map((p) => `
    <div class="trader-item" data-id="${p.id}">
      <span>${nameOf(p.regionId)}${p.note ? ` — "${p.note}"` : ""}</span>
      <button>Connect</button>
    </div>
  `).join("");

  el.querySelectorAll(".trader-item button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest(".trader-item").dataset.id;
      await Api.connectProtection(id);
      await renderProtection(regions);
    });
  });
}

document.getElementById("factCheckForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const claimField = document.getElementById("fcClaim");
  await Api.postFactCheck({
    regionId: document.getElementById("fcRegion").value,
    claim: claimField.value,
    verdict: document.getElementById("fcVerdict").value,
    explanation: document.getElementById("fcExplanation").value,
    sourceReportId: claimField.dataset.sourceReportId || null,
  });
  e.target.reset();
  delete claimField.dataset.sourceReportId;
  await refreshAll();
});

async function refreshAll() {
  const regions = await renderRegions();
  await Promise.all([renderReports(regions), renderFactChecks(regions), renderProtection(regions)]);
}

initMap();
refreshAll();
setInterval(refreshAll, 4000); // simple polling keeps both consoles in sync for the live demo
