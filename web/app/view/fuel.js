// The fuel bar with its percentage: label, track and fill. The fill uses the value-arc colours,
// left to right, or flat amber while the low-fuel warning is on.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.createFuel = function (parent, defs, idPrefix) {
  const { el, set, setText, linearGradient } = Cluster.svg;
  const cfg = Cluster.config, f = cfg.fuel, c = cfg.colors;
  const gradId = idPrefix + "fuel";
  linearGradient(defs, gradId, [["0", c.arcStart], ["1", c.arcEnd]]);
  const gradient = `url(#${gradId})`;

  const g = el("g", { "data-role": "fuel" }, parent);
  const label = el("text", { x: f.x + f.width / 2, y: f.y, "text-anchor": "middle", fill: c.label, "font-size": f.labelSize }, g);
  label.textContent = f.label;
  const text = el("tspan", { "data-role": "fuel-text" }, label);
  const barY = f.y + f.barGap;
  el("rect", { x: f.x, y: barY, width: f.width, height: f.barHeight, rx: f.barHeight / 2, fill: c.track, "data-role": "fuel-track" }, g);
  const bar = el("rect", { x: f.x, y: barY, width: 0, height: f.barHeight, rx: f.barHeight / 2, fill: gradient,
    "data-role": "fuel-bar", "data-fraction": "0", "data-low": "false" }, g);

  return {
    group: g,
    update({ text: t, fraction, low }) {
      setText(text, t);
      set(bar, "width", f.width * fraction);
      set(bar, "data-fraction", fraction);
      set(bar, "data-low", !!low);
      set(bar, "fill", low ? c.amber : gradient);
    },
  };
};
