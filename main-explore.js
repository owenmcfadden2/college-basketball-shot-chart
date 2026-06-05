/* ============================================================
   main-explore.js
   Standalone exploration page. This is main.js with the story
   module and scrollama wiring removed. No story, no scroll
   reactions — just the full interactive scatterplot with all
   controls (filter, search, top/bottom labels, brush, panels).
   ============================================================ */

const MARGIN = { top: 36, right: 40, bottom: 70, left: 82 };

const X_COL = "Rim + 3s FGA/G";
const Y_COL = "Rim + 3s eFG%";
const NET_COL = "NET Ranking";

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

const ENABLED_CONFERENCES = new Set([73, 89, 60, 53, 29]);
const POWER_5 = new Set([73, 89, 60, 53, 29]);

let allData = [];
const selectedConferences = new Set();
let selectedTeamId = null;
let compareTeamId = null;
let searchTerm = "";
let annotationLimit = 10;
let annotationBottomLimit = 10;
let storyActive = false;   // exploration page has no story; always false

let x, y, color, svg, tooltip;
let chartWidth, chartHeight;

function winBinLabel(wins) {
  const start = Math.floor(wins / 5) * 5;
  const end = start + 4;
  return `${start}-${end} wins`;
}

d3.csv("data/shot_data.csv", d3.autoType).then((raw) => {
  allData = raw.filter(
    (d) => d[X_COL] != null && d[Y_COL] != null && d[NET_COL] != null
  );
  buildChartShell();
  buildConferenceDropdown();
  buildMetaButtons();
  document.getElementById("annot-limit").value = 10;
  document.getElementById("annot-bottom-limit").value = 10;
  updateDots();
  const teamList = document.getElementById("compare-team-list");
  allData.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.teamMarket;
    teamList.appendChild(opt);
  });
});

function buildChartShell() {
  // Fixed virtual drawing canvas. The viewBox scales this to fit the DOM.
  const VW = 820;   // virtual width
  const VH = 640;   // virtual height

  const width = VW - MARGIN.left - MARGIN.right;
  const height = VH - MARGIN.top - MARGIN.bottom;
  chartWidth = width;
  chartHeight = height;

  const [xMin, xMax] = d3.extent(allData, (d) => d[X_COL]);
  x = d3.scaleLinear()
    .domain([xMin, xMax + (xMax - xMin) * 0.08]).nice().range([0, width]);
  y = d3.scaleLinear()
    .domain(d3.extent(allData, (d) => d[Y_COL])).nice().range([height, 0]);
  color = d3.scaleSequential(d3.interpolateRdYlGn)
    .domain([d3.max(allData, (d) => d[NET_COL]), d3.min(allData, (d) => d[NET_COL])]);

  svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${VW} ${VH}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", "100%")
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(9));
  svg.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(9).tickFormat(d3.format(".0%")));

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

  const xMed = d3.median(allData, (d) => d[X_COL]);
  const yMed = d3.median(allData, (d) => d[Y_COL]);

  svg.append("line").attr("class", "median-line")
    .attr("x1", x(xMed)).attr("x2", x(xMed)).attr("y1", 0).attr("y2", height);
  svg.append("line").attr("class", "median-line")
    .attr("x1", 0).attr("x2", width).attr("y1", y(yMed)).attr("y2", y(yMed));

  // quadrant fills + labels
  const qDefs = [
    { x1: x(xMed), y1: 0,       x2: width,   y2: y(yMed), fill: "#4cc38a", lbl: "Elite Offenses"        },
    { x1: 0,       y1: 0,       x2: x(xMed), y2: y(yMed), fill: "#4f9cf9", lbl: "Efficient & Selective" },
    { x1: x(xMed), y1: y(yMed), x2: width,   y2: height,  fill: "#ff7a2f", lbl: "Volume Shooters"       },
    { x1: 0,       y1: y(yMed), x2: x(xMed), y2: height,  fill: "#d73027", lbl: "Struggling Offenses"   },
  ];
  qDefs.forEach((q) => {
    svg.insert("rect", ":first-child")
      .attr("x", q.x1).attr("y", q.y1)
      .attr("width", q.x2 - q.x1).attr("height", q.y2 - q.y1)
      .attr("fill", q.fill).attr("opacity", 0.05);
    svg.append("text")
      .attr("class", "quadrant-label")
      .attr("x", (q.x1 + q.x2) / 2).attr("y", (q.y1 + q.y2) / 2)
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .text(q.lbl.toUpperCase());
  });

  tooltip = d3.select("#tooltip");

  const brush = d3.brush()
    .extent([[0, 0], [chartWidth, chartHeight]])
    .on("end", brushed);
  svg.append("g").attr("class", "brush").call(brush);
}

