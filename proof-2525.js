/* ============================================================
   proof-2525.js
   Data-driven 25/25 proof graphic with per-team hover.
   Self-contained (IIFE) so names never collide with main.js.
   Renders into #proof-quality-row and #proof-volume-row.
   Below-median squares are RED; above-median are GREEN.
   ============================================================ */
(function () {
  const TOP25 = [
    { rank: 1,  team: "Michigan",          qual: 61.6, vol: 46.1, hq: true, hv: true  },
    { rank: 2,  team: "Duke",              qual: 59.3, vol: 46.3, hq: true, hv: true  },
    { rank: 3,  team: "Arizona",           qual: 60.9, vol: 40.6, hq: true, hv: false },
    { rank: 4,  team: "Florida",           qual: 58.4, vol: 49.1, hq: true, hv: true  },
    { rank: 5,  team: "Illinois",          qual: 58.7, vol: 49.5, hq: true, hv: true  },
    { rank: 6,  team: "Houston",           qual: 58.6, vol: 37.4, hq: true, hv: false },
    { rank: 7,  team: "Iowa St.",          qual: 62.3, vol: 43.9, hq: true, hv: true  },
    { rank: 8,  team: "Purdue",            qual: 63.6, vol: 38.7, hq: true, hv: false },
    { rank: 9,  team: "UConn",             qual: 58.1, vol: 42.9, hq: true, hv: true  },
    { rank: 10, team: "Gonzaga",           qual: 60.8, vol: 41.3, hq: true, hv: false },
    { rank: 11, team: "Michigan St.",      qual: 60.0, vol: 36.7, hq: true, hv: false },
    { rank: 12, team: "Nebraska",          qual: 58.6, vol: 47.0, hq: true, hv: true  },
    { rank: 13, team: "St. John's (NY)",   qual: 56.4, vol: 43.6, hq: true, hv: true  },
    { rank: 14, team: "Alabama",           qual: 57.3, vol: 55.9, hq: true, hv: true  },
    { rank: 15, team: "Vanderbilt",        qual: 59.0, vol: 39.4, hq: true, hv: false },
    { rank: 16, team: "Virginia",          qual: 57.8, vol: 48.1, hq: true, hv: true  },
    { rank: 17, team: "Tennessee",         qual: 57.0, vol: 40.6, hq: true, hv: false },
    { rank: 18, team: "Arkansas",          qual: 65.7, vol: 44.1, hq: true, hv: true  },
    { rank: 19, team: "Louisville",        qual: 59.2, vol: 50.5, hq: true, hv: true  },
    { rank: 20, team: "Texas Tech",        qual: 60.4, vol: 43.9, hq: true, hv: true  },
    { rank: 21, team: "Kansas",            qual: 58.4, vol: 40.1, hq: true, hv: false },
    { rank: 22, team: "Iowa",              qual: 59.8, vol: 41.0, hq: true, hv: false },
    { rank: 23, team: "BYU",               qual: 58.2, vol: 45.6, hq: true, hv: true  },
    { rank: 24, team: "Saint Mary's (CA)", qual: 59.3, vol: 38.5, hq: true, hv: true  },
    { rank: 25, team: "Utah St.",          qual: 60.3, vol: 42.4, hq: true, hv: false },
  ];
 
  const GREEN = "#4cc38a";
  const RED = "#d73027";
  const N = TOP25.length;
  const GAP = 5;
  const SIZE = 16;
  const STEP = SIZE + GAP;
  const VBW = N * STEP - GAP;
  const VBH = 24;
 
  let tip = document.getElementById("proof-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "proof-tip";
    tip.className = "proof-tip";
    document.body.appendChild(tip);
  }
 
  function showTip(html, evt) {
    tip.innerHTML = html;
    tip.style.opacity = "1";
    tip.style.left = evt.clientX + 14 + "px";
    tip.style.top = evt.clientY + 14 + "px";
  }
  function moveTip(evt) {
    tip.style.left = evt.clientX + 14 + "px";
    tip.style.top = evt.clientY + 14 + "px";
  }
  function hideTip() { tip.style.opacity = "0"; }
 
  function renderRow(svgId, metric) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.setAttribute("viewBox", `0 0 ${VBW} ${VBH}`);
    svg.innerHTML = "";
 
    TOP25.forEach((t, i) => {
      const filled = t[metric];
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", i * STEP);
      rect.setAttribute("y", 2);
      rect.setAttribute("width", SIZE);
      rect.setAttribute("height", SIZE);
      rect.setAttribute("rx", 3);
      rect.setAttribute("fill", filled ? GREEN : RED);
      rect.style.cursor = "pointer";
 
      const metricLine = metric === "hq"
        ? `Shot quality: <strong>${t.qual}% eFG</strong> &middot; ${t.hq ? "above" : "below"} median`
        : `Shot volume: <strong>${t.vol}/game</strong> &middot; ${t.hv ? "above" : "below"} median`;
 
      rect.addEventListener("mouseenter", (e) => {
        rect.setAttribute("stroke", "#fff");
        rect.setAttribute("stroke-width", 2);
        showTip(
          `<div class="proof-tip-name">#${t.rank} ${t.team}</div>` +
          `<div class="proof-tip-row">${metricLine}</div>`,
          e
        );
      });
      rect.addEventListener("mousemove", moveTip);
      rect.addEventListener("mouseleave", () => {
        rect.setAttribute("stroke", "none");
        hideTip();
      });
 
      svg.appendChild(rect);
    });
  }
 
  function init() {
    renderRow("proof-quality-row", "hq");
    renderRow("proof-volume-row", "hv");
  }
 
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
