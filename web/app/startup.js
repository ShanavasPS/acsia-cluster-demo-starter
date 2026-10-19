// The startup sequence (F-11): all telltales on for the bulb check while the needles sweep to
// full scale and back; then live. One instance per mount; the timing is in config.startup.
"use strict";
window.Cluster = window.Cluster || {};
Cluster.Startup = class Startup {
  constructor({ clock = Cluster.realClock } = {}) {
    this.clock = clock;
    this.t0 = clock.now();
  }

  // { live, telltalesOn, needle }: needle is the sweep position 0..1, null once live.
  state() {
    const s = Cluster.config.startup;
    const t = this.clock.now() - this.t0;
    if (t >= s.liveAtMs) return { live: true, telltalesOn: false, needle: null };
    let needle;
    if (t < s.sweepUpMs) needle = t / s.sweepUpMs;
    else if (t < s.holdUntilMs) needle = 1;
    else if (t < s.downUntilMs) needle = 1 - (t - s.holdUntilMs) / (s.downUntilMs - s.holdUntilMs);
    else needle = 0;
    return { live: false, telltalesOn: t < s.telltalesMs, needle };
  }
};