function brushed(event) {
  if (!event.selection) return;
  const [[x0, y0], [x1, y1]] = event.selection;
  const visible = selectedConferences.size === 0
    ? allData
    : allData.filter((d) => selectedConferences.has(d.conferenceId));
  const inside = visible.filter((d) => {
    const cx = x(d[X_COL]);
    const cy = y(d[Y_COL]);
    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
  });
  if (inside.length === 0) showEmptyBrush();
  else showGroupPanel(inside);
}

function updateDots() {
  const filtered = selectedConferences.size === 0
    ? allData
    : allData.filter((d) => selectedConferences.has(d.conferenceId));

  svg.selectAll(".dot")
    .data(allData, (d) => d.teamId)
    .join(
      (enter) =>
        enter.append("circle").attr("class", "dot")
          .attr("cx", (d) => x(d[X_COL])).attr("cy", (d) => y(d[Y_COL]))
          .attr("fill", (d) => color(d[NET_COL]))
          .attr("stroke", "rgba(0,0,0,0.3)").attr("stroke-width", 0.5)
          .attr("r", 0).call((e) => e.transition().duration(250).attr("r", 5.5)),
      (update) => update,
      (exit) => exit.transition().duration(150).attr("r", 0).remove()
    )
    .attr("opacity", (d) => {
      if (searchTerm.length >= 2)
        return d.teamMarket.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0.1;
      return 1;
    })
    .style("pointer-events", (d) => {
      if (searchTerm.length >= 2)
        return d.teamMarket.toLowerCase().includes(searchTerm.toLowerCase()) ? null : "none";
      return null;
    })
    .classed("dimmed", (d) => {
      if (searchTerm.length >= 2) return false;
      const confDim = selectedConferences.size > 0 && !selectedConferences.has(d.conferenceId);
      const maxNet = d3.max(allData, (d) => d[NET_COL]);
      const inTop = annotationLimit > 0 && d[NET_COL] <= annotationLimit;
      const inBottom = annotationBottomLimit > 0 && d[NET_COL] >= maxNet - annotationBottomLimit + 1;
      const hasAnnotFilter = !storyActive && (annotationLimit > 0 || annotationBottomLimit > 0);
      const annotDim = hasAnnotFilter && !inTop && !inBottom;
      return confDim || annotDim;
    })
    .on("mouseover", function (event, d) {
      d3.select(this).attr("r", 8.5);
      tooltip.style("opacity", 1).html(
        `<div class="t-name">${d.teamMarket}</div>` +
        `<div class="t-row">NET #${d[NET_COL]} &middot; ${winBinLabel(d.Wins)}</div>` +
        `<div class="t-row">${d[X_COL].toFixed(1)} att/g &middot; ${(d[Y_COL] * 100).toFixed(1)}% eFG</div>`
      );
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.clientX + 14 + "px").style("top", event.clientY + 14 + "px");
    })
    .on("mouseout", function (event, d) {
      d3.select(this).attr("r", d.teamId === selectedTeamId ? 7.5 : 5.5);
      tooltip.style("opacity", 0);
    })
    .on("click", function (event, d) {
      selectedTeamId = d.teamId;
      svg.selectAll(".dot").classed("selected", false).attr("r", 5.5);
      d3.select(this).classed("selected", true).attr("r", 7.5);
      showTeamPanel(d);
    });

  if (selectedTeamId != null) {
    svg.selectAll(".dot")
      .filter((d) => d.teamId === selectedTeamId)
      .classed("selected", true).attr("r", 7.5);
  }

  svg.selectAll(".dot").classed("compare-selected", false);
  if (compareTeamId != null) {
    svg.selectAll(".dot")
      .filter((d) => d.teamId === compareTeamId)
      .classed("compare-selected", true).attr("r", 7.5);
  }

  updateFilterStatus(filtered.length);
  updateAnnotations(filtered);
}

function updateAnnotations(visible) {
  svg.selectAll(".annotations-layer").remove();
  if (storyActive) return;   // (always false here; kept for parity with main.js)
  const layer = svg.append("g").attr("class", "annotations-layer");
  const st = searchTerm.toLowerCase();

  const maxNet = d3.max(allData, (d) => d[NET_COL]);
  const labelTeams = st.length >= 2
    ? visible.filter((d) => d.teamMarket.toLowerCase().includes(st))
    : [
        ...(annotationLimit > 0 ? visible.filter((d) => d[NET_COL] <= annotationLimit).sort((a, b) => a[NET_COL] - b[NET_COL]) : []),
        ...(annotationBottomLimit > 0 ? visible.filter((d) => d[NET_COL] >= maxNet - annotationBottomLimit + 1).sort((a, b) => b[NET_COL] - a[NET_COL]) : []),
      ];

  labelTeams.forEach((d) => {
    layer.append("text")
      .attr("class", "team-annotation")
      .attr("x", x(d[X_COL]) + 7)
      .attr("y", y(d[Y_COL]) + 4)
      .text(d.teamMarket);
  });
}

