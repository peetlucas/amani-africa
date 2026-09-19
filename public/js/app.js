// Shared API helper used by both the Community Assistant and Verifier Console pages.

const Api = {
  async getRegions() {
    return (await fetch("/api/regions")).json();
  },
  async setTension(regionId, level) {
    return (await fetch(`/api/regions/${regionId}/tension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    })).json();
  },
  async getFactChecks(regionId) {
    const q = regionId ? `?regionId=${encodeURIComponent(regionId)}` : "";
    return (await fetch(`/api/factchecks${q}`)).json();
  },
  async postFactCheck(payload) {
    return (await fetch("/api/factchecks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })).json();
  },
  async getReports(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return (await fetch(`/api/reports${q}`)).json();
  },
  async postReport(payload) {
    return (await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })).json();
  },
  async resolveReport(id, payload) {
    return (await fetch(`/api/reports/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })).json();
  },
  async getProtectionRequests(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return (await fetch(`/api/protection${q}`)).json();
  },
  async connectProtection(id) {
    return (await fetch(`/api/protection/${id}/connect`, { method: "POST" })).json();
  },
  async sendAssistantMessage(from, body) {
    return (await fetch("/api/assistant/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, body }),
    })).json();
  },
};
