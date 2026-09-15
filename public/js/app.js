// Shared API helper used by both the Trader and Verifier pages.

const Api = {
  async getMarkets() {
    return (await fetch("/api/markets")).json();
  },
  async setTension(marketId, level) {
    return (await fetch(`/api/markets/${marketId}/tension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    })).json();
  },
  async getFactChecks(marketId) {
    const q = marketId ? `?marketId=${encodeURIComponent(marketId)}` : "";
    return (await fetch(`/api/factchecks${q}`)).json();
  },
  async postFactCheck(payload) {
    return (await fetch("/api/factchecks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })).json();
  },
  async getTraders(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return (await fetch(`/api/traders${q}`)).json();
  },
  async approveTrader(id) {
    return (await fetch(`/api/traders/${id}/approve`, { method: "POST" })).json();
  },
  async sendAssistantMessage(from, body) {
    return (await fetch("/api/assistant/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, body }),
    })).json();
  },
};
