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
    .on("mouseout", function () {
      d3.select(this).attr("r", 5);
      tooltip.style("opacity", 0);
    });
 
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