/* ============================================================
   conference.js
   Reads ?conf=<id> from the URL and sets up that conference's
   profile page. Right now this wires up routing + the header.
   Section content gets added as data comes in.
   ============================================================ */

// conference id -> name, in BartTorvik strength order.
// (kept in sync with main.js CONFERENCES)
const CONFERENCES = [
  { id: 73, name: "Big Ten" },
  { id: 89, name: "SEC" },
  { id: 60, name: "Big 12" },
  { id: 53, name: "ACC" },
  { id: 29, name: "Big East" },
  { id: 87, name: "Mountain West" },
  { id: 30, name: "WCC" },
  { id: 4, name: "A10" },
  { id: 54, name: "Missouri Valley" },
  { id: 17, name: "American" },
  { id: 88, name: "CUSA" },
  { id: 36, name: "WAC" },
  { id: 86, name: "Ivy" },
  { id: 40, name: "Big West" },
  { id: 2, name: "MAC" },
  { id: 61, name: "Big Sky" },
  { id: 16, name: "CAA" },
  { id: 59, name: "Horizon" },
  { id: 72, name: "Southland" },
  { id: 62, name: "Sun Belt" },
  { id: 52, name: "Summit" },
  { id: 37, name: "Big South" },
  { id: 1, name: "ASUN" },
  { id: 19, name: "MAAC" },
  { id: 38, name: "SoCon" },
  { id: 55, name: "Patriot" },
  { id: 15, name: "Ohio Valley" },
  { id: 39, name: "SWAC" },
  { id: 3, name: "NEC" },
  { id: 18, name: "AmEast" },
  { id: 5, name: "MEAC" },
];

// which conferences have a built-out page so far (top 5 to start).
// add ids here as you build more.
const ENABLED_CONFERENCES = new Set([73, 89, 60, 53, 29]);

// ---- read the conference id from the URL ----
function getConfId() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("conf");
  return raw == null ? null : Number(raw);
}

// ---- ordinal helper (1 -> 1st, 2 -> 2nd, ...) ----
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---- main setup ----
function init() {
  const confId = getConfId();
  const conf = CONFERENCES.find((c) => c.id === confId);
  const rank = CONFERENCES.findIndex((c) => c.id === confId) + 1;

  // bad or missing id
  if (!conf) {
    document.getElementById("conf-title").textContent = "Conference not found";
    document.getElementById("conf-summary").textContent =
      "That conference link isn't valid. Head back to the main explorer and pick a conference.";
    document.getElementById("conf-rank-label").textContent = "Error";
    return;
  }

  // a valid conference, but its page isn't built yet
  if (!ENABLED_CONFERENCES.has(confId)) {
    document.getElementById("conf-title").textContent = conf.name;
    document.getElementById("conf-rank-label").textContent = "Coming soon";
    document.getElementById("conf-summary").textContent =
      `The ${conf.name} profile page is still under construction.`;
    return;
  }

  // valid + enabled: set the header. section content TBD.
  document.title = `${conf.name} | Conference Profile`;
  document.getElementById("conf-title").textContent = conf.name;
  document.getElementById("conf-rank-label").textContent =
    `${ordinal(rank)} by BartTorvik conference ranking`;
  document.getElementById("conf-summary").textContent =
    `Profile and shot analytics for the ${conf.name}.`;

  // store for later section-building steps
  window.__CONF__ = { ...conf, rank };
}

init();
