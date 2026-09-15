// Trader Assistant - simulates the WhatsApp experience in-browser, using the same
// backend logic (whatsapp.js) that powers the real Twilio webhook.

const SIMULATED_PHONE = "whatsapp:+254700000000"; // stand-in for "this device's number" in the demo

const chatEl = document.getElementById("chat");
const marketPicker = document.getElementById("marketPicker");
const quickReplies = document.getElementById("quickReplies");
const chatForm = document.getElementById("chatForm");
const chatText = document.getElementById("chatText");

let currentMarketName = "";

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

async function init() {
  const markets = await Api.getMarkets();
  marketPicker.innerHTML = markets.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
  currentMarketName = markets[0]?.name || "";

  addBubble("👋 Welcome to Amani Africa. Pick your market above, then tap a quick reply or type a question.", "bot");

  marketPicker.addEventListener("change", () => {
    const m = markets.find((mm) => mm.id === marketPicker.value);
    currentMarketName = m.name;
  });

  quickReplies.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const kind = btn.dataset.msg;
    const map = {
      "is-safe": `Is ${currentMarketName} safe today?`,
      vouch: `Vouch me for ${currentMarketName}`,
      factcheck: `What's the latest fact-check for ${currentMarketName}?`,
      status: "status",
    };
    send(map[kind]);
  });

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatText.value.trim();
    if (!text) return;
    chatText.value = "";
    send(text);
  });
}

init();
