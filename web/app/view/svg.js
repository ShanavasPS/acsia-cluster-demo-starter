// SVG helpers for the views. Angles are degrees from straight up, clockwise positive.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.svg = (function () {
  const NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k of Object.keys(attrs || {})) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // Reads the attribute and writes it only when it differs, so a frame in which nothing changed
  // makes no DOM mutation (and no style or paint work).
  function set(e, name, value) {
    const v = String(value);
    if (e.getAttribute(name) !== v) e.setAttribute(name, v);
  }
  function setText(e, text) { if (e.textContent !== text) e.textContent = text; }

  const rad = (deg) => (deg * Math.PI) / 180;
  const point = (cx, cy, r, deg) => ({ x: cx + r * Math.sin(rad(deg)), y: cy - r * Math.cos(rad(deg)) });
  const fmt = (n) => Math.round(n * 1000) / 1000;

  // A clockwise arc from a0 to a1 degrees.
  function arcPath(cx, cy, r, a0, a1) {
    const p0 = point(cx, cy, r, a0), p1 = point(cx, cy, r, a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${fmt(p0.x)} ${fmt(p0.y)} A ${r} ${r} 0 ${large} 1 ${fmt(p1.x)} ${fmt(p1.y)}`;
  }
  const arcLength = (r, sweepDeg) => rad(sweepDeg) * r;

  // stops: [[offset, color, opacity?], …]. direction: { x1, y1, x2, y2 } in the box, default left to right.
  function linearGradient(defs, id, stops, direction) {
    const d = Object.assign({ x1: 0, y1: 0, x2: 1, y2: 0 }, direction);
    const g = el("linearGradient", { id, x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 }, defs);
    addStops(g, stops);
    return g;
  }
  // attrs: cx, cy, r in user space when given (gradientUnits userSpaceOnUse), else the default box.
  function radialGradient(defs, id, stops, attrs) {
    const g = el("radialGradient", Object.assign({ id }, attrs ? Object.assign({ gradientUnits: "userSpaceOnUse" }, attrs) : {}), defs);
    addStops(g, stops);
    return g;
  }
  function addStops(g, stops) {
    for (const [offset, color, opacity] of stops) el("stop", { offset, "stop-color": color, "stop-opacity": opacity }, g);
  }

  return { NS, el, set, setText, point, arcPath, arcLength, linearGradient, radialGradient };
})();
