/* =====================================================
   ELECTRONICS VISUALS ENGINE (BACKEND-CONTRACT DRIVEN)
   Authoritative version
===================================================== */

/* ---------- Message Receiver ---------- */

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "ENGINE_RESULT") return;

  const payload = event.data.payload;
  console.log("📩 Visuals received:", payload);

  if (!payload || !payload.data) {
    showMessage("No data received from engine.");
    return;
  }

  routeVisual(payload.data);
});

/* ---------- Visual Router ---------- */

function routeVisual(data) {
  clear();

  /* CLASS A — solution object (DC nodal, mesh, algebraic, etc.) */
  if (isPlainObject(data.solution)) {
    renderScalarMap(data.solution, "Solution");
    return;
  }

  /* CLASS B — multiple scalar numeric keys (AC RLC, power, thevenin, etc.) */
  const scalarMap = extractScalarMap(data);
  if (Object.keys(scalarMap).length > 0) {
    renderScalarMap(scalarMap, "Parameters");
    return;
  }

  /* CLASS C — indexed arrays */
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

  /* CLASS D — truth table */
  if (Array.isArray(data.table)) {
    renderTable(data.table);
    return;
  }

  /* CLASS E — text / theory / lists */
  const textBlocks = extractTextBlocks(data);
  if (textBlocks.length > 0) {
    renderTextBlocks(textBlocks);
    return;
  }

  /* FALLBACK */
  showMessage("No visual rule matched for this output.");
}

/* ---------- Renderers ---------- */

function renderScalarMap(map, title) {
  const labels = Object.keys(map);
  const values = Object.values(map);

  Plotly.newPlot("visual-root", [
    {
      type: "bar",
      x: labels,
      y: values,
      text: values.map(v => formatNumber(v)),
      textposition: "auto"
    }
  ], {
    title,
    yaxis: { title: "Value" }
  });
}

function renderIndexedArray(arr, labelPrefix) {
  const labels = arr.map((_, i) => `${labelPrefix} ${i + 1}`);

  Plotly.newPlot("visual-root", [
    {
      type: "bar",
      x: labels,
      y: arr,
      text: arr.map(v => formatNumber(v)),
      textposition: "auto"
    }
  ], {
    title: `${labelPrefix} Results`,
    yaxis: { title: labelPrefix }
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

/* ---------- Helpers ---------- */

function extractScalarMap(data) {
  const ignoreKeys = ["topic"];
  const map = {};

  Object.entries(data).forEach(([k, v]) => {
    if (
      !ignoreKeys.includes(k) &&
      typeof v === "number" &&
      isFinite(v)
    ) {
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
    }
    else if (isPlainObject(v)) {
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