function buildMetaButtons() {
  const menu = d3.select("#conf-menu");

  document.getElementById("annot-limit").addEventListener("input", function () {
    annotationLimit = Math.max(0, parseInt(this.value) || 0);
    updateDots();
  });

  document.getElementById("annot-bottom-limit").addEventListener("input", function () {
    annotationBottomLimit = Math.max(0, parseInt(this.value) || 0);
    updateDots();
  });

  document.getElementById("conf-major").addEventListener("click", () => {
    selectedConferences.clear();
    CONFERENCES.forEach((c) => { if (POWER_5.has(c.id)) selectedConferences.add(c.id); });
    menu.selectAll("input").each(function () {
      this.checked = POWER_5.has(Number(this.value));
    });
    updateDots();
  });

  document.getElementById("team-search").addEventListener("input", function () {
    searchTerm = this.value.trim();
    updateDots();
  });
}

function buildConferenceDropdown() {
  const menu = d3.select("#conf-menu");
  CONFERENCES.forEach((conf, i) => {
    const teamCount = allData.filter((d) => d.conferenceId === conf.id).length;
    const row = menu.append("label").attr("class", "conf-option");
    row.append("input").attr("type", "checkbox").attr("value", conf.id)
      .on("change", function () {
        if (this.checked) selectedConferences.add(conf.id);
        else selectedConferences.delete(conf.id);
        updateDots();
      });
    row.append("span").attr("class", "conf-rank").text(`${i + 1}.`);
    row.append("span").attr("class", "conf-name").text(conf.name);
    row.append("span").attr("class", "conf-count").text(`${teamCount}`);
  });

  const button = document.getElementById("conf-button");
  const dropdown = document.getElementById("conf-dropdown");
  button.addEventListener("click", () => dropdown.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
  });
  document.getElementById("conf-clear").addEventListener("click", () => {
    selectedConferences.clear();
    menu.selectAll("input").property("checked", false);

    searchTerm = "";
    document.getElementById("team-search").value = "";

    annotationLimit = 0;
    annotationBottomLimit = 0;
    document.getElementById("annot-limit").value = "";
    document.getElementById("annot-bottom-limit").value = "";

    updateDots();
  });
}

function updateFilterStatus(count) {
  const status = document.getElementById("conf-status");
  if (selectedConferences.size === 0) {
    status.innerHTML = `Showing all ${count} teams`;
  } else {
    const selected = CONFERENCES.filter((c) => selectedConferences.has(c.id));
    const parts = selected.map((c) => c.name);
    status.innerHTML = `Showing ${count} teams from: ${parts.join(", ")}`;
  }
}

const CONF_NAME = Object.fromEntries(CONFERENCES.map((c) => [c.id, c.name]));
const CONF_RANK = Object.fromEntries(CONFERENCES.map((c, i) => [c.id, i + 1]));

const ZONES = [
  { label: "At Rim",            rate: "ATR2 FGA%",  ratePct: "ATR2 FGA% %ile",  eff: "ATR2 FG%",  effPct: "ATR2 FG% %ile"  },
  { label: "Paint (non-rim)",   rate: "PAINT2 FGA%", ratePct: "PAINT2 FGA% %ile",eff: "PAINT2 FG%",effPct: "PAINT2 FG% %ile"},
  { label: "Midrange",          rate: "MID2 FGA%",  ratePct: "MID2 FGA% %ile",  eff: "MID2 FG%",  effPct: "MID2 FG% %ile"  },
  { label: "Above-the-Break 3", rate: "ATB3 FGA%",  ratePct: "ATB3 FGA% %ile",  eff: "ATB3 FG%",  effPct: "ATB3 FG% %ile"  },
  { label: "Corner 3",          rate: "C3 FGA%",    ratePct: "C3 FGA% %ile",    eff: "C3 FG%",    effPct: "C3 FG% %ile"    },
];

const dietBarScale = d3.scaleLinear().domain([0, 0.5]).range([0, 110]).clamp(true);

