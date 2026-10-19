// The outside temperature, one line of text centred under the fuel bar.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.createTemperature = function (parent) {
  const { el, setText } = Cluster.svg;
  const cfg = Cluster.config, t = cfg.temperature, f = cfg.fuel;
  const text = el("text", { x: f.x + f.width / 2, y: t.y, "text-anchor": "middle", fill: cfg.colors.label, "font-size": t.size,
    "data-role": "temperature" }, parent);
  return { group: text, update(s) { setText(text, s); } };
};
