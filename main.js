/* ============================================================
   Shot Quality vs. Shot Volume - main.js
   Core scatterplot + conference filter
   ============================================================ */
 
const MARGIN = { top: 30, right: 30, bottom: 60, left: 70 };
 
// column names (after trimming whitespace from headers)
const X_COL = "Rim + 3s FGA/G"; // volume
const Y_COL = "Rim + 3s eFG%"; // quality
const NET_COL = "NET Ranking";
 
// conference id -> name, listed in BartTorvik strength order.
// the array order IS the dropdown order.
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
 
// module-level state
let allData = [];
const selectedConferences = new Set(); // empty = show all
let selectedTeamId = null; // currently clicked team
 
// shared scales/elements built once
let x, y, color, svg, tooltip;
 
d3.csv("data/shot_data.csv", d3.autoType).then((raw) => {
  allData = raw.filter(
    (d) => d[X_COL] != null && d[Y_COL] != null && d[NET_COL] != null
  );
 
  buildChartShell();
  buildConferenceDropdown();
  updateDots();
});
 
/* ---------- build static chart parts once ---------- */
function buildChartShell() {
  const container = document.getElementById("chart");
  const width = container.clientWidth - MARGIN.left - MARGIN.right;
  const height = 520 - MARGIN.top - MARGIN.bottom;
 
  // scales fixed to full dataset so points don't move when filtering
  x = d3
    .scaleLinear()
    .domain(d3.extent(allData, (d) => d[X_COL]))
    .nice()
    .range([0, width]);
 
  y = d3
    .scaleLinear()
    .domain(d3.extent(allData, (d) => d[Y_COL]))
    .nice()
    .range([height, 0]);
 
  color = d3
    .scaleSequential(d3.interpolateRdYlGn)
    .domain([
      d3.max(allData, (d) => d[NET_COL]),
      d3.min(allData, (d) => d[NET_COL]),
    ]);
 
  svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
 
  // axes
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(8));
 
  svg
    .append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format(".0%")));
 
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
    .text("Rim + 3s Attempts Per Game  (Volume \u2192)");
 
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Rim + 3s eFG%  (Quality \u2192)");
 
  // median lines (based on full dataset)
  const xMed = d3.median(allData, (d) => d[X_COL]);
  const yMed = d3.median(allData, (d) => d[Y_COL]);
 
  svg
    .append("line")
    .attr("class", "median-line")
    .attr("x1", x(xMed))
    .attr("x2", x(xMed))
    .attr("y1", 0)
    .attr("y2", height);
 
  svg
    .append("line")
    .attr("class", "median-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", y(yMed))
    .attr("y2", y(yMed));
 
  tooltip = d3.select("#tooltip");
}
 
/* ---------- redraw just the dots based on current filter ---------- */
function updateDots() {
  const filtered =
    selectedConferences.size === 0
      ? allData
      : allData.filter((d) => selectedConferences.has(d.conferenceId));
 
  svg
    .selectAll(".dot")
    .data(filtered, (d) => d.teamId)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "dot")
          .attr("cx", (d) => x(d[X_COL]))
          .attr("cy", (d) => y(d[Y_COL]))
          .attr("fill", (d) => color(d[NET_COL]))
          .attr("stroke", "rgba(0,0,0,0.3)")
          .attr("stroke-width", 0.5)
          .attr("r", 0)
          .call((e) => e.transition().duration(250).attr("r", 5)),
      (update) => update,
      (exit) => exit.transition().duration(150).attr("r", 0).remove()
    )
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 8);
      tooltip
        .style("opacity", 1)
        .html(
          `<div class="t-name">${d.teamMarket}</div>` +
            `<div class="t-row">NET #${d[NET_COL]} &middot; ${d.Wins} wins</div>` +
            `<div class="t-row">${d[X_COL].toFixed(1)} att/g &middot; ${(
              d[Y_COL] * 100
            ).toFixed(1)}% eFG</div>`
        );
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.clientX + 14 + "px")
        .style("top", event.clientY + 14 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("r", d.teamId === selectedTeamId ? 7 : 5);
      tooltip.style("opacity", 0);
    })
    .on("click", function (event, d) {
      selectedTeamId = d.teamId;
      // reset all dots, then emphasize the clicked one
      svg
        .selectAll(".dot")
        .classed("selected", false)
        .attr("r", 5);
      d3.select(this).classed("selected", true).attr("r", 7);
      showTeamPanel(d);
    });
 
  // keep the selected dot emphasized across re-renders (e.g. filtering)
  if (selectedTeamId != null) {
    svg
      .selectAll(".dot")
      .filter((d) => d.teamId === selectedTeamId)
      .classed("selected", true)
      .attr("r", 7);
  }
 
  updateFilterStatus(filtered.length);
}
 
