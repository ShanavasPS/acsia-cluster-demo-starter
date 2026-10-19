// P R N D in the open bottom of the speed dial, the active gear highlighted. When no letter is
// active a note under them says why: "–" unknown, "--" timed out, "" during startup.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.createGear = function (parent) {
  const { el, set, setText } = Cluster.svg;
  const cfg = Cluster.config, gc = cfg.gear, c = cfg.colors;
  const g = el("g", { "data-role": "gear" }, parent);
  const letters = {};
  const n = gc.letters.length;
  gc.letters.forEach((letter, i) => {
    const x = gc.cx + (i - (n - 1) / 2) * gc.spacing;
    const t = el("text", { x, y: gc.y, "text-anchor": "middle", "font-size": gc.size, "data-gear": letter,
      "data-active": "false", fill: c.gearInactive, "font-weight": gc.inactiveWeight }, g);
    t.textContent = letter;
    letters[letter] = t;
  });
  const note = el("text", { x: gc.cx, y: gc.y + gc.noteDy, "text-anchor": "middle", "font-size": gc.noteSize,
    fill: c.gearInactive, "data-role": "gear-text" }, g);

  return {
    group: g,
    // gear: a letter, "–", "--" or "" (startup)
    update(gear) {
      for (const letter of gc.letters) {
        const active = letter === gear;
        set(letters[letter], "data-active", active);
        set(letters[letter], "fill", active ? c.gearActive : c.gearInactive);
        set(letters[letter], "font-weight", active ? gc.activeWeight : gc.inactiveWeight);
      }
      setText(note, gc.letters.includes(gear) ? "" : gear);
    },
  };
};
