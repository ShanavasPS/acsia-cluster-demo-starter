// One dial for both the speed gauge and the rev counter: face, track, ticks, optional red zone,
// value arc with glow, needle with glow, digits and unit. update() changes only what moved.
//   createDial(parent, defs, idPrefix, opts)
//   opts: the dial's config entry (cx, cy, r, trackWidth, max, ticks, tickGap, tickLength, tickWidth,
//   needle {width, inset, length}, digitsSize, digitsDy, unit, unitSize, unitDy, redFrom?) plus role ("speed" | "rpm").
//   idPrefix keeps this mount's gradient ids apart from another mount's.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.createDial = function (parent, defs, idPrefix, opts) {
  const { el, set, setText, point, arcPath, arcLength, linearGradient, radialGradient } = Cluster.svg;
  const cfg = Cluster.config, d = cfg.dial, c = cfg.colors;
  const { cx, cy, r, ticks, redFrom, max, role, trackWidth } = opts;
  const a0 = d.startAngle, a1 = d.startAngle + d.sweepAngle;
  const angleOf = (fraction) => a0 + d.sweepAngle * fraction;

  const faceId = idPrefix + role + "-face", gradId = idPrefix + role + "-arc";
  radialGradient(defs, faceId, [["0", c.face, "1"], ["1", c.face, "0"]]);
  linearGradient(defs, gradId, [["0", c.arcStart], ["1", c.arcEnd]], d.arcGradient);
  const gradient = `url(#${gradId})`;

  const g = el("g", { "data-role": role + "-dial" }, parent);
  el("circle", { cx, cy, r, fill: `url(#${faceId})` }, g);
  el("path", { d: arcPath(cx, cy, r, a0, a1), fill: "none", stroke: c.track, "stroke-width": trackWidth,
    "stroke-linecap": "round", "data-role": role + "-track" }, g);

  if (redFrom != null) {
    el("path", { d: arcPath(cx, cy, r, angleOf(redFrom / max), a1), fill: "none", stroke: c.red,
      "stroke-width": trackWidth, "stroke-linecap": "round", "data-role": role + "-redzone" }, g);
  }
  const tickOuter = r - trackWidth / 2 - opts.tickGap;
  for (let i = 0; i < ticks; i++) {
    const a = angleOf(i / (ticks - 1));
    const p0 = point(cx, cy, tickOuter, a), p1 = point(cx, cy, tickOuter - opts.tickLength, a);
    el("line", { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, stroke: c.tick, "stroke-width": opts.tickWidth,
      "stroke-linecap": "round", "data-role": role + "-tick" }, g);
  }

  // The value arc: a full 270° path shown up to the value with a dash offset. Two wider copies
  // underneath, nearly transparent, are its glow.
  const full = arcPath(cx, cy, r, a0, a1), len = arcLength(r, d.sweepAngle);
  const arcAttrs = (w, opacity, extra) => Object.assign({ d: full, fill: "none", "stroke-width": w, "stroke-opacity": opacity,
    "stroke-dasharray": len, "stroke-dashoffset": len, "stroke-linecap": "round", stroke: gradient }, extra);
  const glows = d.glowWidths.map((k) => el("path", arcAttrs(trackWidth * k, d.glowOpacity), g));
  const arc = el("path", arcAttrs(trackWidth, 1, { "data-role": role + "-arc", "data-red": "false" }), g);

  // The needle: a short pointer inside the ring, over the ticks, drawn straight up and rotated.
  const n = opts.needle;
  const nTop = cy - r + trackWidth / 2 + n.inset, nBottom = nTop + n.length;
  const needle = el("g", { "data-role": role + "-needle", "data-fraction": "0", transform: `rotate(${angleOf(0)} ${cx} ${cy})` }, g);
  for (const k of d.glowWidths) {
    el("line", { x1: cx, y1: nTop, x2: cx, y2: nBottom, stroke: c.needleGlow, "stroke-width": n.width * k,
      "stroke-linecap": "round", "stroke-opacity": d.glowOpacity }, needle);
  }
  el("line", { x1: cx, y1: nTop, x2: cx, y2: nBottom, stroke: c.needle, "stroke-width": n.width, "stroke-linecap": "round" }, needle);

  const text = el("text", { x: cx, y: cy + opts.digitsDy, "text-anchor": "middle", fill: c.digits, "font-size": opts.digitsSize,
    "font-weight": d.digitsWeight, "data-role": role + "-text" }, g);
  const unitEl = el("text", { x: cx, y: cy + opts.unitDy, "text-anchor": "middle", fill: c.label, "font-size": opts.unitSize,
    "data-role": role + "-unit" }, g);
  unitEl.textContent = opts.unit;

  return {
    group: g,
    update({ fraction, text: t, red }) {
      const f = Math.min(1, Math.max(0, fraction));
      set(needle, "transform", `rotate(${angleOf(f)} ${cx} ${cy})`);
      set(needle, "data-fraction", f);
      const offset = len * (1 - f);
      set(arc, "stroke-dashoffset", offset);
      for (const gl of glows) set(gl, "stroke-dashoffset", offset);
      const stroke = red ? c.red : gradient;
      set(arc, "stroke", stroke);
      set(arc, "data-red", !!red);
      for (const gl of glows) set(gl, "stroke", stroke);
      setText(text, t);
    },
  };
};