/* ---------- build the multi-select checkbox dropdown ---------- */
function buildConferenceDropdown() {
  const menu = d3.select("#conf-menu");
 
  CONFERENCES.forEach((conf, i) => {
    const teamCount = allData.filter(
      (d) => d.conferenceId === conf.id
    ).length;
 
    const row = menu
      .append("label")
      .attr("class", "conf-option");
 
    row
      .append("input")
      .attr("type", "checkbox")
      .attr("value", conf.id)
      .on("change", function () {
        if (this.checked) selectedConferences.add(conf.id);
        else selectedConferences.delete(conf.id);
        updateDots();
      });
 
    row
      .append("span")
      .attr("class", "conf-rank")
      .text(`${i + 1}.`);
 
    row.append("span").attr("class", "conf-name").text(conf.name);
 
    row
      .append("span")
      .attr("class", "conf-count")
      .text(`${teamCount}`);
  });
 
  // toggle open/close
  const button = document.getElementById("conf-button");
  const dropdown = document.getElementById("conf-dropdown");
  button.addEventListener("click", () => {
    dropdown.classList.toggle("open");
  });
 
  // close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
  });
 
  // clear-all button
  document.getElementById("conf-clear").addEventListener("click", () => {
    selectedConferences.clear();
    menu.selectAll("input").property("checked", false);
    updateDots();
  });
}
 
/* ---------- status text under the dropdown ---------- */
function updateFilterStatus(count) {
  const status = document.getElementById("conf-status");
  if (selectedConferences.size === 0) {
    status.textContent = `Showing all ${count} teams`;
  } else {
    const names = CONFERENCES.filter((c) =>
      selectedConferences.has(c.id)
    ).map((c) => c.name);
    status.textContent = `Showing ${count} teams from: ${names.join(", ")}`;
  }
}
 
/* ---------- conference id -> name lookup ---------- */
const CONF_NAME = Object.fromEntries(
  CONFERENCES.map((c) => [c.id, c.name])
);
 
// conference id -> BartTorvik rank (array order, 1-indexed)
const CONF_RANK = Object.fromEntries(
  CONFERENCES.map((c, i) => [c.id, i + 1])
);
 
/* ---------- shot zones for the detail panel ---------- */
// each zone: label, the FGA% (rate) column, FG% (efficiency) column,
// and their matching percentile columns
const ZONES = [
  {
    label: "At Rim",
    rate: "ATR2 FGA%",
    ratePct: "ATR2 FGA% %ile",
    eff: "ATR2 FG%",
    effPct: "ATR2 FG% %ile",
  },
  {
    label: "Paint (non-rim)",
    rate: "PAINT2 FGA%",
    ratePct: "PAINT2 FGA% %ile",
    eff: "PAINT2 FG%",
    effPct: "PAINT2 FG% %ile",
  },
  {
    label: "Midrange",
    rate: "MID2 FGA%",
    ratePct: "MID2 FGA% %ile",
    eff: "MID2 FG%",
    effPct: "MID2 FG% %ile",
  },
  {
    label: "Above-the-Break 3",
    rate: "ATB3 FGA%",
    ratePct: "ATB3 FGA% %ile",
    eff: "ATB3 FG%",
    effPct: "ATB3 FG% %ile",
  },
  {
    label: "Corner 3",
    rate: "C3 FGA%",
    ratePct: "C3 FGA% %ile",
    eff: "C3 FG%",
    effPct: "C3 FG% %ile",
  },
];
 
/* ---------- render the detail panel for a clicked team ---------- */
// bar width scale for shot-diet rates: 0 to 50% maps to 0..110px
const dietBarScale = d3.scaleLinear().domain([0, 0.5]).range([0, 110]).clamp(true);
 
