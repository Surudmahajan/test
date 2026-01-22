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
     /* ---------- CLASS D½: Matrix (2D numeric arrays) ---------- */
  const matrixEntry = extractMatrix(data);
  if (matrixEntry) {
    renderMatrix(matrixEntry.key, matrixEntry.value);
    return;
  }
     /* ---------- CLASS D⅔: Complex numbers (Math) ---------- */
  const complexPayload = extractComplex(data);
  if (complexPayload) {
    renderComplexPlane(complexPayload);
    return;
  }
  /* ---------- CLASS D¾: Polynomial / Function Plot ---------- */
  const poly = extractPolynomial(data);
  if (poly) {
    renderPolynomial(poly);
    return;
  }
  /* ---------- CLASS D⅞: Iterative convergence ---------- */
  const convergence = extractConvergence(data);
  if (convergence) {
    renderConvergence(convergence);
    return;
  }
  /* ---------- CLASS D⁹: ODE trajectory (Math) ---------- */
  const ode = extractODE(data);
  if (ode) {
    renderODE(ode);
    return;
  }
  /* ---------- CLASS D¹⁰: Curve fitting ---------- */
  const fit = extractCurveFit(data);
  if (fit) {
    renderCurveFit(fit);
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
function renderMatrix(title, matrix) {
  let html = `<h4>${title.replace(/_/g, " ")}</h4>`;
  html += `<table class="visual-table"><tbody>`;

  matrix.forEach(row => {
    html += "<tr>";
    row.forEach(cell => {
      html += `<td>${formatNumber(cell)}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  document.getElementById("visual-root").innerHTML = html;
}
function renderComplexPlane(complexData) {
  let points = [];
  let title = "Argand Plane";

  // Case: roots
  if (Array.isArray(complexData)) {
    points = complexData.map((c, i) => ({
      x: c.real,
      y: c.imag,
      label: `Root ${i + 1}`
    }));
    title = "Complex Roots";
  }
  // Case: single complex
  else {
    points = [{
      x: complexData.real,
      y: complexData.imag,
      label: "z"
    }];
  }

  Plotly.newPlot("visual-root", [{
    x: points.map(p => p.x),
    y: points.map(p => p.y),
    text: points.map(p => p.label),
    mode: "markers+text",
    textposition: "top center",
    marker: {
      size: 10
    },
    type: "scatter"
  }], {
    title,
    xaxis: {
      title: "Real",
      zeroline: true
    },
    yaxis: {
      title: "Imaginary",
      zeroline: true,
      scaleanchor: "x"
    }
  });
}

function renderPolynomial(poly) {
  const { coefficients, about } = poly;

  const x = [];
  const y = [];

  const xmin = -5;
  const xmax = 5;
  const steps = 200;

  for (let i = 0; i <= steps; i++) {
    const xi = xmin + (i / steps) * (xmax - xmin);
    let yi = 0;

    coefficients.forEach((c, n) => {
      yi += c * Math.pow(xi - about, n);
    });

    x.push(xi);
    y.push(yi);
  }

  Plotly.newPlot("visual-root", [{
    x,
    y,
    type: "scatter",
    mode: "lines",
    name: "Approximation"
  }], {
    title: "Function Approximation",
    xaxis: { title: "x" },
    yaxis: { title: "f(x)" }
  });
}
function renderConvergence(points) {
  Plotly.newPlot("visual-root", [{
    x: points.map(p => p.iteration),
    y: points.map(p => p.value),
    type: "scatter",
    mode: "lines+markers",
    marker: { size: 6 }
  }], {
    title: "Iteration Convergence",
    xaxis: { title: "Iteration" },
    yaxis: { title: "Value" }
  });
}
function renderODE(ode) {
  Plotly.newPlot("visual-root", [{
    x: ode.t,
    y: ode.y,
    type: "scatter",
    mode: "lines",
    name: "ODE Solution"
  }], {
    title: "ODE Trajectory",
    xaxis: { title: "t" },
    yaxis: { title: "y(t)" }
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
function extractMatrix(data) {
  for (const [k, v] of Object.entries(data)) {
    if (
      Array.isArray(v) &&
      v.length > 0 &&
      Array.isArray(v[0]) &&
      v.every(row => Array.isArray(row))
    ) {
      return { key: k, value: v };
    }
  }
  return null;
}

function extractComplex(data) {
  // Case: roots array
  if (Array.isArray(data.roots)) {
    const valid = data.roots.every(
      r => typeof r.real === "number" && typeof r.imag === "number"
    );
    if (valid) return data.roots;
  }

  // Case: single complex (rectangular)
  if (
    typeof data.real === "number" &&
    typeof data.imag === "number"
  ) {
    return { real: data.real, imag: data.imag };
  }

  // Case: polar form (convert to rectangular)
  if (
    typeof data.modulus === "number" &&
    typeof data.argument === "number"
  ) {
    return {
      real: data.modulus * Math.cos(data.argument),
      imag: data.modulus * Math.sin(data.argument)
    };
  }

  return null;
}
function extractPolynomial(data) {
  if (!Array.isArray(data.coefficients)) return null;

  if (!data.coefficients.every(c => typeof c === "number")) return null;

  return {
    coefficients: data.coefficients,
    about: typeof data.about === "number" ? data.about : 0
  };
}
function extractConvergence(data) {
  if (!data.iterations) return null;

  // Case 1: array of numbers
  if (
    Array.isArray(data.iterations) &&
    data.iterations.every(v => typeof v === "number")
  ) {
    return data.iterations.map((v, i) => ({
      iteration: i + 1,
      value: v
    }));
  }

  // Case 2: array of objects
  if (
    Array.isArray(data.iterations) &&
    data.iterations.every(
      it => typeof it.iteration === "number" && typeof it.value === "number"
    )
  ) {
    return data.iterations;
  }

  return null;
}
function extractODE(data) {
  if (
    Array.isArray(data.t) &&
    Array.isArray(data.y) &&
    data.t.length === data.y.length &&
    data.t.every(v => typeof v === "number") &&
    data.y.every(v => typeof v === "number")
  ) {
    return { t: data.t, y: data.y };
  }
  return null;
}
function extractCurveFit(data) {
  // Case: explicit fitted y-values
  if (
    Array.isArray(data.x) &&
    Array.isArray(data.y) &&
    Array.isArray(data.y_fit) &&
    data.x.length === data.y.length &&
    data.y.length === data.y_fit.length
  ) {
    return {
      x: data.x,
      y: data.y,
      yFit: data.y_fit
    };
  }

  // Case: polynomial fit via coefficients
  if (
    Array.isArray(data.x) &&
    Array.isArray(data.y) &&
    Array.isArray(data.coefficients)
  ) {
    return {
      x: data.x,
      y: data.y,
      coefficients: data.coefficients
    };
  }

  return null;
}

function renderCurveFit(fit) {
  const traces = [];

  // Original data points
  traces.push({
    x: fit.x,
    y: fit.y,
    mode: "markers",
    type: "scatter",
    name: "Data"
  });

  // Case 1: fitted y-values
  if (fit.yFit) {
    traces.push({
      x: fit.x,
      y: fit.yFit,
      mode: "lines",
      type: "scatter",
      name: "Fit"
    });
  }

  // Case 2: coefficients → compute fit
  if (fit.coefficients) {
    const yFit = fit.x.map(xi => {
      let yi = 0;
      fit.coefficients.forEach((c, n) => {
        yi += c * Math.pow(xi, n);
      });
      return yi;
    });

    traces.push({
      x: fit.x,
      y: yFit,
      mode: "lines",
      type: "scatter",
      name: "Fit"
    });
  }

  Plotly.newPlot("visual-root", traces, {
    title: "Curve Fitting",
    xaxis: { title: "x" },
    yaxis: { title: "y" }
  });
}

