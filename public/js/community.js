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
const reportAttachment = document.getElementById("reportAttachment");

let currentRegion = null;
let inboxSince = Date.now(); // only show alerts that arrive after this session started

function addBubble(text, who) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${who}`;
  bubble.textContent = text;
  chatEl.appendChild(bubble);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Polls for proactive alerts (tension changes, fact-checks) the same way a real phone would
// receive a WhatsApp push - nothing here was asked for by the user.
async function pollInbox() {
  const messages = await Api.getInbox(SIMULATED_PHONE, inboxSince);
  messages.forEach((m) => {
    addBubble(`🔔 ${m.message}`, "alert");
    inboxSince = Math.max(inboxSince, m.createdAt);
  });
}

async function send(body) {
  addBubble(body, "user");
  const { reply } = await Api.sendAssistantMessage(SIMULATED_PHONE, body);
  addBubble(reply, "bot");
}

function showReportForm() {
  reportForm.classList.remove("hidden");
  reportDescription.value = "";
  reportAttachment.value = "";
  reportDescription.focus();
}

function hideReportForm() {
  reportForm.classList.add("hidden");
}

async function submitReport() {
  const description = reportDescription.value.trim();
  if (!description) return;
  const file = reportAttachment.files[0];
  addBubble(`[Report] ${description}${file ? ` (with ${file.type.startsWith("video/") ? "video" : "photo"} attached)` : ""}`, "user");

  if (file) {
    const formData = new FormData();
    formData.append("regionId", currentRegion.id);
    formData.append("category", reportCategory.value);
    formData.append("description", description);
    formData.append("attachment", file);
    await Api.postReportWithFile(formData);
  } else {
    await Api.postReport({
      regionId: currentRegion.id,
      category: reportCategory.value,
      description,
      contact: null, // anonymous by default in the web form
    });
  }

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
      subscribe: `Subscribe ${currentRegion.name}`,
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

  setInterval(pollInbox, 3000);
}

init();
