// Light / dark / system theme. Applied immediately (this script is a blocking <head> include,
// not deferred) so the correct theme is set before first paint - no flash of the wrong theme.

(function () {
  const STORAGE_KEY = "amani-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  function getPreference() {
    return localStorage.getItem(STORAGE_KEY) || "system";
  }

  function resolve(pref) {
    return pref === "system" ? (media.matches ? "dark" : "light") : pref;
  }

  function apply(pref) {
    document.documentElement.setAttribute("data-theme", resolve(pref));
  }

  apply(getPreference());

  media.addEventListener("change", () => {
    if (getPreference() === "system") apply("system");
  });

  function setPreference(pref) {
    localStorage.setItem(STORAGE_KEY, pref);
    apply(pref);
    renderToggle();
  }

  const OPTIONS = [
    { value: "light", label: "☀", title: "Light" },
    { value: "dark", label: "☽", title: "Dark" },
    { value: "system", label: "⚙", title: "System" },
  ];

  function renderToggle() {
    let el = document.querySelector(".theme-toggle");
    const isNew = !el;
    if (!el) {
      const slot = document.getElementById("themeToggleSlot");
      el = document.createElement("div");
      el.className = "theme-toggle" + (slot ? "" : " floating");
      (slot || document.body).appendChild(el);
    }
    const current = getPreference();
    el.innerHTML = OPTIONS.map(
      (o) => `<button type="button" data-pref="${o.value}" title="${o.title}" aria-label="${o.title} theme" class="${o.value === current ? "active" : ""}">${o.label}</button>`
    ).join("");
    if (isNew) {
      el.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (btn) setPreference(btn.dataset.pref);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderToggle);
  } else {
    renderToggle();
  }
})();
