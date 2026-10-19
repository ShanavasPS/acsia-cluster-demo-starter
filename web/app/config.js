// Every colour, size, limit, threshold and timing of the cluster, so nothing else holds one.
// Text formats ("24 %", "-2.5 °C", "--") are fixed by the test contract and live in derive.js.
// Views read this when they are built, so a test can change a value before mounting.
// The gauge scales (160 mph, 8000 rpm, 100 %) are what the dials show; the signal ranges in
// docs/signals.csv (260 km/h, 8000 rpm, 100 %) are what the store clamps to. They are separate on purpose.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.config = {
  width: 528,
  height: 692,
  kmhPerMph: 1.609344,   // a physical constant, not a design value; here so no module holds a literal

  colors: {
    bgCenter: "#18304f",
    bgEdge: "#0a1424",
    bgBottom: "#000000",
    face: "#10203a",
    track: "#1b2c48",
    tick: "#4d6c96",
    arcStart: "#2f86d6",
    arcEnd: "#6dc1ec",
    needle: "#f7f9fc",
    needleGlow: "#6dc1ec",
    red: "#e2574c",
    amber: "#f2b43c",
    digits: "#f7f9fc",
    label: "#8fb3d9",
    gearActive: "#6dc1ec",
    gearInactive: "#4d6c96",
    telltaleOff: "#2c4266",
  },

  background: { glowCx: 264, glowCy: 330, glowR: 330, bottomFade: 120 },

  // Dials: a 270° arc from -135° (lower left) to +135° (lower right), 0° straight up.
  // The value arc's gradient runs from the dial's lower left to its upper right, as in the design.
  dial: { startAngle: -135, sweepAngle: 270, glowOpacity: 0.07, glowWidths: [2, 3.2],
    digitsWeight: "500", arcGradient: { x1: 0, y1: 1, x2: 1, y2: 0 } },
  speed: { cx: 264, cy: 242, r: 158, trackWidth: 6, max: 160, ticks: 9, tickGap: 17, tickLength: 10, tickWidth: 1.5,
    needle: { width: 5, inset: 26, length: 48 },
    digitsSize: 58, digitsDy: 14, unit: "mph", unitSize: 16, unitDy: 44 },
  rpm: { cx: 191, cy: 524, r: 91, trackWidth: 4, max: 8000, ticks: 17, tickGap: 10, tickLength: 5, tickWidth: 1, redFrom: 6500, digitsPer: 1000,
    needle: { width: 3, inset: 14, length: 26 },
    digitsSize: 32, digitsDy: 13, unit: "×1000 rpm", unitSize: 10, unitDy: 32 },

  telltales: { y: 48, iconSize: 22, firstX: 144, spacing: 60,
    order: ["low_fuel", "engine_check", "battery", "seatbelt", "parking_brake"],
    // kind: the colour each shows when on. signal: the boolean signal each follows; low_fuel has
    // none because it is derived from the fuel level with hysteresis (derive.lowFuel).
    kind: { low_fuel: "amber", engine_check: "amber", battery: "red", seatbelt: "red", parking_brake: "red" },
    signal: { engine_check: "tt_engine_check", battery: "tt_battery", seatbelt: "tt_seatbelt", parking_brake: "tt_parking_brake" } },
  gear: { cx: 264, y: 360, spacing: 36, size: 28, letters: ["P", "R", "N", "D"], activeWeight: "bold", inactiveWeight: "normal",
    noteDy: 22, noteSize: 18 },
  fuel: { x: 296, y: 458, width: 139, barGap: 22, barHeight: 10, labelSize: 18,
    label: "Fuel ",   // the trailing space separates it from the value that follows in the same line
    max: 100, lowOn: 10, lowOff: 12 },
  temperature: { y: 539, size: 18 },   // centred on the fuel bar

  // Needle smoothing: the needle covers 63 % of a step in tauMs, and snaps the last settleFraction
  // of the scale so a settled needle stops writing to the DOM.
  needle: { tauMs: 80, settleFraction: 1e-4 },
  // Startup: telltales on for telltalesMs; the needle sweeps up, holds, and is back at 0 by
  // downUntilMs; live at liveAtMs (from mount; the page needs under 2 s from open to live).
  startup: { telltalesMs: 1500, sweepUpMs: 700, holdUntilMs: 900, downUntilMs: 1600, liveAtMs: 1700 },
  replay: { defaultStepMs: 100 }, // the loop step for a recording with a single row; not a design value

  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};