function showTeamPanel(d) {
  const panel = d3.select("#team-panel");
  panel.classed("active", true);
  panel.html(""); // clear previous
 
  // ----- header: name, conference, close button -----
  const header = panel.append("div").attr("class", "tp-header");
 
  const titleWrap = header.append("div");
  titleWrap.append("h3").attr("class", "tp-name").text(d.teamMarket);
 
  const confName = CONF_NAME[d.conferenceId] || "Unknown";
  const confRank = CONF_RANK[d.conferenceId];
  const overallLosses = d["GP*"] - d.Wins;
 
  titleWrap
    .append("p")
    .attr("class", "tp-sub")
    .text(
      `${confName} (#${confRank} conf) \u00b7 NET #${d[NET_COL]} \u00b7 ` +
        `${d.Wins}-${overallLosses} \u00b7 ${d.confWins} conf wins`
    );
 
  header
    .append("button")
    .attr("class", "tp-close")
    .attr("type", "button")
    .html("&times;")
    .on("click", closeTeamPanel);
 
  // ----- headline tradeoff: quality + volume with percentiles -----
  const headline = panel.append("div").attr("class", "tp-headline");
 
  addHeadlineStat(
    headline,
    "Shot Quality",
    `${(d[Y_COL] * 100).toFixed(1)}% eFG`,
    d["Rim + 3s eFG% %ile"],
    "on Rim + 3s shots"
  );
  addHeadlineStat(
    headline,
    "Shot Volume",
    `${d[X_COL].toFixed(1)} / game`,
    d["Rim + 3s FGA/G %ile"],
    "Rim + 3s attempts"
  );
 
  // ----- shot diet + efficiency table by zone -----
  panel
    .append("h4")
    .attr("class", "tp-section-title")
    .text("Shot diet & efficiency by zone");
 
  const table = panel.append("div").attr("class", "tp-zones");
 
  // header row
  const head = table.append("div").attr("class", "tp-zone-row tp-zone-head");
  head.append("span").text("Zone");
  head.append("span").text("Share of FGA");
  head.append("span").text("FG%");
 
  ZONES.forEach((z) => {
    const row = table.append("div").attr("class", "tp-zone-row");
    row.append("span").attr("class", "tp-zone-label").text(z.label);
 
    // rate cell: bar + value
    const rateCell = row.append("span").attr("class", "tp-zone-cell");
    rateCell
      .append("span")
      .attr("class", "tp-bar")
      .style("width", `${dietBarScale(d[z.rate])}px`);
    rateCell
      .append("span")
      .attr("class", "tp-val")
      .text(`${(d[z.rate] * 100).toFixed(1)}%`);
 
    // efficiency cell: value + percentile chip
    const effCell = row.append("span").attr("class", "tp-zone-cell");
    effCell
      .append("span")
      .attr("class", "tp-val")
      .text(`${(d[z.eff] * 100).toFixed(1)}%`);
    effCell
      .append("span")
      .attr("class", "tp-pct-chip")
      .style("background", pctColor(d[z.effPct]))
      .text(`${pctLabel(d[z.effPct])}`);
  });
 
  // scroll panel into view if it's off-screen
  document.getElementById("team-panel").scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}
 
/* ---------- close the detail panel and reset selection ---------- */
function closeTeamPanel() {
  const panel = d3.select("#team-panel");
  panel.classed("active", false);
  panel.html(
    '<p class="team-panel-hint">Click any team\'s dot to see its full shot profile.</p>'
  );
  selectedTeamId = null;
  svg.selectAll(".dot").classed("selected", false).attr("r", 5);
}
 
/* helper: one big headline stat block with a percentile bar */
function addHeadlineStat(parent, label, value, pctile, note) {
  const block = parent.append("div").attr("class", "tp-stat");
  block.append("div").attr("class", "tp-stat-label").text(label);
  block.append("div").attr("class", "tp-stat-value").text(value);
  block.append("div").attr("class", "tp-stat-note").text(note);
 
  const bar = block.append("div").attr("class", "tp-stat-bar");
  bar
    .append("div")
    .attr("class", "tp-stat-bar-fill")
    .style("width", `${pctile * 100}%`)
    .style("background", pctColor(pctile));
  block
    .append("div")
    .attr("class", "tp-stat-pct")
    .text(`${pctLabel(pctile)} percentile`);
}
 
/* helper: format a 0-1 percentile as an ordinal-ish label */
function pctLabel(p) {
  return `${Math.round(p * 100)}th`;
}
 
/* helper: color a percentile green->red using the same scheme as the chart */
function pctColor(p) {
  // p is 0..1 where 1 is best; interpolateRdYlGn: 0=red, 1=green
  return d3.interpolateRdYlGn(p);
}