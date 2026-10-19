// The five telltales in a row: low fuel, engine check, battery, seatbelt, parking brake.
// Each is a group with its icon; the group's fill is the state colour.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.createTelltales = function (parent) {
  const { el, set } = Cluster.svg;
  const cfg = Cluster.config, t = cfg.telltales, c = cfg.colors;

  // Plain flat shapes like the design's: a pump with a notch, an engine block, a battery, a head
  // over a belt, a ring. Drawn in an ICON_BOX square and scaled to config.telltales.iconSize.
  const ICON_BOX = 28;
  const ICONS = {
    low_fuel: "M4 3h14v22H4zM20 9h4v14h-4z",
    engine_check: "M2 11h5V8h8v3h5l3 3h3v8H2z",
    battery: "M4 7h20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z",
    seatbelt: "M14 1a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM9 12h10l3 15H6z",
    parking_brake: "M14 2a12 12 0 1 1 0 24 12 12 0 0 1 0-24zm0 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  };

  const g = el("g", { "data-role": "telltales" }, parent);
  const groups = {};
  const scale = t.iconSize / ICON_BOX;
  t.order.forEach((name, i) => {
    if (!ICONS[name]) throw new Error("No icon for telltale " + name);
    const x = t.firstX + i * t.spacing - t.iconSize / 2, y = t.y - t.iconSize / 2;
    const tg = el("g", { "data-telltale": name, "data-state": "off", fill: c.telltaleOff, "fill-rule": "evenodd",
      transform: `translate(${x} ${y}) scale(${scale})` }, g);
    el("path", { d: ICONS[name] }, tg);
    groups[name] = tg;
  });

  const colorOf = { off: c.telltaleOff, amber: c.amber, red: c.red };
  return {
    group: g,
    // states: name → "off" | "amber" | "red"
    update(states) {
      for (const name of t.order) {
        const s = states[name] || "off";
        set(groups[name], "data-state", s);
        set(groups[name], "fill", colorOf[s]);
      }
    },
  };
};
