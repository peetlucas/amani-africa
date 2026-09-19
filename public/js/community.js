// Community Assistant - simulates the WhatsApp experience in-browser, using the same
// backend logic (whatsapp.js) that powers the real Twilio webhook, plus a structured
// report form (category selector) that talks to the reports API directly.

const SIMULATED_PHONE = "whatsapp:+254700000000"; // stand-in for "this device's number" in the demo

const chatEl = document.getElementById("chat");
const regionPicker = document.getElementById("regionPicker");
const quickReplies = document.getElementById("quickReplies");
const chatForm = document.getElementById("chatForm");
const chatText = document.getElementById("chatText");
const reportForm = document.getElementById("reportForm");
const reportDescription = document.getElementById("reportDescription");
const reportCategory = document.getElementById("reportCategory");

let currentRegion = null;

function addBubble(text, who) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${who}`;
  bubble.textContent = text;
  chatEl.appendChild(bubble);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function send(body) {
  addBubble(body, "user");
  const { reply } = await Api.sendAssistantMessage(SIMULATED_PHONE, body);
  addBubble(reply, "bot");
}

function showReportForm() {
  reportForm.classList.remove("hidden");
  reportDescription.value = "";
  reportDescription.focus();
}

function hideReportForm() {
  reportForm.classList.add("hidden");
}

async function submitReport() {
  const description = reportDescription.value.trim();
  if (!description) return;
  addBubble(`[Report] ${description}`, "user");
  await Api.postReport({
    regionId: currentRegion.id,
    category: reportCategory.value,
    description,
    contact: null, // anonymous by default in the web form
  });
  addBubble(
    `Thank you - your report for ${currentRegion.name} has been sent to local verifiers for review. It is confidential and not shown publicly. If anyone is in immediate danger, please also contact local authorities directly.`,
    "bot"
  );
  hideReportForm();
}

async function init() {
  const regions = await Api.getRegions();
  regionPicker.innerHTML = regions.map((r) => `<option value="${r.id}">${r.name} (${r.city})</option>`).join("");
  currentRegion = regions[0];

  addBubble("👋 Welcome to Amani Africa. Pick your area above, then tap a quick reply or type a message. Reports are always confidential.", "bot");

  regionPicker.addEventListener("change", () => {
    currentRegion = regions.find((r) => r.id === regionPicker.value);
  });

  quickReplies.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const kind = btn.dataset.msg;

    if (kind === "report") {
      showReportForm();
      return;
    }

    const map = {
      "is-safe": `Is ${currentRegion.name} calm today?`,
      protect: "Protect me, I feel at risk",
      factcheck: `What's the latest fact-check for ${currentRegion.name}?`,
      status: "status",
    };
    send(map[kind]);
  });

  document.getElementById("reportCancel").addEventListener("click", hideReportForm);
  document.getElementById("reportSubmit").addEventListener("click", submitReport);

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatText.value.trim();
    if (!text) return;
    chatText.value = "";
    send(text);
  });
}

init();
