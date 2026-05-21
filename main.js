/* ============================================================
   The Efficiency Frontier - main.js
   Core scatterplot: Shot Quality vs Shot Volume
   ============================================================ */

const MARGIN = { top: 30, right: 30, bottom: 60, left: 70 };

// column names (after trimming whitespace from headers)
const X_COL = "Rim + 3s FGA/G";   // volume
const Y_COL = "Rim + 3s eFG%";    // quality
const NET_COL = "NET Ranking";

d3.csv("data/shot_data.csv", d3.autoType).then((raw) => {
  // clean: trim header whitespace just in case, and drop incomplete rows
  const data = raw.filter(
    (d) => d[X_COL] != null && d[Y_COL] != null && d[NET_COL] != null
  );

  drawScatter(data);
});

function drawScatter(data) {
  const container = document.getElementById("chart");
  const width = container.clientWidth - MARGIN.left - MARGIN.right;
  const height = 520 - MARGIN.top - MARGIN.bottom;

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  // scales
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d[X_COL]))
    .nice()
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d[Y_COL]))
    .nice()
    .range([height, 0]);

  // color by NET ranking (lower = better = greener)
  const color = d3
    .scaleSequential(d3.interpolateRdYlGn)
    .domain([d3.max(data, (d) => d[NET_COL]), d3.min(data, (d) => d[NET_COL])]);

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

  // axis labels
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

  // median quadrant lines
  const xMed = d3.median(data, (d) => d[X_COL]);
  const yMed = d3.median(data, (d) => d[Y_COL]);

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

  // dots (enter pattern)
  const tooltip = d3.select("#tooltip");

  svg
    .selectAll(".dot")
    .data(data)
    .join("circle")
    .attr("class", "dot")
    .attr("cx", (d) => x(d[X_COL]))
    .attr("cy", (d) => y(d[Y_COL]))
    .attr("r", 5)
    .attr("fill", (d) => color(d[NET_COL]))
    .attr("stroke", "rgba(0,0,0,0.3)")
    .attr("stroke-width", 0.5)
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
}

// redraw on resize so the chart stays responsive
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    d3.select("#chart svg").remove();
    d3.csv("data/shot_data.csv", d3.autoType).then((raw) => {
      const data = raw.filter(
        (d) => d[X_COL] != null && d[Y_COL] != null && d[NET_COL] != null
      );
      drawScatter(data);
    });
  }, 200);
});
