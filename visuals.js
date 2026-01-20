/* =========================================================
   MESSAGE RECEIVER (engine → iframe)
========================================================= */

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "ENGINE_RESULT") return;

  const payload = event.data.payload;
  console.log("📩 Engine payload received:", payload);

  if (!payload || !payload.data) {
    renderPlaceholder("No visualizable data found.");
    return;
  }

  routeVisual(payload.data);
});

/* =========================================================
   VISUAL ROUTER (DOMAIN-AGNOSTIC)
========================================================= */

function routeVisual(data) {
  clearVisuals();

  // AC / Vector-based (phasors, vectors, forces, etc.)
  if (Array.isArray(data.vectors)) {
    renderPhasor(data.vectors);
    return;
  }

  // DC nodal / scalar per node
  if (isObject(data.node_voltages)) {
    renderNodeVoltages(data.node_voltages);
    return;
  }

  // Time-domain signals (transients, signals, control)
  if (Array.isArray(data.time) && Array.isArray(data.values)) {
    renderWaveform(data.time, data.values);
    return;
  }

  // Frequency response (Bode, spectra)
  if (Array.isArray(data.frequency) && Array.isArray(data.magnitude)) {
    renderBode(data.frequency, data.magnitude, data.phase);
    return;
  }

  // Fallback
  renderPlaceholder("No visual rule matched for this output.");
}

/* =========================================================
   RENDERERS
========================================================= */

function renderPhasor(vectors) {
  const traces = vectors.map(v => ({
    type: "scatterpolar",
    r: [0, v.magnitude],
    theta: [0, v.angle_deg],
    mode: "lines+text",
    name: v.label,
    text: ["", v.label],
    textposition: "top right"
  }));

  Plotly.newPlot("visual-root", traces, {
    polar: { radialaxis: { visible: true } },
    showlegend: true,
    title: "Phasor Diagram"
  });
}

function renderNodeVoltages(nodeVoltages) {
  const nodes = Object.keys(nodeVoltages);
  const values = Object.values(nodeVoltages);

  Plotly.newPlot("visual-root", [{
    type: "bar",
    x: nodes,
    y: values,
    text: values.map(v => `${v} V`),
    textposition: "auto"
  }], {
    title: "DC Node Voltages",
    yaxis: { title: "Voltage (V)" }
  });
}

function renderWaveform(time, values) {
  Plotly.newPlot("visual-root", [{
    type: "scatter",
    x: time,
    y: values,
    mode: "lines"
  }], {
    title: "Time-Domain Response",
    xaxis: { title: "Time" },
    yaxis: { title: "Amplitude" }
  });
}

function renderBode(freq, mag, phase) {
  const plots = [
    {
      type: "scatter",
      x: freq,
      y: mag,
      name: "Magnitude",
      yaxis: "y1"
    }
  ];

  if (Array.isArray(phase)) {
    plots.push({
      type: "scatter",
      x: freq,
      y: phase,
      name: "Phase",
      yaxis: "y2"
    });
  }

  Plotly.newPlot("visual-root", plots, {
    title: "Frequency Response",
    xaxis: { title: "Frequency" },
    yaxis: { title: "Magnitude" },
    yaxis2: {
      title: "Phase",
      overlaying: "y",
      side: "right"
    }
  });
}

/* =========================================================
   HELPERS
========================================================= */

function clearVisuals() {
  document.getElementById("visual-root").innerHTML = "";
}

function renderPlaceholder(text) {
  document.getElementById("visual-root").innerHTML =
    `<p class="placeholder">${text}</p>`;
}

function isObject(obj) {
  return obj && typeof obj === "object" && !Array.isArray(obj);
}