function showTeamPanel(d) {
  const panel = d3.select("#team-panel");
  panel.classed("active", true);
  panel.html("");

  const header = panel.append("div").attr("class", "tp-header");
  const titleWrap = header.append("div");
  titleWrap.append("h3").attr("class", "tp-name").text(d.teamMarket);

  const confName = CONF_NAME[d.conferenceId] || "Unknown";
  const confRank = CONF_RANK[d.conferenceId];
  const overallLosses = d["GP*"] - d.Wins;

  titleWrap.append("p").attr("class", "tp-sub")
    .text(`${confName} (#${confRank} conf) · NET #${d[NET_COL]} · ${winBinLabel(d.Wins)} · record ${d.Wins}-${overallLosses} · ${d.confWins} conf wins`);
  header.append("button").attr("class", "tp-close").attr("type", "button")
    .html("&times;").on("click", closeTeamPanel);

  const headline = panel.append("div").attr("class", "tp-headline");
  addHeadlineStat(headline, "Shot Quality", `${(d[Y_COL] * 100).toFixed(1)}% eFG`, d["Rim + 3s eFG% %ile"], "on Rim + 3s shots");
  addHeadlineStat(headline, "Shot Volume",  `${d[X_COL].toFixed(1)} / game`,        d["Rim + 3s FGA/G %ile"], "Rim + 3s attempts");

  panel.append("h4").attr("class", "tp-section-title").text("Shot chart");
  panel.node().appendChild(buildCourtChart(d));

  panel.append("h4").attr("class", "tp-section-title").text("Shot diet & efficiency by zone");
  const table = panel.append("div").attr("class", "tp-zones");
  const head = table.append("div").attr("class", "tp-zone-row tp-zone-head");
  head.append("span").text("Zone");
  head.append("span").text("Share of FGA");
  head.append("span").text("FG%");

  ZONES.forEach((z) => {
    const row = table.append("div").attr("class", "tp-zone-row");
    row.append("span").attr("class", "tp-zone-label").text(z.label);
    const rateCell = row.append("span").attr("class", "tp-zone-cell");
    rateCell.append("span").attr("class", "tp-bar").style("width", `${dietBarScale(d[z.rate])}px`);
    rateCell.append("span").attr("class", "tp-val").text(`${(d[z.rate] * 100).toFixed(1)}%`);
    const effCell = row.append("span").attr("class", "tp-zone-cell");
    effCell.append("span").attr("class", "tp-val").text(`${(d[z.eff] * 100).toFixed(1)}%`);
    effCell.append("span").attr("class", "tp-pct-chip")
      .style("background", pctColor(d[z.effPct])).text(`${pctLabel(d[z.effPct])}`);
  });

  const compareWidget = panel.append("div").attr("class", "tp-compare-widget");
  compareWidget.append("p").attr("class", "tp-compare-widget-label").text("Compare with another team");
  const compareInput = compareWidget.append("input")
    .attr("type", "text")
    .attr("class", "tp-compare-input")
    .attr("placeholder", "Type a team name…")
    .attr("list", "compare-team-list")
    .attr("autocomplete", "off")
    .attr("spellcheck", "false");
  compareInput.on("input", function () {
    const val = this.value.trim();
    if (!val) { compareTeamId = null; updateDots(); return; }
    const match = allData.find((dd) => dd.teamMarket.toLowerCase() === val.toLowerCase());
    if (!match || match.teamId === d.teamId) return;
    compareTeamId = match.teamId;
    updateDots();
    showComparePanel(d, match);
  });

  document.getElementById("team-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeTeamPanel() {
  const panel = d3.select("#team-panel");
  panel.classed("active", false);
  panel.html('<p class="team-panel-hint">Click any team\'s dot to see its full shot profile.</p>');
  selectedTeamId = null;
  compareTeamId = null;
  svg.selectAll(".dot").classed("selected", false).classed("compare-selected", false).attr("r", 5.5);
}

function showComparePanel(d1, d2) {
  const panel = d3.select("#team-panel");
  panel.classed("active", true);
  panel.html("");

  const header = panel.append("div").attr("class", "tp-header");
  const titleWrap = header.append("div");
  titleWrap.append("h3").attr("class", "tp-name")
    .html(`${d1.teamMarket} <span class="tp-vs">vs.</span> ${d2.teamMarket}`);
  const losses1 = d1["GP*"] - d1.Wins;
  const losses2 = d2["GP*"] - d2.Wins;
  titleWrap.append("p").attr("class", "tp-sub")
    .text(`${d1.teamMarket}: NET #${d1[NET_COL]} · ${d1.Wins}-${losses1}    ·    ${d2.teamMarket}: NET #${d2[NET_COL]} · ${d2.Wins}-${losses2}`);
  header.append("button").attr("class", "tp-close").attr("type", "button")
    .html("&times;").on("click", closeTeamPanel);

  panel.append("h4").attr("class", "tp-section-title").text("Shot charts");
  const courts = panel.append("div").attr("class", "tp-compare-courts");
  [d1, d2].forEach((d) => {
    const side = courts.append("div").attr("class", "tp-compare-side");
    side.append("p").attr("class", "tp-compare-name").text(d.teamMarket);
    side.node().appendChild(buildCourtChart(d));
  });

  panel.append("h4").attr("class", "tp-section-title").text("Zone efficiency head-to-head");
  const table = panel.append("div").attr("class", "tp-zones tp-zones-compare");
  const head = table.append("div").attr("class", "tp-zone-row tp-zone-head");
  head.append("span").text("Zone");
  head.append("span").text(d1.teamMarket);
  head.append("span").text(d2.teamMarket);

  ZONES.forEach((z) => {
    const row = table.append("div").attr("class", "tp-zone-row");
    row.append("span").attr("class", "tp-zone-label").text(z.label);
    [d1, d2].forEach((d) => {
      const cell = row.append("span").attr("class", "tp-zone-cell");
      cell.append("span").attr("class", "tp-val").text(`${(d[z.eff] * 100).toFixed(1)}%`);
      cell.append("span").attr("class", "tp-pct-chip")
        .style("background", pctColor(d[z.effPct])).text(pctLabel(d[z.effPct]));
    });
  });

  const changeWidget = panel.append("div").attr("class", "tp-compare-widget");
  changeWidget.append("p").attr("class", "tp-compare-widget-label").text("Change comparison team");
  const changeInput = changeWidget.append("input")
    .attr("type", "text")
    .attr("class", "tp-compare-input")
    .attr("placeholder", "Type a team name…")
    .attr("list", "compare-team-list")
    .attr("autocomplete", "off")
    .attr("spellcheck", "false")
    .property("value", d2.teamMarket);
  changeInput.on("input", function () {
    const val = this.value.trim();
    if (!val) { compareTeamId = null; updateDots(); showTeamPanel(d1); return; }
    const match = allData.find((dd) => dd.teamMarket.toLowerCase() === val.toLowerCase());
    if (!match || match.teamId === d1.teamId) return;
    compareTeamId = match.teamId;
    updateDots();
    showComparePanel(d1, match);
  });

  document.getElementById("team-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showEmptyBrush() {
  const panel = d3.select("#team-panel");
  panel.html('<p class="team-panel-hint">No teams in that selection. Try a wider brush.</p>');
}

function avg(teams, col) { return d3.mean(teams, (d) => d[col]); }

function showGroupPanel(teams) {
  selectedTeamId = null;
  svg.selectAll(".dot").classed("selected", false).attr("r", 5.5);

  const panel = d3.select("#team-panel");
  panel.classed("active", true);
  panel.html("");

  const header = panel.append("div").attr("class", "tp-header");
  const titleWrap = header.append("div");
  titleWrap.append("h3").attr("class", "tp-name").text(`${teams.length} teams selected`);
  titleWrap.append("p").attr("class", "tp-sub").text("Group averages across the brushed region");
  header.append("button").attr("class", "tp-close").attr("type", "button")
    .html("&times;").on("click", () => {
      svg.select(".brush").call(d3.brush().move, null);
      closeTeamPanel();
    });

  const headline = panel.append("div").attr("class", "tp-headline");
  addHeadlineStat(headline, "Avg Shot Quality", `${(avg(teams, Y_COL) * 100).toFixed(1)}% eFG`, avg(teams, "Rim + 3s eFG% %ile"), "on Rim + 3s shots");
  addHeadlineStat(headline, "Avg Shot Volume",  `${avg(teams, X_COL).toFixed(1)} / game`,        avg(teams, "Rim + 3s FGA/G %ile"), "Rim + 3s attempts");

  const avgVals = {};
  [
    "ATR2 FG%","ATR2 FGA%","ATR2 FG% %ile",
    "PAINT2 FG%","PAINT2 FGA%","PAINT2 FG% %ile",
    "MID2 FG%","MID2 FGA%","MID2 FG% %ile",
    "ATB3 FG%","ATB3 FGA%","ATB3 FG% %ile",
    "C3 FG%","C3 FGA%","C3 FG% %ile",
  ].forEach((col) => { avgVals[col] = avg(teams, col); });
  panel.append("h4").attr("class", "tp-section-title").text("Shot chart (group average)");
  panel.node().appendChild(buildCourtChart(avgVals));

  panel.append("h4").attr("class", "tp-section-title").text("Average shot diet & efficiency by zone");
  const table = panel.append("div").attr("class", "tp-zones");
  const head = table.append("div").attr("class", "tp-zone-row tp-zone-head");
  head.append("span").text("Zone");
  head.append("span").text("Avg share of FGA");
  head.append("span").text("Avg FG%");

  ZONES.forEach((z) => {
    const avgRate = avg(teams, z.rate);
    const avgEff  = avg(teams, z.eff);
    const avgEffPct = avg(teams, z.effPct);
    const row = table.append("div").attr("class", "tp-zone-row");
    row.append("span").attr("class", "tp-zone-label").text(z.label);
    const rateCell = row.append("span").attr("class", "tp-zone-cell");
    rateCell.append("span").attr("class", "tp-bar").style("width", `${dietBarScale(avgRate)}px`);
    rateCell.append("span").attr("class", "tp-val").text(`${(avgRate * 100).toFixed(1)}%`);
    const effCell = row.append("span").attr("class", "tp-zone-cell");
    effCell.append("span").attr("class", "tp-val").text(`${(avgEff * 100).toFixed(1)}%`);
    effCell.append("span").attr("class", "tp-pct-chip")
      .style("background", pctColor(avgEffPct)).text(pctLabel(avgEffPct));
  });

  document.getElementById("team-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function addHeadlineStat(parent, label, value, pctile, note) {
  const block = parent.append("div").attr("class", "tp-stat");
  block.append("div").attr("class", "tp-stat-label").text(label);
  block.append("div").attr("class", "tp-stat-value").text(value);
  block.append("div").attr("class", "tp-stat-note").text(note);
  const bar = block.append("div").attr("class", "tp-stat-bar");
  bar.append("div").attr("class", "tp-stat-bar-fill")
    .style("width", `${pctile * 100}%`).style("background", pctColor(pctile));
  block.append("div").attr("class", "tp-stat-pct").text(`${pctLabel(pctile)} percentile`);
}

function pctLabel(p) { return `${Math.round(p * 100)}th`; }
function pctColor(p) { return d3.interpolateRdYlGn(p); }

function buildCourtChart(vals) {
  const W = 860, H = 500;
  const SC = W / 50;
  const BX = W / 2;
  const baselineY = H - 10;
  const BY = baselineY - 5.25 * SC;
  const rimR = 3.75 * SC;
  const arcR = 20.75 * SC;
  const paintX1 = (25 - 6) * SC;
  const paintX2 = (25 + 6) * SC;
  const paintY = baselineY - 19 * SC;
  const cornerY = baselineY - 14 * SC;
  const dyCorner = BY - cornerY;
  const dxCorner = Math.sqrt(Math.max(0, arcR * arcR - dyCorner * dyCorner));
  const ax1 = BX - dxCorner;
  const ax2 = BX + dxCorner;
  const midY = (cornerY + baselineY) / 2;
  const atbLabelY = Math.max(26, BY - arcR - 14);

  const zDefs = [
    {
      label: "Paint",
      fullLabel: "Paint (non-rim)",
      fg: vals["PAINT2 FG%"], pct: vals["PAINT2 FG% %ile"], rate: vals["PAINT2 FGA%"],
      path: `M ${paintX1} ${paintY} L ${paintX2} ${paintY} L ${paintX2} ${baselineY} L ${paintX1} ${baselineY} Z M ${BX} ${BY} m ${-rimR} 0 a ${rimR} ${rimR} 0 1 0 ${2*rimR} 0 a ${rimR} ${rimR} 0 1 0 ${-2*rimR} 0`,
      fillRule: "evenodd",
      anchors: [{ x: BX, y: paintY + 26 }],
    },
    {
      label: "Midrange",
      fullLabel: "Midrange",
      fg: vals["MID2 FG%"], pct: vals["MID2 FG% %ile"], rate: vals["MID2 FGA%"],
      path: `M ${ax1} ${baselineY} L ${ax2} ${baselineY} L ${ax2} ${cornerY} A ${arcR} ${arcR} 0 0 0 ${ax1} ${cornerY} Z M ${paintX1} ${paintY} L ${paintX2} ${paintY} L ${paintX2} ${baselineY} L ${paintX1} ${baselineY} Z M ${BX} ${BY} m ${-rimR} 0 a ${rimR} ${rimR} 0 1 0 ${2*rimR} 0 a ${rimR} ${rimR} 0 1 0 ${-2*rimR} 0`,
      fillRule: "evenodd",
      anchors: [
        { x: (ax1 + paintX1) / 2, y: midY },
        { x: (paintX2 + ax2) / 2, y: midY },
      ],
    },
    {
      label: "Corner 3",
      fullLabel: "Corner 3",
      fg: vals["C3 FG%"], pct: vals["C3 FG% %ile"], rate: vals["C3 FGA%"],
      path: `M 0 ${cornerY} L ${ax1} ${cornerY} L ${ax1} ${baselineY} L 0 ${baselineY} Z M ${ax2} ${cornerY} L ${W} ${cornerY} L ${W} ${baselineY} L ${ax2} ${baselineY} Z`,
      fillRule: "nonzero",
      anchors: [
        { x: ax1 / 2, y: midY },
        { x: (ax2 + W) / 2, y: midY },
      ],
    },
    {
      label: "Above-Break 3",
      fullLabel: "Above-Break 3",
      fg: vals["ATB3 FG%"], pct: vals["ATB3 FG% %ile"], rate: vals["ATB3 FGA%"],
      path: `M 0 0 L ${W} 0 L ${W} ${cornerY} L ${ax2} ${cornerY} A ${arcR} ${arcR} 0 0 0 ${ax1} ${cornerY} L 0 ${cornerY} Z`,
      fillRule: "nonzero",
      anchors: [{ x: BX, y: atbLabelY }],
    },
    {
      label: "At Rim",
      fullLabel: "At Rim",
      fg: vals["ATR2 FG%"], pct: vals["ATR2 FG% %ile"], rate: vals["ATR2 FGA%"],
      path: `M ${BX} ${BY} m ${-rimR} 0 a ${rimR} ${rimR} 0 1 0 ${2*rimR} 0 a ${rimR} ${rimR} 0 1 0 ${-2*rimR} 0`,
      fillRule: "nonzero",
      anchors: [{ x: BX, y: BY }],
    },
  ];

  const pctScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([0, 1]);

  const wrap = d3.create("div").attr("class", "court-wrap");
  const svgEl = wrap.append("svg")
    .attr("class", "court-svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", W).attr("height", H);

  const defs = svgEl.append("defs");
  const bgId = `cBg${Math.floor(Math.random() * 1e8)}`;
  const bgGrad = defs.append("radialGradient")
    .attr("id", bgId).attr("cx", "50%").attr("cy", "105%").attr("r", "90%");
  bgGrad.append("stop").attr("offset", "0%").attr("stop-color", "#1e1609");
  bgGrad.append("stop").attr("offset", "100%").attr("stop-color", "#0e1116");
  svgEl.append("rect").attr("width", W).attr("height", H)
    .attr("fill", `url(#${bgId})`).attr("rx", 10);

  const glowId = `zg${Math.floor(Math.random() * 1e8)}`;
  defs.append("filter").attr("id", glowId)
    .attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%")
    .append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", 24);

  const rimGlowId = `rg${Math.floor(Math.random() * 1e8)}`;
  defs.append("filter").attr("id", rimGlowId)
    .attr("x", "-200%").attr("y", "-200%").attr("width", "500%").attr("height", "500%")
    .append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", 12);

  const borderGlowId = `bg${Math.floor(Math.random() * 1e8)}`;
  defs.append("filter").attr("id", borderGlowId)
    .attr("x", "-60%").attr("y", "-60%").attr("width", "220%").attr("height", "220%")
    .append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", 10);

  const borderGlowLayer = svgEl.append("g").attr("opacity", 1);
  zDefs.forEach((z) => {
    for (let i = 0; i < 3; i++) {
      borderGlowLayer.append("path")
        .attr("d", z.path)
        .attr("fill", "none")
        .attr("fill-rule", z.fillRule)
        .attr("stroke", z.pct != null ? pctScale(z.pct) : "#2a2a2a")
        .attr("stroke-width", 14)
        .attr("filter", `url(#${borderGlowId})`);
    }
  });

  const glowLayer = svgEl.append("g").attr("opacity", 0.55);
  zDefs.forEach((z) => {
    glowLayer.append("path")
      .attr("d", z.path)
      .attr("fill", z.pct != null ? pctScale(z.pct) : "#2a2a2a")
      .attr("fill-rule", z.fillRule)
      .attr("filter", `url(#${glowId})`);
  });

  const zoneG = svgEl.append("g");
  zDefs.forEach((z) => {
    zoneG.append("path")
      .attr("d", z.path)
      .attr("fill", z.pct != null ? pctScale(z.pct) : "#2a2a2a")
      .attr("fill-rule", z.fillRule)
      .attr("stroke", "black")
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.68)
      .on("mouseover", function (event) {
        d3.select(this).attr("opacity", 0.92).attr("stroke", "black").attr("stroke-width", 4);
        tooltip.style("opacity", 1).html(
          `<div class="t-name">${z.fullLabel}</div>` +
          `<div class="t-row">${(z.fg * 100).toFixed(1)}% FG &middot; ${Math.round(z.pct * 100)}th percentile</div>` +
          `<div class="t-row">${(z.rate * 100).toFixed(1)}% of FGA</div>`
        );
      })
      .on("mousemove", (event) => {
        tooltip.style("left", event.clientX + 14 + "px").style("top", event.clientY + 14 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.68).attr("stroke", "black").attr("stroke-width", 2.5);
        tooltip.style("opacity", 0);
      });
  });

  const lineG = svgEl.append("g")
    .attr("fill", "none").attr("stroke", "black").attr("stroke-width", 1.8);
  lineG.append("line").attr("x1", 0).attr("y1", baselineY).attr("x2", W).attr("y2", baselineY);
  lineG.append("rect").attr("x", paintX1).attr("y", paintY)
    .attr("width", paintX2 - paintX1).attr("height", baselineY - paintY);
  lineG.append("circle").attr("cx", BX).attr("cy", paintY).attr("r", 6 * SC);
  lineG.append("line").attr("x1", ax1).attr("y1", baselineY).attr("x2", ax1).attr("y2", cornerY);
  lineG.append("line").attr("x1", ax2).attr("y1", baselineY).attr("x2", ax2).attr("y2", cornerY);
  const blockY = baselineY - 3 * SC, tick = 0.6 * SC;
  lineG.append("line").attr("x1", paintX1 - tick).attr("y1", blockY).attr("x2", paintX1).attr("y2", blockY);
  lineG.append("line").attr("x1", paintX2).attr("y1", blockY).attr("x2", paintX2 + tick).attr("y2", blockY);
  svgEl.append("circle").attr("cx", BX).attr("cy", BY).attr("r", 0.75 * SC)
    .attr("fill", "none").attr("stroke", "black").attr("stroke-width", 2);
  svgEl.append("line")
    .attr("x1", BX - 3 * SC).attr("y1", BY + 2.2 * SC)
    .attr("x2", BX + 3 * SC).attr("y2", BY + 2.2 * SC)
    .attr("stroke", "black").attr("stroke-width", 2.5);

  const labelG = svgEl.append("g")
    .attr("text-anchor", "middle").attr("pointer-events", "none")
    .attr("font-family", "Archivo, var(--font-body, sans-serif)");

  function txt(x, y, content, fontSize, fontWeight, fill, strokeColor, strokeW) {
    if (strokeColor) {
      labelG.append("text").attr("x", x).attr("y", y)
        .attr("dominant-baseline", "middle")
        .attr("font-size", fontSize).attr("font-weight", fontWeight)
        .attr("fill", "none").attr("stroke", strokeColor)
        .attr("stroke-width", strokeW).attr("stroke-linejoin", "round")
        .text(content);
    }
    labelG.append("text").attr("x", x).attr("y", y)
      .attr("dominant-baseline", "middle")
      .attr("font-size", fontSize).attr("font-weight", fontWeight)
      .attr("fill", fill).text(content);
  }

  zDefs.forEach((z) => {
    if (z.fg == null) return;
    z.anchors.forEach(({ x, y }) => {
      txt(x, y - 12, z.label, 12, "500", "rgba(255,255,255,0.55)", "#0a0806", 3);
      const pctStr = `${(z.fg * 100).toFixed(1)}%`;
      labelG.append("text")
        .attr("x", x).attr("y", y + 10)
        .attr("dominant-baseline", "middle").attr("text-anchor", "middle")
        .attr("font-family", "Fraunces, Georgia, serif")
        .attr("font-size", 21).attr("font-weight", 900)
        .attr("fill", "none").attr("stroke", "#0a0806").attr("stroke-width", 5)
        .attr("stroke-linejoin", "round").text(pctStr);
      labelG.append("text")
        .attr("x", x).attr("y", y + 10)
        .attr("dominant-baseline", "middle").attr("text-anchor", "middle")
        .attr("font-family", "Fraunces, Georgia, serif")
        .attr("font-size", 21).attr("font-weight", 900)
        .attr("fill", "white").text(pctStr);
    });
  });

  const legendDiv = wrap.append("div").attr("class", "court-legend");
  legendDiv.append("span").attr("class", "court-legend-label").text("Worst");
  legendDiv.append("div").attr("class", "court-legend-bar");
  legendDiv.append("span").attr("class", "court-legend-label").text("Best");
  legendDiv.append("span").attr("class", "court-legend-note").text("FG% percentile vs. all D-I teams");

  return wrap.node();
}
