/* =====================================================
   ELECTRONICS VISUALS ENGINE
   Backend-truth driven (FINAL + PHASORS)
===================================================== */

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "ENGINE_RESULT") return;

  const payload = event.data.payload;
  if (!payload || !payload.data) {
    showMessage("No data received from engine.");
    return;
  }

  console.log("📩 Visuals received:", payload.data);
  routeVisual(payload.data);
});

/* =====================================================
   ROUTER (ORDER MATTERS)
===================================================== */

function routeVisual(data) {
  clear();

  /* ---------- CLASS 0: Time-series (waveform) ---------- */
  if (data.samples?.x && data.samples?.y) {
    renderLinePlot(data.samples.x, data.samples.y, "Waveform");
    return;
  }

  /* ---------- CLASS 1: Phasor (impedance phasor) ---------- */
  if (data.phasor?.magnitude !== undefined && data.phasor?.angle !== undefined) {
    renderPhasor(data.phasor);
    return;
  }

  /* ---------- CLASS A: Algebraic solution ---------- */
  if (isPlainObject(data.solution)) {
    renderScalarMap(data.solution, "Solution");
    return;
  }

  /* ---------- CLASS B: Scalar parameters ---------- */
  const scalarMap = extractScalarMap(data);
  if (Object.keys(scalarMap).length > 0) {
    renderScalarMap(scalarMap, "Parameters");
    return;
  }

  /* ---------- CLASS C: Indexed arrays ---------- */
  if (Array.isArray(data.voltages)) {
    renderIndexedArray(data.voltages, "Voltage");
    return;
  }

  if (Array.isArray(data.currents)) {
    renderIndexedArray(data.currents, "Current");
    return;
  }

  if (Array.isArray(data.outputs)) {
    renderIndexedArray(data.outputs, "Output");
    return;
  }

  /* ---------- CLASS D: Tables ---------- */
  if (Array.isArray(data.table)) {
    renderTable(data.table);
    return;
  }

  /* ---------- CLASS E: Informational text ---------- */
  const textBlocks = extractTextBlocks(data);
  if (textBlocks.length > 0) {
    renderTextBlocks(textBlocks);
    return;
  }

  showMessage("No visual rule matched for this output.");
}

/* =====================================================
   RENDERERS
===================================================== */

function renderScalarMap(map, title) {
  Plotly.newPlot("visual-root", [{
    type: "bar",
    x: Object.keys(map),
    y: Object.values(map),
    text: Object.values(map).map(formatNumber),
    textposition: "auto"
  }], {
    title,
    yaxis: { title: "Value" }
  });
}

function renderIndexedArray(arr, labelPrefix) {
  Plotly.newPlot("visual-root", [{
    type: "bar",
    x: arr.map((_, i) => `${labelPrefix} ${i + 1}`),
    y: arr,
    text: arr.map(formatNumber),
    textposition: "auto"
  }], {
    title: `${labelPrefix} Results`
  });
}

function renderLinePlot(x, y, title) {
  Plotly.newPlot("visual-root", [{
    x,
    y,
    type: "scatter",
    mode: "lines"
  }], {
    title,
    xaxis: { title: "Time" },
    yaxis: { title: "Amplitude" }
  });
}

function renderPhasor(phasor) {
  const angleDeg = phasor.angle * 180 / Math.PI;

  Plotly.newPlot("visual-root", [{
    type: "scatterpolar",
    r: [0, phasor.magnitude],
    theta: [0, angleDeg],
    mode: "lines+markers",
    marker: { size: 8 },
    name: "Impedance Phasor"
  }], {
    title: "Impedance Phasor Diagram",
    polar: {
      radialaxis: { visible: true }
    },
    showlegend: false
  });
}

function renderTable(rows) {
  const headers = Object.keys(rows[0]);

  let html = `<table class="visual-table"><thead><tr>`;
  headers.forEach(h => html += `<th>${h}</th>`);
  html += `</tr></thead><tbody>`;

  rows.forEach(row => {
    html += `<tr>`;
    headers.forEach(h => html += `<td>${row[h]}</td>`);
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  document.getElementById("visual-root").innerHTML = html;
}

function renderTextBlocks(blocks) {
  const root = document.getElementById("visual-root");
  blocks.forEach(({ key, value }) => {
    const section = document.createElement("div");
    section.innerHTML = `<h4>${key}</h4>${formatText(value)}`;
    root.appendChild(section);
  });
}

/* =====================================================
   HELPERS
===================================================== */

function extractScalarMap(data) {
  const ignore = ["topic", "samples", "phasor"];
  const map = {};

  Object.entries(data).forEach(([k, v]) => {
    if (!ignore.includes(k) && typeof v === "number") {
      map[k] = v;
    }
  });

  return map;
}

function extractTextBlocks(data) {
  const blocks = [];

  Object.entries(data).forEach(([k, v]) => {
    if (Array.isArray(v) && v.every(x => typeof x === "string")) {
      blocks.push({ key: k, value: v });
    } else if (isPlainObject(v) && k !== "solution") {
      blocks.push({ key: k, value: JSON.stringify(v, null, 2) });
    }
  });

  return blocks;
}

function formatText(value) {
  if (Array.isArray(value)) {
    return `<ul>${value.map(v => `<li>${v}</li>`).join("")}</ul>`;
  }
  return `<pre>${value}</pre>`;
}

function formatNumber(v) {
  return typeof v === "number" ? v.toFixed(4) : v;
}

function clear() {
  document.getElementById("visual-root").innerHTML = "";
}

function showMessage(msg) {
  document.getElementById("visual-root").innerHTML =
    `<p style="color:#777; text-align:center;">${msg}</p>`;
}

function isPlainObject(obj) {
  return obj && typeof obj === "object" && !Array.isArray(obj);
}
