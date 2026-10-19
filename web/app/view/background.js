// The window's background: a radial glow, and a fade to black over the bottom edge.
// idPrefix keeps this mount's gradient ids apart from another mount's in the same document.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.createBackground = function (parent, defs, idPrefix) {
  const { el, radialGradient, linearGradient } = Cluster.svg;
  const cfg = Cluster.config, c = cfg.colors, b = cfg.background;
  const glow = idPrefix + "bg-glow", fade = idPrefix + "bg-fade";
  radialGradient(defs, glow, [["0", c.bgCenter, "1"], ["1", c.bgEdge, "1"]], { cx: b.glowCx, cy: b.glowCy, r: b.glowR });
  linearGradient(defs, fade, [["0", c.bgBottom, "0"], ["1", c.bgBottom, "1"]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  const g = el("g", { "data-role": "background" }, parent);
  el("rect", { x: 0, y: 0, width: cfg.width, height: cfg.height, fill: `url(#${glow})` }, g);
  el("rect", { x: 0, y: cfg.height - b.bottomFade, width: cfg.width, height: b.bottomFade, fill: `url(#${fade})` }, g);
  return { group: g };
};
